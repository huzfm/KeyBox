using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.NetworkInformation;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace KeyboxSdk;

/// <summary>
/// Thrown by ActivateLicenseAsync when the server responds with HTTP 403
/// indicating the key is already bound to a different machine or instance.
/// </summary>
public class LicenseAlreadyActivatedException : Exception
{
    public string Code => "LICENSE_ALREADY_ACTIVATED";
    public LicenseAlreadyActivatedException(string message) : base(message) { }
}

/// <summary>
/// Frozen string constants mirroring the server Status enum.
/// PendingValidation is the only SDK-internal state (cold-start sentinel — always blocked).
/// </summary>
public static class LicenseState
{
    public const string Pending = "PENDING";
    public const string Active = "ACTIVE";
    public const string Expired = "EXPIRED";
    public const string Revoked = "REVOKED";
    /// <summary>Set on startup before the first successful server response. Requests are BLOCKED.</summary>
    public const string PendingValidation = "pending_validation";
}

public static class KeyboxClient
{
    private static readonly HttpClient _http = new();

    private static System.Threading.Timer? _timer;
    private static readonly object _stateLock = new();
    private static string _lastState = LicenseState.PendingValidation;
    private static bool _isValidating = false;            // Bug 6: overlap guard
    private static DateTime? _lastSuccessfulValidation;   // Bug 8: offline grace tracking
    private static string? _machineId;                    // Bug 2: cached machine id
    private static string? _instanceId;

    // Bug 1: server statuses that must always map to Revoked (fail-closed).
    // Previously these fell into the "unrecognised → keep state" branch, leaving
    // an already-ACTIVE app permanently unlocked after the server denied the license.
    private static readonly HashSet<string> _hardRevokeStatuses =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "invalid", "machine_mismatch", "instance_mismatch", "unknown"
        };

    private static readonly HashSet<string> _inactiveStates = new()
    {
        LicenseState.Expired,
        LicenseState.Revoked,
        LicenseState.Pending,
    };

    public static readonly string[] DefaultBypassPaths = { "/health", "/license/status" };

    private const int DefaultIntervalSeconds = 900;
    private const int DefaultFetchTimeoutMs = 10_000;

    // ── Machine ID ───────────────────────────────────────────────────────────────
    // Bug 2: compute a stable SHA-256 hash of MachineName + first active MAC address.
    // The server uses this to bind a license to a physical machine.
    private static string GetMachineId()
    {
        if (_machineId != null) return _machineId;
        try
        {
            var mac = NetworkInterface.GetAllNetworkInterfaces()
                .Where(n => n.OperationalStatus == OperationalStatus.Up
                         && n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                .Select(n => n.GetPhysicalAddress().ToString())
                .FirstOrDefault() ?? "";
            var raw = $"{Environment.MachineName}-{mac}";
            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(raw));
            _machineId = BitConverter.ToString(bytes).Replace("-", "").ToLowerInvariant();
        }
        catch
        {
            _machineId = Guid.NewGuid().ToString("N");
        }
        return _machineId;
    }

    // ── HTTP helper ──────────────────────────────────────────────────────────────
    // Bug 6: per-request network timeout via CancellationTokenSource.
    private static async Task<HttpResponseMessage> PostWithTimeoutAsync(
        string url, object body, int timeoutMs = DefaultFetchTimeoutMs)
    {
        using var cts = new CancellationTokenSource(timeoutMs);
        var payload = JsonSerializer.Serialize(body);
        var content = new StringContent(payload, Encoding.UTF8, "application/json");
        return await _http.PostAsync(url, content, cts.Token);
    }

    // ── Logging ──────────────────────────────────────────────────────────────────
    private static void Log(string level, string message, object? meta = null)
    {
        var time = DateTime.UtcNow.ToString("O");
        Console.WriteLine(
            $"[{time}] [KEYBOX] [{level}] {message}" +
            (meta != null ? $" {JsonSerializer.Serialize(meta)}" : ""));
    }

    // ── Response model (private) ─────────────────────────────────────────────────
    private class LicenseApiResponse
    {
        public bool Success { get; set; }
        public bool? Valid { get; set; }
        public string? Status { get; set; }
        public string? Message { get; set; }
        public string? ExpiresAt { get; set; }
    }

    public class LicenseStatusResult
    {
        public string Status { get; set; } = "unknown";
        public bool Active { get; set; }
        public object? Data { get; set; }
    }

    // ── Safe callback helper ─────────────────────────────────────────────────────
    // Bug 10: callbacks are fire-and-forget; exceptions never crash the daemon.
    private static void FireCallback(Func<object?, Task>? cb, object? data)
    {
        if (cb == null) return;
        _ = Task.Run(async () =>
        {
            try { await cb(data); }
            catch (Exception ex) { Log("WARN", "License callback threw", new { error = ex.Message }); }
        });
    }

    // ── Instance ID ──────────────────────────────────────────────────────────────
    private static string? ReadStoredInstanceId()
    {
        var path = Path.Combine(AppContext.BaseDirectory, ".instance-id");
        if (!File.Exists(path)) return null;
        try
        {
            var content = File.ReadAllText(path).Trim();
            return string.IsNullOrEmpty(content) ? null : content;
        }
        catch { return null; }
    }

    private static void PersistInstanceId(string value)
    {
        var path = Path.Combine(AppContext.BaseDirectory, ".instance-id");
        try
        {
            using var fs = new FileStream(path, FileMode.CreateNew, FileAccess.Write);
            using var sw = new StreamWriter(fs);
            sw.Write(value);
        }
        catch (IOException) { /* file already exists — leave as-is */ }
        catch (Exception ex)
        {
            Log("WARN", "Could not persist .instance-id", new { path, error = ex.Message });
        }
    }

    // ── Public state accessor ────────────────────────────────────────────────────
    public static string GetLicenseState()
    {
        lock (_stateLock) return _lastState;
    }

    // Bug 12: SetLicenseState removed from public API.
    // Exposing it made license enforcement trivially bypassable.
    // State is now only mutated by validated server responses.

    // ── Activate ─────────────────────────────────────────────────────────────────
    public static async Task<LicenseStatusResult> ActivateLicenseAsync(
        string productName,
        string key,
        string apiUrl = "https://api-keybox.vercel.app",
        int fetchTimeoutMs = DefaultFetchTimeoutMs)
    {
        if (string.IsNullOrWhiteSpace(productName) || string.IsNullOrWhiteSpace(key))
            throw new ArgumentException("productName and key are required");

        _instanceId ??= ReadStoredInstanceId();
        var instanceId = _instanceId ?? Guid.NewGuid().ToString("D");

        Log("INFO", "Activating license", new { productName });

        var response = await PostWithTimeoutAsync(
            $"{apiUrl}/validate/activate",
            new { key, productName, instanceId, machineId = GetMachineId() },  // Bug 2
            fetchTimeoutMs);

        var json = await response.Content.ReadAsStringAsync();
        var data = JsonSerializer.Deserialize<LicenseApiResponse>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;

        // Bug 7: require Success == true explicitly (not just truthy)
        if (!response.IsSuccessStatusCode || data.Success != true)
        {
            var msg = data.Message ?? "License activation failed";
            if ((int)response.StatusCode == 403 &&
                msg.Contains("another", StringComparison.OrdinalIgnoreCase))
            {
                throw new LicenseAlreadyActivatedException(msg);
            }
            throw new Exception(msg);
        }

        if (ReadStoredInstanceId() == null)
            PersistInstanceId(instanceId);
        _instanceId = instanceId;

        Log("INFO", "License activated", new { data.Status, data.ExpiresAt });

        return new LicenseStatusResult
        {
            Status = (data.Status ?? "").ToUpperInvariant(),
            Active = data.Valid == true,
            Data = data,
        };
    }

    // ── Check status ─────────────────────────────────────────────────────────────
    public static async Task<LicenseStatusResult> CheckLicenseStatusAsync(
        string productName,
        string key,
        string apiUrl = "https://api-keybox.vercel.app",
        int fetchTimeoutMs = DefaultFetchTimeoutMs)
    {
        var storedId = ReadStoredInstanceId();
        if (storedId == null)
            return new LicenseStatusResult { Status = "not_activated", Active = false };

        _instanceId = storedId;
        Log("INFO", "Checking license status", new { productName });

        var response = await PostWithTimeoutAsync(
            $"{apiUrl}/validate",
            new { key, productName, instanceId = storedId, machineId = GetMachineId() },  // Bug 2
            fetchTimeoutMs);

        var json = await response.Content.ReadAsStringAsync();
        var data = JsonSerializer.Deserialize<LicenseApiResponse>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        var statusUpper = (data?.Status ?? "").ToUpperInvariant();
        var isActive = data?.Valid == true && statusUpper == "ACTIVE";

        return new LicenseStatusResult
        {
            Status = statusUpper,
            Active = isActive,
            Data = data,
        };
    }

    // ── Daemon ───────────────────────────────────────────────────────────────────
    public static async Task StartLicenseDaemonAsync(
        string productName,
        string key,
        string apiUrl = "https://api-keybox.vercel.app",
        int intervalSeconds = DefaultIntervalSeconds,
        int fetchTimeoutMs = DefaultFetchTimeoutMs,
        int? offlineGraceSeconds = null,
        Func<object?, Task>? onRevoke = null,
        Func<object?, Task>? onRecover = null)
    {
        if (intervalSeconds <= 0)
            throw new ArgumentException("intervalSeconds must be a positive integer", nameof(intervalSeconds));

        // Bug 8: offline grace defaults to max(2 × interval, 1800 s)
        var offlineGrace = TimeSpan.FromSeconds(
            offlineGraceSeconds ?? Math.Max(intervalSeconds * 2, 1800));

        async Task ValidateOnce()
        {
            // Bug 6: acquire overlap guard inside lock so the check + set is atomic.
            // Previously _running was set BEFORE the try block, so early returns
            // (no instanceId on disk) left _running = true permanently → daemon dead.
            lock (_stateLock)
            {
                if (_isValidating)
                {
                    Log("INFO", "Skipping validation tick — previous check still in progress");
                    return;
                }
                _isValidating = true;
            }

            try
            {
                // Bug 4: re-read instanceId every tick.
                // The original code captured it once at daemon startup, so a failed
                // activation left it permanently null with no retry path.
                var instanceId = ReadStoredInstanceId();

                if (instanceId == null)
                {
                    string current;
                    lock (_stateLock) current = _lastState;

                    if (current == LicenseState.PendingValidation)
                    {
                        Log("WARN", "No .instance-id on disk — retrying activation");
                        try
                        {
                            await ActivateLicenseAsync(productName, key, apiUrl, fetchTimeoutMs);
                            instanceId = ReadStoredInstanceId();
                        }
                        catch (Exception ex)
                        {
                            Log("WARN", "Activation retry failed", new { error = ex.Message });
                        }
                    }

                    if (instanceId == null)
                    {
                        Log("WARN", "No .instance-id on disk — skipping validation");
                        return;
                    }
                }

                Log("INFO", "Validating license", new { productName });

                var response = await PostWithTimeoutAsync(
                    $"{apiUrl}/validate",
                    new { key, productName, instanceId, machineId = GetMachineId() },  // Bug 2
                    fetchTimeoutMs);

                // 429 / 5xx: transient error — keep current state, do not change anything
                var httpStatus = (int)response.StatusCode;
                if (httpStatus == 429 || httpStatus >= 500)
                {
                    string current;
                    lock (_stateLock) current = _lastState;
                    Log("WARN", "Transient server response — keeping current state",
                        new { httpStatus, currentState = current });
                    return;
                }

                var json = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<LicenseApiResponse>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;

                var rawStatus = data.Status ?? "";
                var statusUpper = rawStatus.ToUpperInvariant();

                // Capture previous state BEFORE computing next (fixes the compile error
                // where previousState was referenced before its declaration)
                string previousState;
                lock (_stateLock) previousState = _lastState;

                // Bug 1: hard-fail statuses → Revoked (fail-closed)
                string nextState;
                if (_hardRevokeStatuses.Contains(rawStatus))
                {
                    nextState = LicenseState.Revoked;
                    Log("WARN", "License validation returned hard-fail status — revoking",
                        new { serverStatus = rawStatus });
                }
                else if (data.Valid == true && statusUpper == "ACTIVE")
                {
                    nextState = LicenseState.Active;
                    // Bug 8: record last successful validation time
                    lock (_stateLock) _lastSuccessfulValidation = DateTime.UtcNow;
                }
                else if (statusUpper == "REVOKED") nextState = LicenseState.Revoked;
                else if (statusUpper == "EXPIRED") nextState = LicenseState.Expired;
                else if (statusUpper == "PENDING") nextState = LicenseState.Pending;
                else
                {
                    Log("WARN", "Unrecognised license server response — keeping current state",
                        new { currentState = previousState, serverStatus = data.Status, serverValid = data.Valid });
                    return;
                }

                if (nextState == previousState) return;

                if (nextState == LicenseState.Active)
                    Log("INFO", "License state changed to ACTIVE — requests will be accepted",
                        new { from = previousState, to = nextState });
                else if (_inactiveStates.Contains(nextState))
                    Log("ERROR", $"License state changed to {nextState} — requests will be rejected with 402",
                        new { from = previousState, to = nextState, serverMessage = data.Message });
                else
                    Log("INFO", $"License state changed to {nextState}",
                        new { from = previousState, to = nextState });

                lock (_stateLock) _lastState = nextState;

                // Bug 10: safe callbacks
                if (_inactiveStates.Contains(nextState) && !_inactiveStates.Contains(previousState))
                    FireCallback(onRevoke, data);
                else if (nextState == LicenseState.Active && _inactiveStates.Contains(previousState))
                    FireCallback(onRecover, data);
            }
            catch (Exception ex)
            {
                Log("WARN", "License check failed — keeping app running", new { error = ex.Message });

                string current;
                lock (_stateLock) current = _lastState;

                if (current == LicenseState.PendingValidation)
                {
                    Log("ERROR",
                        "License daemon could not reach the server on startup — requests will be rejected with 402",
                        new { from = LicenseState.PendingValidation, to = LicenseState.Revoked });
                    lock (_stateLock) _lastState = LicenseState.Revoked;
                    // Bug 10: fire onRevoke for cold-start failures
                    FireCallback(onRevoke, new { valid = false, status = LicenseState.Revoked, message = ex.Message });
                }
                else if (current == LicenseState.Active)
                {
                    // Bug 8: bounded offline grace period
                    DateTime? lastValidated;
                    lock (_stateLock) lastValidated = _lastSuccessfulValidation;

                    if (lastValidated.HasValue)
                    {
                        var elapsed = DateTime.UtcNow - lastValidated.Value;
                        if (elapsed > offlineGrace)
                        {
                            Log("ERROR", "Offline grace period exceeded — blocking requests",
                                new { graceSeconds = (int)offlineGrace.TotalSeconds, elapsedSeconds = (int)elapsed.TotalSeconds });
                            lock (_stateLock) _lastState = LicenseState.Revoked;
                            FireCallback(onRevoke, null);
                        }
                        else
                        {
                            Log("WARN", "Network failure — within offline grace period",
                                new { elapsedSeconds = (int)elapsed.TotalSeconds, graceSeconds = (int)offlineGrace.TotalSeconds });
                        }
                    }
                }
            }
            finally
            {
                // Bug 6: always release the overlap guard, even on exception or early return
                lock (_stateLock) _isValidating = false;
            }
        }

        await ValidateOnce();

        _timer = new System.Threading.Timer(async _ =>
        {
            try { await ValidateOnce(); }
            catch { }
        },
        null,
        TimeSpan.FromSeconds(intervalSeconds),
        TimeSpan.FromSeconds(intervalSeconds));

        Log("INFO", "License daemon started", new { intervalSeconds });
    }

    public static void StopLicenseDaemon()
    {
        _timer?.Change(Timeout.Infinite, Timeout.Infinite);
        _timer?.Dispose();
        _timer = null;
        Log("INFO", "License daemon stopped");
    }

    // ── Guard middleware ─────────────────────────────────────────────────────────
    public static IApplicationBuilder UseKeyboxGuard(
        this IApplicationBuilder app, params string[] bypassPaths)
    {
        var allowed = new HashSet<string>(DefaultBypassPaths);
        foreach (var p in bypassPaths ?? Array.Empty<string>()) allowed.Add(p);

        return app.Use(async (context, next) =>
        {
            var state = GetLicenseState();
            if (state == LicenseState.Active)
            {
                await next();
                return;
            }

            var path = context.Request.Path.Value ?? string.Empty;
            if (MatchesBypass(path, allowed))
            {
                await next();
                return;
            }

            context.Response.StatusCode = StatusCodes.Status402PaymentRequired;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                error = "LICENSE_INACTIVE",
                state,
                message = "Go pay your developer",
            }));
        });
    }

    /// <summary>
    /// Like UseKeyboxGuard, but splices the middleware to the very front of the
    /// ASP.NET Core pipeline so endpoints mapped before this call are still gated.
    /// Falls back to UseKeyboxGuard if reflection into ApplicationBuilder._components fails.
    /// </summary>
    public static IApplicationBuilder UseKeyboxGuardAtStart(
        this IApplicationBuilder app, params string[] bypassPaths)
    {
        var registered = UseKeyboxGuard(app, bypassPaths);
        try
        {
            var componentsField = typeof(IApplicationBuilder).Assembly
                .GetType("Microsoft.AspNetCore.Builder.ApplicationBuilder")
                ?.GetField("_components",
                    System.Reflection.BindingFlags.NonPublic |
                    System.Reflection.BindingFlags.Instance);

            if (componentsField == null)
            {
                Log("WARN", "Could not promote license guard — ApplicationBuilder._components not found");
                return registered;
            }

            var components = componentsField.GetValue(registered) as System.Collections.IList;
            if (components == null || components.Count < 2) return registered;

            var lastIdx = components.Count - 1;
            var guardComponent = components[lastIdx];
            components.RemoveAt(lastIdx);
            components.Insert(0, guardComponent);
            Log("INFO", "Promoted license guard to start of pipeline",
                new { from = lastIdx, to = 0, totalComponents = components.Count });
        }
        catch (Exception ex)
        {
            Log("WARN", "Failed to promote license guard to front of pipeline",
                new { error = ex.Message });
        }
        return registered;
    }

    private static bool MatchesBypass(string path, HashSet<string> bypass)
    {
        if (string.IsNullOrEmpty(path)) return false;
        foreach (var pattern in bypass)
        {
            if (pattern == path) return true;
            if (pattern.EndsWith("/") && path.StartsWith(pattern, StringComparison.Ordinal)) return true;
            if (!pattern.EndsWith("/") && path.StartsWith(pattern + "/", StringComparison.Ordinal)) return true;
        }
        return false;
    }

    // ── RunProtectedAsync (recommended entry point) ──────────────────────────────
    public static async Task RunProtectedAsync(
        this WebApplication app,
        string productName,
        string key,
        string apiUrl = "https://api-keybox.vercel.app",
        int intervalSeconds = DefaultIntervalSeconds,
        int fetchTimeoutMs = DefaultFetchTimeoutMs,
        int? offlineGraceSeconds = null,
        string[]? bypassPaths = null,
        Func<object?, Task>? onRevoke = null,
        Func<object?, Task>? onRecover = null)
    {
        if (intervalSeconds <= 0)
            throw new ArgumentException("intervalSeconds must be a positive integer", nameof(intervalSeconds));

        try
        {
            var status = await CheckLicenseStatusAsync(productName, key, apiUrl, fetchTimeoutMs);
            if (status.Active)
                Log("INFO", "License already active — skipping activation", new { status = status.Status });
            else
            {
                Log("INFO", "License not active — activating", new { status = status.Status });
                await ActivateLicenseAsync(productName, key, apiUrl, fetchTimeoutMs);
            }
        }
        catch (LicenseAlreadyActivatedException ex)
        {
            Log("ERROR",
                "License is already activated on another device. Requests will be rejected with 402 until resolved.",
                new { error = ex.Message });
        }
        catch (Exception ex)
        {
            Log("ERROR",
                "Failed to activate license. Starting anyway — requests will be rejected with 402 until activation succeeds.",
                new { error = ex.Message });
        }

        app.UseKeyboxGuardAtStart(bypassPaths ?? Array.Empty<string>());

        await StartLicenseDaemonAsync(
            productName,
            key,
            apiUrl,
            intervalSeconds,
            fetchTimeoutMs,
            offlineGraceSeconds,
            onRevoke: onRevoke,
            onRecover: onRecover);

        Log("INFO", "Starting app...");
        await app.RunAsync();
    }
}
