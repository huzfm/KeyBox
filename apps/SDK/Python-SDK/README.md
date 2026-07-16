# KeyBox SDK — Python

Official Python SDK for **KeyBox**. Add license activation, periodic online validation, and FastAPI request gating to any Python application in a single function call.

---

## Requirements

- Python ≥ 3.10
- FastAPI (peer dependency, only required when using `protect_fastapi_app` / `license_guard`)
- `requests` library

---

## Installation

```bash
pip install keybox-sdk
```

---

## Quick Start

```python
from fastapi import FastAPI
from keybox_sdk import protect_fastapi_app
import os

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Hello from a licensed app"}

protect_fastapi_app(
    app=app,
    product_name="MyApp",
    key=os.environ["KEYBOX_LICENSE_KEY"],
)
```

That's it. The SDK will:
1. Activate the license on first run and persist the instance ID to `.instance-id`
2. Register a FastAPI middleware that returns **HTTP 402** on every request while the license is inactive
3. Start a background daemon thread that revalidates every **15 minutes** and automatically picks up renewals

---

## How It Works

```
App starts
    │
    ├─ Is .instance-id on disk?
    │       Yes → POST /validate          → already active? skip activation
    │       No  → POST /validate/activate → write UUID to .instance-id
    │
    ├─ App starts (uvicorn / gunicorn)
    │
    └─ Daemon thread starts (every 15 min)
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

### `protect_fastapi_app(options)` *(recommended entry point)*

Registers the license guard, activates on first run, starts the validation daemon, and hooks into FastAPI's startup/shutdown lifecycle.

```python
protect_fastapi_app(
    app=app,                            # FastAPI app instance (required)
    product_name="MyApp",               # Product identifier shown in KeyBox (required)
    key=os.environ["KEYBOX_LICENSE_KEY"],  # License key (required)
    bypass_paths=["/webhook"],          # list[str] — paths that skip the 402 guard
    on_revoke=lambda data: ...,         # called when license becomes inactive
    on_recover=lambda data: ...,        # called when license becomes active again
    interval_seconds=900,               # Daemon interval, default 900 (15 min)
    request_timeout=10,                 # Per-request network timeout in seconds, default 10
    offline_grace_seconds=None,         # How long to stay ACTIVE offline, default max(2×interval, 1800)
)
```

---

### `license_guard(bypass_paths=None)` — FastAPI middleware

Returns a FastAPI middleware function that blocks requests when the license is not ACTIVE.
Use this when you need the guard on specific routers rather than the whole app.

```python
from keybox_sdk import license_guard

app.middleware("http")(license_guard(bypass_paths=["/api/health"]))
```

Paths in `bypass_paths` use **prefix matching**: `"/admin"` also bypasses `"/admin/users"`.

The following paths are **always** bypassed regardless of state:
- `/health`
- `/license/status`

---

### `start_license_daemon(options)` / `stop_license_daemon()`

Start and stop the background validation daemon manually (if you are not using `protect_fastapi_app`).

```python
from keybox_sdk import start_license_daemon, stop_license_daemon, license_guard
import os

app.middleware("http")(license_guard())

start_license_daemon(
    product_name="MyApp",
    key=os.environ["KEYBOX_LICENSE_KEY"],
    on_revoke=lambda data: print("License revoked!"),
    on_recover=lambda data: print("License recovered!"),
)

# Later:
stop_license_daemon()
```

---

### `activate_license(options)`

Activate a license key and persist the instance ID to `.instance-id`. Called automatically by `protect_fastapi_app`.

```python
from keybox_sdk import activate_license
import os

activate_license(
    product_name="MyApp",
    key=os.environ["KEYBOX_LICENSE_KEY"],
)
```

Raises `LicenseAlreadyActivatedError` if the key is already bound to a different machine or instance.

---

### `check_license_status(options)`

Read-only check — does **not** activate. Returns `{ "status", "active", "data" }`.

```python
from keybox_sdk import check_license_status
import os

result = check_license_status(
    product_name="MyApp",
    key=os.environ["KEYBOX_LICENSE_KEY"],
)

if not result["active"]:
    print("License is", result["status"])
```

---

### `get_license_state()`

Returns the current in-memory license state string. Useful for rendering status in a dashboard route.

```python
from keybox_sdk import get_license_state, LicenseState

@app.get("/license/status")
def license_status():
    return {"state": get_license_state()}
```

---

### `LicenseState`

Class with string constants for all valid states:

```python
from keybox_sdk import LicenseState

LicenseState.ACTIVE              # "ACTIVE"
LicenseState.PENDING             # "PENDING"
LicenseState.EXPIRED             # "EXPIRED"
LicenseState.REVOKED             # "REVOKED"
LicenseState.PENDING_VALIDATION  # "pending_validation"
```

---

### `LicenseAlreadyActivatedError`

Raised by `activate_license` when the server responds with HTTP 403 indicating the key is already bound to a different machine or instance.

```python
from keybox_sdk import activate_license, LicenseAlreadyActivatedError
import os

try:
    activate_license(product_name="MyApp", key=os.environ["KEYBOX_LICENSE_KEY"])
except LicenseAlreadyActivatedError:
    # Key is already in use elsewhere
    pass
```

---

## Bypass Paths

Pass `bypass_paths` to skip license enforcement on specific routes.

```python
protect_fastapi_app(
    app=app,
    product_name="MyApp",
    key=os.environ["KEYBOX_LICENSE_KEY"],
    bypass_paths=["/webhook", "/public"],
)
```

Prefix matching: `"/public"` also bypasses `"/public/assets/logo.png"`.

---

## Callbacks: on_revoke & on_recover

```python
protect_fastapi_app(
    app=app,
    product_name="MyApp",
    key=os.environ["KEYBOX_LICENSE_KEY"],
    on_revoke=lambda data: print("License revoked — all requests now return 402"),
    on_recover=lambda data: print("License recovered — requests are flowing again"),
)
```

`on_revoke` fires when transitioning **into** any inactive state (REVOKED, EXPIRED, PENDING).
`on_recover` fires when transitioning **back to** ACTIVE.

Both receive the raw server response dict (or `None` on network errors). Exceptions in callbacks are caught and logged without crashing the daemon.

---

## Offline Grace Period

When the KeyBox server is unreachable after the license was previously confirmed ACTIVE, the SDK stays unlocked for a configurable grace period before switching to REVOKED.

Default: `max(2 × interval_seconds, 1800)` — at least 30 minutes.

```python
protect_fastapi_app(
    app=app,
    product_name="MyApp",
    key=os.environ["KEYBOX_LICENSE_KEY"],
    offline_grace_seconds=3600,  # 1 hour
)
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

On first successful activation the SDK writes a UUID to `.instance-id` in the current working directory. This file binds the installation to its license slot on the KeyBox server.

- **Do not commit it to version control** — add `.instance-id` to `.gitignore`
- **Do not delete it** between restarts — deleting it forces a re-activation attempt
- Each deployment/machine should have its own file

---

## What the SDK Does NOT Do

- Generate or issue license keys (done in the KeyBox dashboard)
- Renew or extend licenses
- Work with non-FastAPI Python servers (Django, Flask, etc.) out of the box
- Provide tamper-proof offline enforcement — Python bytecode can always be patched
