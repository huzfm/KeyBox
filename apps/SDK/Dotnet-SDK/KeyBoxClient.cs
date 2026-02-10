using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;

namespace KeyboxSdk;

public static class KeyboxClient
{
    private static readonly HttpClient _http = new();

    private static System.Threading.Timer? _timer;
    private static string _lastState = "unknown";
    private static bool _running = false;

    // Fixed validation interval (15 minutes)
    private const int VALIDATION_INTERVAL_SECONDS = 900;

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

        var payload = JsonSerializer.Serialize(new { key, productName });
        var content = new StringContent(payload, Encoding.UTF8, "application/json");

        var response = await _http.PostAsync(apiUrl + endpoint, content);
        var json = await response.Content.ReadAsStringAsync();

        var data = JsonSerializer.Deserialize<LicenseResponse>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;

        if (!response.IsSuccessStatusCode || !data.Success)
            throw new Exception(data.Message ?? "License activation failed");

        Log("INFO", "License activated", new
        {
            data.Status,
            data.ExpiresAt
        });

        return data;
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
        async Task ValidateOnce()
        {
            if (_running) return;
            _running = true;

            Log("INFO", "Validating license", new { productName });

            try
            {
                var payload = JsonSerializer.Serialize(new { key, productName });
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
            await ActivateLicenseAsync(productName, key, apiUrl);
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
