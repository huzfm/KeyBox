import requests
import threading
from datetime import datetime
import os

interval_thread = None
stop_event = threading.Event()
last_state = "unknown"


# --------------------
# Logger
# --------------------

def log(level: str, message: str, meta: dict | None = None):
    time_str = datetime.utcnow().isoformat()
    print(f"[{time_str}] [KEYBOX] [{level}] {message}", meta or "")


# --------------------
# Activation
# --------------------

def activate_license(
    *,
    product_name: str,
    key: str,
    api_url: str = "https://api-keybox.vercel.app",
    endpoint: str = "/validate/activate",
):
    if not product_name or not key:
        raise ValueError("product_name and key are required")

    log("INFO", "Activating license", {"product_name": product_name})

    res = requests.post(
        f"{api_url}{endpoint}",
        json={"key": key, "productName": product_name},
        timeout=15,
    )

    if "application/json" not in res.headers.get("content-type", ""):
        raise RuntimeError("License server did not return JSON")

    data = res.json()

    if not res.ok or not data.get("success"):
        raise RuntimeError(data.get("message") or "License activation failed")

    log("INFO", "License activated", {
        "status": data.get("status"),
        "expiresAt": data.get("expiresAt"),
    })

    return data


# --------------------
# Background Daemon
# --------------------

def start_license_daemon(
    *,
    product_name: str,
    key: str,
    api_url: str = "https://api-keybox.vercel.app",
    endpoint: str = "/validate",
    interval_seconds: int = 86400,
    on_start=None,
    on_stop=None,
):
    global interval_thread, last_state

    if not product_name or not key:
        raise ValueError("product_name and key are required")

    def validate_once():
        global last_state

        log("INFO", "Validating license", {"product_name": product_name})

        try:
            res = requests.post(
                f"{api_url}{endpoint}",
                json={"key": key, "productName": product_name},
                timeout=15,
            )

            if "application/json" not in res.headers.get("content-type", ""):
                raise RuntimeError("License server did not return JSON")

            data = res.json()
            valid = data.get("valid", False)
            status = data.get("status", "invalid")
            current_state = "valid" if valid else status or "invalid"

            if current_state != last_state:
                log("INFO", "License state changed", {
                    "from": last_state,
                    "to": current_state,
                    "status": status,
                })

                last_state = current_state

                if valid:
                    on_start and on_start(data)
                else:
                    on_stop and on_stop(data)

        except Exception as e:
            log("ERROR", "License validation error", {"error": str(e)})

            if last_state != "invalid":
                last_state = "invalid"
                on_stop and on_stop({
                    "valid": False,
                    "status": "error",
                    "message": str(e),
                })

    def loop():
        validate_once()
        while not stop_event.wait(interval_seconds):
            validate_once()

    stop_event.clear()
    interval_thread = threading.Thread(target=loop, daemon=True)
    interval_thread.start()

    log("INFO", "License daemon started", {"interval_seconds": interval_seconds})


def stop_license_daemon():
    global last_state
    stop_event.set()
    last_state = "unknown"
    log("INFO", "License daemon stopped")


# --------------------
# FastAPI Protector
# --------------------

def protect_fastapi_app(
    *,
    app,
    product_name: str,
    key: str,
    api_url: str = "https://api-keybox.vercel.app",
    interval_seconds: int = 86400,
):
    from fastapi import FastAPI

    if not app or not isinstance(app, FastAPI):
        raise ValueError("FastAPI app instance is required")

    # Activate once before allowing startup
    activate_license(
        product_name=product_name,
        key=key,
        api_url=api_url,
    )

    def on_stop(data):
        status = data.get("status", "invalid")

        if status in ("revoked", "expired"):
            log("ERROR", f"License {status.upper()} → shutting down server", data)
        else:
            log("ERROR", "License INVALID → shutting down server", data)

        os._exit(1)  # hard kill server process

    @app.on_event("startup")
    def _keybox_start():
        start_license_daemon(
            product_name=product_name,
            key=key,
            api_url=api_url,
            interval_seconds=interval_seconds,
            on_start=lambda _: log("INFO", "App unlocked"),
            on_stop=on_stop,
        )

    @app.on_event("shutdown")
    def _keybox_stop():
        stop_license_daemon()
