using System;
using System.Text.Json.Serialization;

namespace KeyboxSdk;

/// <summary>
/// Shape of the JSON body returned by the KeyBox license server.
/// Used as the data payload in onRevoke / onRecover callbacks.
/// </summary>
public class LicenseResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("valid")]
    public bool? Valid { get; set; }

    /// <summary>Server license status string: ACTIVE, PENDING, EXPIRED, REVOKED, etc.</summary>
    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("duration")]
    public int? Duration { get; set; }

    [JsonPropertyName("activatedAt")]
    public DateTime? ActivatedAt { get; set; }

    [JsonPropertyName("expiresAt")]
    public DateTime? ExpiresAt { get; set; }
}
