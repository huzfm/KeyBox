using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace KeyboxSdk;

/// <summary>
/// Accepts both shapes the server emits for date fields: epoch milliseconds
/// (Date.getTime() — returned by /validate) and ISO 8601 strings (a serialized
/// Date — returned by /validate/activate). Without this, System.Text.Json
/// throws on every successful validation response.
/// </summary>
internal class FlexibleDateTimeConverter : JsonConverter<DateTime?>
{
    public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        switch (reader.TokenType)
        {
            case JsonTokenType.Null:
                return null;

            case JsonTokenType.Number:
                return reader.TryGetInt64(out var ms)
                    ? DateTimeOffset.FromUnixTimeMilliseconds(ms).UtcDateTime
                    : null;

            case JsonTokenType.String:
                return DateTime.TryParse(
                    reader.GetString(),
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal,
                    out var parsed)
                        ? parsed
                        : null;

            default:
                reader.Skip();
                return null;
        }
    }

    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        if (value is null) writer.WriteNullValue();
        else writer.WriteStringValue(value.Value);
    }
}

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

    /// <summary>Server sends this as a human string, e.g. "3 months".</summary>
    [JsonPropertyName("duration")]
    public string? Duration { get; set; }

    [JsonPropertyName("activatedAt")]
    [JsonConverter(typeof(FlexibleDateTimeConverter))]
    public DateTime? ActivatedAt { get; set; }

    [JsonPropertyName("expiresAt")]
    [JsonConverter(typeof(FlexibleDateTimeConverter))]
    public DateTime? ExpiresAt { get; set; }
}
