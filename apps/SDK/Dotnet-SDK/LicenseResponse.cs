using System.Text.Json.Serialization;

public class LicenseResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("status")]

    public int? Status { get; set; }

    [JsonPropertyName("valid")]

    public bool? Valid { get; set; }

    [JsonPropertyName("duration")]

    public int? Duration { get; set; }

    [JsonPropertyName("activatedAt")]
    public DateTime? ActivatedAt { get; set; } // map JSON "activatedAt" ? C# ExpiresAt

    [JsonPropertyName("expiresAt")]

    public DateTime? ExpiresAt { get; set; } // map JSON "expiresAt" ? C# ActivatedAtExpiresAt

}
