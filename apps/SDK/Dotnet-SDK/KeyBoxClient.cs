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
    private static string _lastState = "unknown";
    private static bool _running = false;
    private static string? _instanceId; // populated from disk after activation

    // Fixed validation interval (15 minutes)
    private const int VALIDATION_INTERVAL_SECONDS = 900;

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
        Func<LicenseResponse, Task>? onStop = null)
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

                var currentState = data.Valid ? "valid" : "invalid";

                if (currentState != _lastState)
                {
                    Log("INFO", "License state changed", new
                    {
                        from = _lastState,
                        to = currentState,
                        data.Status
                    });

                    _lastState = currentState;

                    if (currentState == "valid")
                    {
                        if (onStart != null) await onStart(data);
                    }
                    else
                    {
                        if (onStop != null) await onStop(data);
                    }
                }
            }
            catch (Exception ex)
            {
                Log("ERROR", "License validation error", new { ex.Message });

                if (_lastState != "invalid")
                {
                    _lastState = "invalid";
                    if (onStop != null)
                    {
                        await onStop(new LicenseResponse
                        {
                            Valid = false,
                            Status = "error",
                            Message = ex.Message
                        });
                    }
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
        _lastState = "unknown";
        Log("INFO", "License daemon stopped");
    }

    // ---------------- PROTECT APP ----------------
    public static async Task RunProtectedAsync(
        this WebApplication app,
        string productName,
        string key,
        string apiUrl = "https://api-keybox.vercel.app")
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
            Log("ERROR", "License is already activated on another device. App will not start.", new { error = ex.Message });
            Environment.Exit(1);
            return;
        }
        catch (Exception ex)
        {
            Log("ERROR", "Failed to activate license. App will not start.", new { error = ex.Message });
            Environment.Exit(1);
            return;
        }

        await StartLicenseDaemonAsync(
            productName,
            key,
            apiUrl,
            endpoint: "/validate",
            onStart: (data) => Task.CompletedTask,
            onStop: async (data) =>
            {
                Log("ERROR", "License invalid -> shutting down app", data);
                await app.StopAsync();
                Environment.Exit(1);
            }
        );

        Log("INFO", "License valid, starting app...");
        await app.RunAsync();
    }
}
