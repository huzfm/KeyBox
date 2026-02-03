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
    key: "YOUR_LICENSE_KEY",
    intervalSeconds: 86400 // Validate license every 25hour
);
```

## Features

- **Fluent Integration**: Seamlessly wraps `app.Run()` with `RunProtectedAsync`.
- **Background Validation**: Automatic background checks at configurable intervals.
- **ASP.NET Core Built-in**: Designed to work naturally with the .NET 8.0+ web stack.
