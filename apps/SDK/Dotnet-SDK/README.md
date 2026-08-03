# KeyBox SDK — .NET

Official .NET SDK for **KeyBox**. Add license activation, periodic online validation, and ASP.NET Core request gating to any .NET application in a single method call.

---

## Requirements

- .NET 8 or later
- ASP.NET Core (peer dependency)

---

## Installation

```bash
dotnet add package KeyboxSdk
```

---

## Quick Start

```csharp
using KeyboxSdk;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "Hello from a licensed app");

await app.RunProtectedAsync(
    productName: "MyApp",
    key: Environment.GetEnvironmentVariable("KEYBOX_LICENSE_KEY")!
);
```

That's it. The SDK will:
1. Activate the license on first run and persist the instance ID to `.instance-id`
2. Register an ASP.NET Core middleware that returns **HTTP 402** on every request while the license is inactive
3. Start a background timer that revalidates every **15 minutes** and automatically picks up renewals

---

## How It Works

```
App starts
    │
    ├─ Is .instance-id on disk?
    │       Yes → POST /validate          → already active? skip activation
    │       No  → POST /validate/activate → write UUID to .instance-id
    │
    ├─ app.RunAsync()
    │
    └─ Daemon timer starts (every 15 min)
            │
            ├─ POST /validate
            ├─ Response ACTIVE   → allow all requests
            ├─ Response REVOKED / EXPIRED / PENDING → HTTP 402 on all requests
            ├─ Response 429 / 5xx → keep current state (transient)
            └─ Network failure
                    ├─ Within offline grace period → keep ACTIVE
                    └─ Grace exceeded             → HTTP 402
```

---

## License States

| State | Meaning | Requests |
|-------|---------|----------|
| `pending_validation` | Cold-start sentinel — server not yet contacted | Blocked (402) |
| `ACTIVE` | License confirmed valid | Allowed |
| `PENDING` | Key exists but was never activated | Blocked (402) |
| `EXPIRED` | License period ended | Blocked (402) |
| `REVOKED` | Explicitly disabled by the developer | Blocked (402) |

---

## API Reference

### `RunProtectedAsync(options)` *(recommended entry point)*

Extension method on `WebApplication`. Registers the license guard, activates on first run, starts the validation daemon, and calls `app.RunAsync()`.

```csharp
await app.RunProtectedAsync(
    productName: "MyApp",                     // Product identifier shown in KeyBox (required)
    key: Environment.GetEnvironmentVariable("KEYBOX_LICENSE_KEY")!,  // License key (required)
    apiUrl: "https://api-keybox.vercel.app",   // KeyBox server URL (default)
    intervalSeconds: 900,                     // Daemon interval, default 900 (15 min)
    fetchTimeoutMs: 10_000,                   // Per-request network timeout, default 10 000 ms
    offlineGraceSeconds: null,                // How long to stay ACTIVE offline, default max(2×interval, 1800)
    bypassPaths: new[] { "/webhook" },        // Paths that skip the 402 guard
    onRevoke: async data => { ... },          // Called when license becomes inactive
    onRecover: async data => { ... }          // Called when license becomes active again
);
```

---

### `UseKeyboxGuard(bypassPaths)` — ASP.NET Core middleware

Extension method on `IApplicationBuilder`. Returns a middleware that blocks requests when the license is not ACTIVE.
Use this when you need the guard on specific pipelines rather than the whole app.

```csharp
app.UseKeyboxGuard("/api/health", "/webhook");
```

Paths use **prefix matching**: `"/admin"` also bypasses `"/admin/users"`.

The following paths are **always** bypassed regardless of state:
- `/health`
- `/license/status`

---

### `StartLicenseDaemonAsync(options)` / `StopLicenseDaemon()`

Start and stop the background validation daemon manually (if you are not using `RunProtectedAsync`).

```csharp
using KeyboxSdk;

app.UseKeyboxGuard();

await KeyboxClient.StartLicenseDaemonAsync(
    productName: "MyApp",
    key: Environment.GetEnvironmentVariable("KEYBOX_LICENSE_KEY")!,
    onRevoke: async data => Console.WriteLine("License revoked!"),
    onRecover: async data => Console.WriteLine("License recovered!")
);

// Later:
KeyboxClient.StopLicenseDaemon();
```

---

### `ActivateLicenseAsync(options)`

Activate a license key and persist the instance ID to `.instance-id`. Called automatically by `RunProtectedAsync`.

```csharp
using KeyboxSdk;

await KeyboxClient.ActivateLicenseAsync(
    productName: "MyApp",
    key: Environment.GetEnvironmentVariable("KEYBOX_LICENSE_KEY")!
);
```

Throws `LicenseAlreadyActivatedException` if the key is already bound to a different machine or instance.

---

### `CheckLicenseStatusAsync(options)`

Read-only check — does **not** activate. Returns a `LicenseStatusResult` with `{ Status, Active, Data }`.

```csharp
using KeyboxSdk;

var result = await KeyboxClient.CheckLicenseStatusAsync(
    productName: "MyApp",
    key: Environment.GetEnvironmentVariable("KEYBOX_LICENSE_KEY")!
);

if (!result.Active)
    Console.WriteLine($"License is {result.Status}");
```

---

### `GetLicenseState()`

Returns the current in-memory license state string. Useful for rendering status in a dashboard route.

```csharp
using KeyboxSdk;

app.MapGet("/license/status", () => new { state = KeyboxClient.GetLicenseState() });
```

---

### `LicenseState`

Frozen string constants for all valid states:

```csharp
using KeyboxSdk;

LicenseState.Active              // "ACTIVE"
LicenseState.Pending             // "PENDING"
LicenseState.Expired             // "EXPIRED"
LicenseState.Revoked             // "REVOKED"
LicenseState.PendingValidation   // "pending_validation"
```

---

### `LicenseAlreadyActivatedException`

Thrown by `ActivateLicenseAsync` when the server responds with HTTP 403 indicating the key is already bound to a different machine or instance.

```csharp
using KeyboxSdk;

try
{
    await KeyboxClient.ActivateLicenseAsync(productName: "MyApp", key: licenseKey);
}
catch (LicenseAlreadyActivatedException ex)
{
    // Key is already in use elsewhere
}
```

---

## Bypass Paths

Pass `bypassPaths` to skip license enforcement on specific routes.

```csharp
await app.RunProtectedAsync(
    productName: "MyApp",
    key: licenseKey,
    bypassPaths: new[] { "/webhook", "/public" }
);
```

Prefix matching: `"/public"` also bypasses `"/public/assets/logo.png"`.

---

## Callbacks: onRevoke & onRecover

```csharp
await app.RunProtectedAsync(
    productName: "MyApp",
    key: licenseKey,
    onRevoke: async data =>
    {
        Console.Error.WriteLine("License revoked — all requests now return 402");
        // send alert, write to log, etc.
    },
    onRecover: async data =>
    {
        Console.WriteLine("License recovered — requests are flowing again");
    }
);
```

`onRevoke` fires when transitioning **into** any inactive state (REVOKED, EXPIRED, PENDING).
`onRecover` fires when transitioning **back to** ACTIVE.

Both receive the raw server response object (or `null` on network errors). Async callbacks are safe — unhandled exceptions are caught and logged without crashing the daemon.

---

## Offline Grace Period

When the KeyBox server is unreachable after the license was previously confirmed ACTIVE, the SDK stays unlocked for a configurable grace period before switching to REVOKED.

Default: `max(2 × intervalSeconds, 1800)` — at least 30 minutes.

```csharp
await app.RunProtectedAsync(
    productName: "MyApp",
    key: licenseKey,
    offlineGraceSeconds: 3600  // 1 hour
);
```

---

## 402 Response Shape

When a request is blocked the guard returns:

```json
{
    "error": "LICENSE_INACTIVE",
    "state": "REVOKED",
    "message": "Go pay your developer"
}
```

`state` will be one of `PENDING`, `EXPIRED`, `REVOKED`, or `pending_validation`.

---

## .instance-id File

On first successful activation the SDK writes a UUID to `.instance-id` in `AppContext.BaseDirectory`. This file binds the installation to its license slot on the KeyBox server.

- **Do not commit it to version control** — add `.instance-id` to `.gitignore`
- **Do not delete it** between restarts — deleting it forces a re-activation attempt
- Each deployment/machine should have its own file

---

## What the SDK Does NOT Do

- Generate or issue license keys (done in the KeyBox dashboard)
- Renew or extend licenses
- Work with non-ASP.NET Core servers out of the box
- Provide tamper-proof offline enforcement — .NET assemblies can always be patched
