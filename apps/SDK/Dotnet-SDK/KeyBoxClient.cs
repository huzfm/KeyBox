using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;

namespace KeyboxSdk;

public class LicenseAlreadyActivatedException : Exception
{
    public string Code => "LICENSE_ALREADY_ACTIVATED";

    public LicenseAlreadyActivatedException(string message) : base(message) { }
}

public static class KeyboxClient
{
    private static readonly HttpClient _http = new();

    private static System.Threading.Timer? _timer;
    private static readonly object _stateLock = new();
    private static string _lastState = LicenseState.Unknown;
    private static bool _running = false;
    private static string? _instanceId; // populated from disk after activation

    // Fixed validation interval (15 minutes)
    private const int VALIDATION_INTERVAL_SECONDS = 900;

    // ---------------- LICENSE STATE ----------------
    public static class LicenseState
    {
        public const string Valid = "valid";
        public const string Expired = "expired";
        public const string Revoked = "revoked";
        public const string Invalid = "invalid";
        public const string Unknown = "unknown";
    }

    private static readonly HashSet<string> _inactiveStates = new()
    {
        LicenseState.Expired,
        LicenseState.Revoked,
        LicenseState.Invalid,
    };

    // Paths that should never be blocked by the license guard.
    public static readonly string[] DefaultBypassPaths = { "/health", "/license/status" };

    public static string GetLicenseState()
    {
        lock (_stateLock) return _lastState;
    }

    public static void SetLicenseState(string state)
    {
        var allowed = new[]
        {
            LicenseState.Valid,
            LicenseState.Expired,
            LicenseState.Revoked,
            LicenseState.Invalid,
            LicenseState.Unknown,
        };
        if (Array.IndexOf(allowed, state) < 0)
        {
            Log("WARN", "Ignoring invalid license state", new { state, allowed });
            return;
        }
        lock (_stateLock) _lastState = state;
    }

    // ---------------- INSTANCE ID ----------------
    // Read the on-disk id if it exists. We deliberately do NOT generate
    // + persist on the first call — the id is only written to disk after
    // the server confirms activation.
    private static string? ReadStoredInstanceId()
    {
        var filePath = Path.Combine(AppContext.BaseDirectory, ".instance-id");
        if (!File.Exists(filePath)) return null;
        try
        {
            var content = File.ReadAllText(filePath).Trim();
            return string.IsNullOrEmpty(content) ? null : content;
        }
        catch
        {
            return null;
        }
    }

    // Persist the given id. Uses FileMode.CreateNew so a concurrent
    // process can't clobber its own id with ours.
    private static void PersistInstanceId(string value)
    {
        var filePath = Path.Combine(AppContext.BaseDirectory, ".instance-id");
        try
        {
            using (var fs = new FileStream(filePath, FileMode.CreateNew, FileAccess.Write))
            using (var sw = new StreamWriter(fs))
            {
                sw.Write(value);
            }
        }
        catch (IOException)
        {
            // Someone (another instance, or a previous successful run) already
            // wrote a file. Leave it as-is.
        }
        catch (Exception ex)
        {
            // Other I/O error — re-read to confirm what's on disk.
            var existing = ReadStoredInstanceId();
            if (existing != value)
            {
                Log("WARN", "Could not persist .instance-id; keeping existing value", new
                {
                    path = filePath,
                    error = ex.Message,
                });
            }
        }
    }

    private static string GetCandidateInstanceId()
    {
        _instanceId ??= ReadStoredInstanceId();
        if (_instanceId != null) return _instanceId;
        return Guid.NewGuid().ToString("D");
    }

    private static void CommitInstanceId(string value)
    {
        if (ReadStoredInstanceId() == null)
        {
            PersistInstanceId(value);
        }
        _instanceId = value;
    }

    // ---------------- LOG ----------------
    private static void Log(string level, string message, object? meta = null)
    {
        var time = DateTime.UtcNow.ToString("O");
        Console.WriteLine($"[{time}] [KEYBOX] [{level}] {message} {JsonSerializer.Serialize(meta)}");
    }

    // ---------------- MODELS ----------------
    public class LicenseResponse
    {
        public bool Success { get; set; }
        public bool Valid { get; set; }
        public string? Status { get; set; }
        public string? ExpiresAt { get; set; }
        public string? Message { get; set; }
    }

    public class LicenseStatusResult
    {
        public string Status { get; set; } = "unknown";
        public bool Active { get; set; }
        public LicenseResponse? Data { get; set; }
    }

    // ---------------- ACTIVATE ----------------
    public static async Task<LicenseResponse> ActivateLicenseAsync(
        string productName,
        string key,
        string apiUrl = "https://api-keybox.vercel.app",
        string endpoint = "/validate/activate")
    {
        if (string.IsNullOrWhiteSpace(productName) || string.IsNullOrWhiteSpace(key))
            throw new ArgumentException("productName and key are required");

        Log("INFO", "Activating license", new { productName });

        var instanceId = GetCandidateInstanceId();
        var payload = JsonSerializer.Serialize(new { key, productName, instanceId });
        var content = new StringContent(payload, Encoding.UTF8, "application/json");

        var response = await _http.PostAsync(apiUrl + endpoint, content);
        var json = await response.Content.ReadAsStringAsync();

        var data = JsonSerializer.Deserialize<LicenseResponse>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;

        if (!response.IsSuccessStatusCode || !data.Success)
        {
            var message = data.Message ?? "License activation failed";

            // Distinguish "bound to a different instance" from generic failure
            // so the consuming app can show a clearer message.
            if ((int)response.StatusCode == 403 &&
                message.Contains("another instance", StringComparison.OrdinalIgnoreCase))
            {
                throw new LicenseAlreadyActivatedException(message);
            }

            throw new Exception(message);
        }

        // Server accepted this (machineId, instanceId) pair. Safe to commit
        // the id to disk now — only on a real success do we make it sticky.
        CommitInstanceId(instanceId);

        Log("INFO", "License activated", new
        {
            data.Status,
            data.ExpiresAt
        });

        return data;
    }

    // ---------------- STATUS CHECK ----------------
    // Read-only check: ask the server whether the license is already
    // activated for the (machineId, instanceId) we'd be sending.
    // Returns a LicenseStatusResult with `Active = true` ONLY when the
    // server says `Valid = true` AND Status == "active" for the
    // stored instance id. Callers use this to decide whether
    // activation is actually needed on cold start.
    public static async Task<LicenseStatusResult> CheckLicenseStatusAsync(
        string productName,
        string key,
        string apiUrl = "https://api-keybox.vercel.app",
        string endpoint = "/validate")
    {
        if (string.IsNullOrWhiteSpace(productName) || string.IsNullOrWhiteSpace(key))
            throw new ArgumentException("productName and key are required");

        var storedId = ReadStoredInstanceId();
        if (storedId != null) _instanceId = storedId;

        // No .instance-id on disk → never activated from this app, so
        // there's nothing the server can confirm. Caller should activate.
        if (string.IsNullOrEmpty(_instanceId))
        {
            return new LicenseStatusResult
            {
                Status = "not_activated",
                Active = false,
                Data = null,
            };
        }

        Log("INFO", "Checking license status", new { productName });

        var payload = JsonSerializer.Serialize(new { key, productName, instanceId = _instanceId });
        var content = new StringContent(payload, Encoding.UTF8, "application/json");

        var response = await _http.PostAsync(apiUrl + endpoint, content);
        var json = await response.Content.ReadAsStringAsync();

        var data = JsonSerializer.Deserialize<LicenseResponse>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        var statusLower = (data?.Status ?? "unknown").ToLowerInvariant();
        var isActive = data?.Valid == true && statusLower == "active";

        return new LicenseStatusResult
        {
            Status = statusLower,
            Active = isActive,
            Data = data,
        };
    }

    // ---------------- DAEMON ----------------
    public static async Task StartLicenseDaemonAsync(
        string productName,
        string key,
        string apiUrl = "https://api-keybox.vercel.app",
        string endpoint = "/validate",
        Func<LicenseResponse, Task>? onStart = null,
        Func<LicenseResponse, Task>? onStop = null,
        Func<LicenseResponse, Task>? onRecover = null)
    {
        // Daemon is read-only: never generate a new id here. If none is on
        // disk and none was bound by an earlier activation, every /validate
        // call would 400 (server requires instanceId) — that's the right
        // signal: the user must run activation first.
        var storedId = ReadStoredInstanceId();
        if (storedId != null) _instanceId = storedId;

        async Task ValidateOnce()
        {
            if (_running) return;
            _running = true;

            Log("INFO", "Validating license", new { productName });

            if (string.IsNullOrEmpty(_instanceId))
            {
                Log("WARN", "No .instance-id on disk — run activation first");
                return;
            }

            try
            {
                var payload = JsonSerializer.Serialize(new { key, productName, instanceId = _instanceId });
                var content = new StringContent(payload, Encoding.UTF8, "application/json");

                var response = await _http.PostAsync(apiUrl + endpoint, content);
                var json = await response.Content.ReadAsStringAsync();

                var data = JsonSerializer.Deserialize<LicenseResponse>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;

                var statusLower = (data.Status ?? "unknown").ToLowerInvariant();

                // Translate server status into our internal LicenseState.
                // We preserve the raw distinction (expired vs revoked vs
                // invalid) so the guard middleware can return the right
                // one in the 402 response body.
                string nextState;
                if (data.Valid) nextState = LicenseState.Valid;
                else if (_inactiveStates.Contains(statusLower)) nextState = statusLower;
                else nextState = LicenseState.Unknown;

                string previousState;
                lock (_stateLock) { previousState = _lastState; }

                if (nextState != previousState)
                {
                    if (nextState == LicenseState.Valid)
                    {
                        Log("INFO", "License state changed to VALID — requests will be accepted",
                            new { from = previousState, to = nextState });
                    }
                    else if (_inactiveStates.Contains(nextState))
                    {
                        Log("ERROR", $"License state changed to {nextState.ToUpperInvariant()} — requests will be rejected with 402",
                            new { from = previousState, to = nextState, serverMessage = data.Message });
                    }
                    else
                    {
                        Log("WARN", "License state changed to UNKNOWN",
                            new { from = previousState, to = nextState });
                    }

                    lock (_stateLock) { _lastState = nextState; }

                    if (_inactiveStates.Contains(nextState) && !_inactiveStates.Contains(previousState))
                    {
                        if (onStop != null) await onStop(data);
                    }
                    else if (nextState == LicenseState.Valid && _inactiveStates.Contains(previousState))
                    {
                        if (onRecover != null) await onRecover(data);
                    }
                    else if (nextState == LicenseState.Valid)
                    {
                        if (onStart != null) await onStart(data);
                    }
                }
            }
            catch (Exception ex)
            {
                Log("ERROR", "License validation error", new { ex.Message });

                bool shouldFire;
                lock (_stateLock)
                {
                    shouldFire = _lastState != LicenseState.Invalid;
                    if (shouldFire) _lastState = LicenseState.Invalid;
                }

                if (shouldFire && onStop != null)
                {
                    await onStop(new LicenseResponse
                    {
                        Valid = false,
                        Status = "error",
                        Message = ex.Message
                    });
                }
            }
            finally
            {
                _running = false;
            }
        }

        await ValidateOnce();

        _timer = new System.Threading.Timer(async _ =>
        {
            try { await ValidateOnce(); }
            catch { }
        },
        null,
        TimeSpan.FromSeconds(VALIDATION_INTERVAL_SECONDS),
        TimeSpan.FromSeconds(VALIDATION_INTERVAL_SECONDS));

        Log("INFO", "License daemon started", new { intervalSeconds = VALIDATION_INTERVAL_SECONDS });
    }

    // ---------------- STOP ----------------
    public static void StopLicenseDaemon()
    {
        _timer?.Change(Timeout.Infinite, Timeout.Infinite);
        _timer?.Dispose();
        _timer = null;
        SetLicenseState(LicenseState.Unknown);
        Log("INFO", "License daemon stopped");
    }

    // ---------------- LICENSE GUARD MIDDLEWARE ----------------
    public static IApplicationBuilder UseKeyboxGuard(this IApplicationBuilder app, params string[] bypassPaths)
    {
        var allowed = new HashSet<string>(DefaultBypassPaths);
        if (bypassPaths != null)
        {
            foreach (var p in bypassPaths) allowed.Add(p);
        }

        return app.Use(async (context, next) =>
        {
            var state = GetLicenseState();
            if (state == LicenseState.Valid || state == LicenseState.Unknown)
            {
                // UNKNOWN = we haven't heard from the server yet. Don't
                // block — the daemon will tighten this on its first tick.
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
            var payload = JsonSerializer.Serialize(new
            {
                error = "LICENSE_INACTIVE",
                state,
                message = "Please pay your developer",
                renewContact = "support@keybox.dev",
            });
            await context.Response.WriteAsync(payload);
        });
    }

    // Like UseKeyboxGuard, but splices the resulting middleware into
    // the very front of the pipeline. This matters because ASP.NET
    // Core runs middleware in registration order: if the customer has
    // already mapped their endpoints before calling RunProtectedAsync,
    // a plain `UseKeyboxGuard` would be appended AFTER them, and the
    // endpoints would already have responded with 200 before our guard
    // ever ran — the exact "license revoked but API still accepts
    // requests" failure mode this whole change is fixing.
    //
    // We do this by reflecting into ApplicationBuilder's internal
    // `_components` list. This is the same pattern used by libraries
    // like Serilog and HealthChecks for the same reason. If the
    // internal layout ever changes, we fall back to the plain
    // UseKeyboxGuard and log a warning.
    public static IApplicationBuilder UseKeyboxGuardAtStart(this IApplicationBuilder app, params string[] bypassPaths)
    {
        // First, register the guard normally so the IApplicationBuilder
        // knows about it (some setups track state on the builder).
        var registered = UseKeyboxGuard(app, bypassPaths);

        try
        {
            var componentsField = typeof(IApplicationBuilder).Assembly
                .GetType("Microsoft.AspNetCore.Builder.ApplicationBuilder")
                ?.GetField("_components", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            if (componentsField == null)
            {
                Log("WARN", "Could not promote license guard to front of pipeline — ApplicationBuilder._components not found");
                return registered;
            }
            var components = componentsField.GetValue(registered) as System.Collections.IList;
            if (components == null || components.Count < 2)
            {
                return registered;
            }
            // Last component is the one we just added. Move it to index 0.
            var lastIdx = components.Count - 1;
            var guardComponent = components[lastIdx];
            components.RemoveAt(lastIdx);
            components.Insert(0, guardComponent);
            Log("INFO", "Promoted license guard to start of pipeline", new { from = lastIdx, to = 0, totalComponents = components.Count });
        }
        catch (Exception ex)
        {
            Log("WARN", "Failed to promote license guard to front of pipeline", new { error = ex.Message });
        }

        return registered;
    }

    private static bool MatchesBypass(string path, HashSet<string> bypass)
    {
        if (string.IsNullOrEmpty(path)) return false;
        foreach (var pattern in bypass)
        {
            if (pattern == path) return true;
            // Prefix match: "/license" matches "/license/renew", etc.
            if (pattern.EndsWith("/") && path.StartsWith(pattern, StringComparison.Ordinal)) return true;
            if (!pattern.EndsWith("/") && path.StartsWith(pattern + "/", StringComparison.Ordinal)) return true;
        }
        return false;
    }

    // ---------------- PROTECT APP ----------------
    public static async Task RunProtectedAsync(
        this WebApplication app,
        string productName,
        string key,
        string apiUrl = "https://api-keybox.vercel.app",
        params string[] bypassPaths)
    {
        try
        {
            // Avoid duplicate activation on cold start: if the server
            // already confirms this (machineId, instanceId) is active,
            // skip /validate/activate and go straight to the daemon.
            var status = await CheckLicenseStatusAsync(productName, key, apiUrl);
            if (status.Active)
            {
                Log("INFO", "License already active on this instance — skipping activation", new { status = status.Status });
            }
            else
            {
                Log("INFO", "License not active — activating", new { status = status.Status });
                await ActivateLicenseAsync(productName, key, apiUrl);
            }
        }
        catch (LicenseAlreadyActivatedException ex)
        {
            Log("ERROR", "License is already activated on another device. Requests will be rejected with 402 until this is resolved.", new { error = ex.Message });
            // Do NOT throw — the guard is already wired up; renewals
            // observed by the daemon will resume serving requests.
        }
        catch (Exception ex)
        {
            Log("ERROR", "Failed to activate license. Starting the app anyway — requests will be rejected with 402 until activation succeeds.", new { error = ex.Message });
            // Do NOT throw. The guard is wired up; the daemon retries
            // every 15 minutes, and the renewal recovery path means
            // the customer doesn't need to restart after paying.
        }

        // Register the guard AT THE START of the pipeline so customer
        // endpoints that were mapped before this call are still gated.
        // UseKeyboxGuardAtStart splices into the front of the pipeline
        // via reflection — if the customer has already done
        // app.MapGet("/api/foo", ...), our guard still runs first.
        // No process kill on inactive state — when the license is
        // renewed, the next tick flips state back to VALID and the
        // next request succeeds.
        app.UseKeyboxGuardAtStart(bypassPaths);

        await StartLicenseDaemonAsync(
            productName,
            key,
            apiUrl,
            endpoint: "/validate",
            onStart: (data) => Task.CompletedTask,
            onStop: (data) =>
            {
                Log("ERROR", $"License {data.Status?.ToUpperInvariant() ?? "INVALID"} — requests will be rejected with 402", data);
                return Task.CompletedTask;
            },
            onRecover: (data) =>
            {
                Log("INFO", "License recovered — requests resumed", data);
                return Task.CompletedTask;
            }
        );

        Log("INFO", "License valid, starting app...");
        await app.RunAsync();
    }
}
