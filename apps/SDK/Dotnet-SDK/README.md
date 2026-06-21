# KeyBox SDK for .NET

Official .NET SDK for [KeyBox](https://keybox.dev). Securely generate, validate, and manage software licenses in your .NET applications.

## Installation

Install via NuGet:

```bash
dotnet add package KeyboxSdk
```

## Quick Start (ASP.NET Core)

Integrate license protection into your web application effortlessly:

```csharp
using KeyboxSdk;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "KeyBox app running");

// Run the app with protection
await app.RunProtectedAsync(
    productName: "MyDotnetApp",
    key: "YOUR_LICENSE_KEY"
);
```

## Features

- **Fluent Integration**: Seamlessly wraps `app.RunAsync()` with `RunProtectedAsync`.
- **Background Validation**: Automatic background checks every 15 minutes.
- **ASP.NET Core Built-in**: Designed to work naturally with the .NET 8.0+ web stack.
- **Request Gating on Inactive Licenses**: When a license is expired or revoked, every request is rejected with **HTTP 402 Payment Required** and the message *"Please pay your developer"*. The process stays alive — when the license is renewed, the next request succeeds without a restart.
- **State Manager**: Read or set the current license state at runtime via `KeyboxClient.GetLicenseState()` / `SetLicenseState(...)`. The `KeyboxClient.LicenseState` class exposes `Valid`, `Expired`, `Revoked`, `Invalid`, `Unknown`.
- **Custom Guard**: Call `app.UseKeyboxGuard("/webhooks", "/api/internal/...")` to register the gate yourself for fine-grained control. `RunProtectedAsync` registers it globally by default.

## 402 response shape

```json
{
  "error": "LICENSE_INACTIVE",
  "state": "expired",
  "message": "Please pay your developer",
  "renewContact": "support@keybox.dev"
}
```
