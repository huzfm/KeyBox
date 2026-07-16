# KeyBox SDK — Node.js

Official Node.js SDK for **KeyBox**. Add license activation, periodic online validation, and Express request gating to any Node.js application in a single function call.

---

## Requirements

- Node.js ≥ 18
- Express ≥ 4 (peer dependency)

---

## Installation

```bash
npm install keybox-sdk
```

---

## Quick Start

```js
import express from "express"
import { protectNodeApp } from "keybox-sdk"

const app = express()

app.get("/", (req, res) => res.send("Hello from a licensed app"))

await protectNodeApp({
    app,
    port: 3000,
    productName: "MyApp",
    key: process.env.KEYBOX_LICENSE_KEY,
})
```

That's it. The SDK will:
1. Activate the license on first run and persist the instance ID to `.instance-id`
2. Register an Express guard that returns **HTTP 402** on every request while the license is inactive
3. Start a background daemon that revalidates every **15 minutes** and automatically picks up renewals

---

## How It Works

```
App starts
    │
    ├─ Is .instance-id on disk?
    │       Yes → POST /validate          → already active? skip activation
    │       No  → POST /validate/activate → write UUID to .instance-id
    │
    ├─ app.listen(port)
    │
    └─ Daemon starts (every 15 min)
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

### `protectNodeApp(options)` *(recommended entry point)*

Registers the license guard, activates on first run, starts the validation daemon, and calls `app.listen`.

```js
await protectNodeApp({
    app,                            // Express app instance (required)
    port,                           // Port to listen on (required)
    productName,                    // Product identifier shown in KeyBox (required)
    key,                            // License key (required)
    bypassPaths,                    // string[] — paths that skip the 402 guard
    onRevoke,                       // () => void — called when license becomes inactive
    onRecover,                      // () => void — called when license becomes active again
    intervalSeconds,                // Daemon interval, default 900 (15 min)
    fetchTimeoutMs,                 // Per-request network timeout, default 10 000 ms
    offlineGraceSeconds,            // How long to stay ACTIVE offline, default max(2×interval, 1800)
})
```

---

### `licenseGuard(options)` — Express middleware

Returns an Express middleware that blocks requests when the license is not ACTIVE.
Use this when you need the guard on specific routers rather than the whole app.

```js
import { licenseGuard } from "keybox-sdk"

app.use("/api", licenseGuard({ bypassPaths: ["/api/health"] }))
```

Paths in `bypassPaths` use **prefix matching**: `"/admin"` also bypasses `"/admin/users"`.

The following paths are **always** bypassed regardless of state:
- `/health`
- `/license/status`

---

### `startLicenseDaemon(options)` / `stopLicenseDaemon()`

Start and stop the background validation daemon manually (if you are not using `protectNodeApp`).

```js
import { startLicenseDaemon, stopLicenseDaemon, licenseGuard } from "keybox-sdk"

app.use(licenseGuard())

await startLicenseDaemon({
    productName: "MyApp",
    key: process.env.KEYBOX_LICENSE_KEY,
    onRevoke: () => console.log("License revoked!"),
    onRecover: () => console.log("License recovered!"),
})

// Later:
stopLicenseDaemon()
```

---

### `activateLicense(options)`

Activate a license key and persist the instance ID. Called automatically by `protectNodeApp`.

```js
import { activateLicense } from "keybox-sdk"

await activateLicense({
    productName: "MyApp",
    key: process.env.KEYBOX_LICENSE_KEY,
})
```

Throws `LicenseAlreadyActivatedError` if the key is already bound to a different machine or instance.

---

### `checkLicenseStatus(options)`

Read-only check — does **not** activate. Returns `{ status, active, data }`.

```js
import { checkLicenseStatus } from "keybox-sdk"

const { active, status } = await checkLicenseStatus({
    productName: "MyApp",
    key: process.env.KEYBOX_LICENSE_KEY,
})

if (!active) console.log("License is", status)
```

---

### `getLicenseState()`

Returns the current in-memory license state string. Useful for rendering status in a dashboard route.

```js
import { getLicenseState, LicenseState } from "keybox-sdk"

app.get("/license/status", (req, res) => {
    res.json({ state: getLicenseState() })
})
```

---

### `LicenseState`

Frozen enum of all valid state strings:

```js
import { LicenseState } from "keybox-sdk"

LicenseState.ACTIVE              // "ACTIVE"
LicenseState.PENDING             // "PENDING"
LicenseState.EXPIRED             // "EXPIRED"
LicenseState.REVOKED             // "REVOKED"
LicenseState.PENDING_VALIDATION  // "pending_validation"
```

---

### `LicenseAlreadyActivatedError`

Thrown by `activateLicense` when the server responds with HTTP 403 indicating the key is already bound to a different machine or instance.

```js
import { activateLicense, LicenseAlreadyActivatedError } from "keybox-sdk"

try {
    await activateLicense({ productName, key })
} catch (err) {
    if (err instanceof LicenseAlreadyActivatedError) {
        // Key is already in use elsewhere
    }
}
```

---

## Bypass Paths

Pass `bypassPaths` to skip license enforcement on specific routes.

```js
await protectNodeApp({
    app,
    port: 3000,
    productName: "MyApp",
    key: process.env.KEYBOX_LICENSE_KEY,
    bypassPaths: ["/webhook", "/public"],
})
```

Prefix matching: `"/public"` also bypasses `"/public/assets/logo.png"`.

---

## Callbacks: onRevoke & onRecover

```js
await protectNodeApp({
    app,
    port: 3000,
    productName: "MyApp",
    key: process.env.KEYBOX_LICENSE_KEY,
    onRevoke: (serverData) => {
        console.error("License revoked — all requests now return 402")
        // send alert, write to log, etc.
    },
    onRecover: (serverData) => {
        console.log("License recovered — requests are flowing again")
    },
})
```

`onRevoke` fires when transitioning **into** any inactive state (REVOKED, EXPIRED, PENDING).
`onRecover` fires when transitioning **back to** ACTIVE.

Both are called with the raw server response object. Async callbacks are safe — unhandled promise rejections are caught and logged without crashing the daemon.

---

## Offline Grace Period

When the KeyBox server is unreachable after the license was previously confirmed ACTIVE, the SDK stays unlocked for a configurable grace period before switching to REVOKED.

Default: `max(2 × intervalSeconds, 1800)` — at least 30 minutes.

```js
await protectNodeApp({
    app,
    port: 3000,
    productName: "MyApp",
    key: process.env.KEYBOX_LICENSE_KEY,
    offlineGraceSeconds: 3600, // 1 hour
})
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

## Environment Variables

The SDK reads no environment variables itself — pass values explicitly:

```js
await protectNodeApp({
    productName: process.env.PRODUCT_NAME,
    key: process.env.KEYBOX_LICENSE_KEY,
    // ...
})
```

---

## .instance-id File

On first successful activation the SDK writes a UUID to `.instance-id` in the current working directory. This file binds the installation to its license slot on the KeyBox server.

- **Do not commit it to version control** — add `.instance-id` to `.gitignore`
- **Do not delete it** between restarts — deleting it forces a re-activation attempt
- Each deployment/machine should have its own file

---

## What the SDK Does NOT Do

- Generate or issue license keys (done in the KeyBox dashboard)
- Renew or extend licenses
- Work with non-Express Node.js servers (Fastify, Koa, etc.) out of the box
- Provide tamper-proof offline enforcement — JavaScript can always be patched by the customer
