# KeyBox License Management SDK (Python)

Official Python SDK for [KeyBox](https://keybox.dev). Integrate license generation, validation, and management with ease.

## Installation

```bash
pip install keybox-sdk
```

## Quick Start (FastAPI)

```python
from fastapi import FastAPI
from keybox_sdk import protect_fastapi_app

app = FastAPI()

protect_fastapi_app(
    app=app,
    product_name="MyPythonApp",
    key="YOUR_LICENSE_KEY",
)

@app.get("/")
def read_root():
    return {"message": "Protected App"}
```

## Features

- **Automated Validation**: Automatic background license checks every 15 minutes.
- **Easy Integration**: Built-in support for FastAPI.
- **Request Gating on Inactive Licenses**: When a license is expired or revoked, every request is rejected with **HTTP 402 Payment Required** and the message *"Please pay your developer"*. The process stays alive — when the license is renewed, the next request succeeds without a restart.
- **State Manager**: Read or set the current license state at runtime via `get_license_state()` / `set_license_state()`. The `LicenseState` class exposes `valid`, `expired`, `revoked`, `invalid`, `unknown`.
- **Custom Guard**: Use `license_guard(bypass_paths=...)` as a FastAPI dependency on selected routes for fine-grained control. `protect_fastapi_app` registers it globally by default.

## 402 response shape

```json
{
  "error": "LICENSE_INACTIVE",
  "state": "expired",
  "message": "Please pay your developer",
  "renewContact": "support@keybox.dev"
}
```
