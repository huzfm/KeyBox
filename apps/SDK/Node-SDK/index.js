using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;

namespace KeyboxSdk;

public static class KeyboxClient {
    private static readonly HttpClient _http = new ();

    private static Timer?_intervalTimer;
    private static string _lastState = "unknown";
    private static bool _running = false;

    // ---------------- LOG ----------------
    private static void Log(string level, string message, object? meta = null) {
        var time = DateTime.UtcNow.ToString("O");
        Console.WriteLine(
            $"[{time}] [KEYBOX] [{level}] {message} " +
        (meta != null ? JsonSerializer.Serialize(meta) : "")
        );
    }

    // ---------------- MODEL ----------------
    public class LicenseResponse
    {
        public bool Success { get; set; }
        public bool Valid { get; set; }
        public string ? Status { get; set; }
        public string ? ExpiresAt { get; set; }
        public string ? Message { get; set; }
}

    // ---------------- ACTIVATE ----------------
    public static async Task < LicenseResponse > ActivateLicenseAsync(
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

    var data = JsonSerializer.Deserialize < LicenseResponse > (json,
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
    int intervalSeconds = 86400,
    Action < LicenseResponse >? onStart = null,
    Action < LicenseResponse >? onStop = null)
{
    if (string.IsNullOrWhiteSpace(productName) || string.IsNullOrWhiteSpace(key))
        throw new ArgumentException("productName and key are required");

        async Task ValidateOnce()
    {
        if (_running) return;
        _running = true;

        Log("INFO", "Validating license", new { productName });

        try {
            var payload = JsonSerializer.Serialize(new { key, productName });
            var content = new StringContent(payload, Encoding.UTF8, "application/json");

            var response = await _http.PostAsync(apiUrl + endpoint, content);
            var json = await response.Content.ReadAsStringAsync();

            var data = JsonSerializer.Deserialize < LicenseResponse > (json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;

            var currentState = data.Valid ? "valid" : "invalid";

            if (currentState != _lastState) {
                Log("INFO", "License state changed", new
                    {
                        from = _lastState,
                        to = currentState,
                        data.Status
                    });

                _lastState = currentState;

                if (currentState == "valid") onStart?.Invoke(data);
                else onStop?.Invoke(data);
            }
        }
        catch (Exception ex)
        {
            Log("ERROR", "License validation error", new { error = ex.Message });

            if (_lastState != "invalid") {
                _lastState = "invalid";
                onStop?.Invoke(new LicenseResponse
                    {
                        Valid = false,
                        Status = "error",
                        Message = ex.Message
                    });
            }
        }
            finally {
            _running = false;
        }
    }

    // first run
    await ValidateOnce();

    // setInterval equivalent
    _intervalTimer = new Timer(async _ => {
        try { await ValidateOnce(); }
        catch { }
    },
        null,
        TimeSpan.FromSeconds(intervalSeconds),
        TimeSpan.FromSeconds(intervalSeconds));

    Log("INFO", "License daemon started", new { intervalSeconds });
}

    // ---------------- STOP ----------------
    public static void StopLicenseDaemon()
{
    if (_intervalTimer != null) {
        _intervalTimer.Change(Timeout.Infinite, Timeout.Infinite);
        _intervalTimer.Dispose();
        _intervalTimer = null;
        _lastState = "unknown";
        Log("INFO", "License daemon stopped");
    }
}
}
