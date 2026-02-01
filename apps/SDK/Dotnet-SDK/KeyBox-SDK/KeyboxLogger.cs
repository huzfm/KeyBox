using System.Text.Json;

namespace KeyboxSdk;

public static class KeyboxLogger
{
    public static void Log(string level, string message, object? meta = null)
    {
        var time = DateTime.UtcNow.ToString("O");

        Console.WriteLine(
            $"[{time}] [KEYBOX] [{level}] {message} " +
            (meta != null ? JsonSerializer.Serialize(meta) : "")
        );
    }
}
