import requests
import threading
import uuid
from datetime import datetime
import os

interval_thread = None
stop_event = threading.Event()
last_state = "unknown"

# Fixed validation interval (15 minutes)
VALIDATION_INTERVAL_SECONDS = 900


# --------------------
# Errors
# --------------------

class LicenseAlreadyActivatedError(RuntimeError):
    """Raised when the server confirms the license is already bound to a
    different (machineId, instanceId) pair. Consumers can catch this to
    show a friendlier message and avoid persisting any local state."""

    def __init__(self, message: str):
        super().__init__(message)
        self.code = "LICENSE_ALREADY_ACTIVATED"


# --------------------
# Per-instance UUID
# --------------------

# Read the on-disk id if it exists. We deliberately do NOT generate +
# persist on the first call — the id is only written to disk after the
# server confirms activation.
def _read_stored_instance_id() -> str | None:
    file_path = os.path.join(os.getcwd(), ".instance-id")
    if not os.path.exists(file_path):
        return None
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read().strip()
            return content or None
    except OSError:
        return None


# Persist the given id to <cwd>/.instance-id. Uses an exclusive-create
# flag so a concurrent process can't clobber its own id with ours.
def _persist_instance_id(value: str) -> None:
    file_path = os.path.join(os.getcwd(), ".instance-id")
    try:
        # 'x' = exclusive create — don't clobber an existing file
        with open(file_path, "x", encoding="utf-8") as f:
            f.write(value)
    except FileExistsError:
        # Someone (another instance, or a previous successful run) already
        # wrote a file. Leave it as-is.
        return
    except OSError as e:
        # Other I/O error — re-read to confirm what's on disk.
        existing = _read_stored_instance_id()
        if existing != value:
            log("WARN", "Could not persist .instance-id; keeping existing value", {
                "path": file_path,
                "error": str(e),
            })


def _candidate_instance_id() -> str:
    return _read_stored_instance_id() or uuid.uuid4().hex


# --------------------
# Status check
# --------------------

# Read-only check: ask the server whether the license is already
# activated for the (machineId, instanceId) we'd be sending. Returns a
# dict with `active=True` ONLY when the server says `valid: true` AND
# status == "active" for the stored instance id. Callers use this to
# decide whether activation is actually needed on cold start.
def check_license_status(
    *,
    product_name: str,
    key: str,
    api_url: str = "https://api-keybox.vercel.app",
    endpoint: str = "/validate",
) -> dict:
    if not product_name or not key:
        raise ValueError("product_name and key are required")

    instance_id = _read_stored_instance_id()

    # No .instance-id on disk → never activated from this app, so
    # there's nothing the server can confirm. Caller should activate.
    if not instance_id:
        return {"status": "not_activated", "active": False, "data": None}

    log("INFO", "Checking license status", {"product_name": product_name})

    res = requests.post(
        f"{api_url}{endpoint}",
        json={"key": key, "productName": product_name, "instanceId": instance_id},
        timeout=15,
    )

    if "application/json" not in res.headers.get("content-type", ""):
        raise RuntimeError("License server did not return JSON")

    data = res.json()
    status = (data.get("status") or "unknown").lower()
    is_active = data.get("valid") is True and status == "active"

    return {"status": status, "active": is_active, "data": data}


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

    instance_id = _candidate_instance_id()

    log("INFO", "Activating license", {"product_name": product_name})

    res = requests.post(
        f"{api_url}{endpoint}",
        json={"key": key, "productName": product_name, "instanceId": instance_id},
        timeout=15,
    )

    if "application/json" not in res.headers.get("content-type", ""):
        raise RuntimeError("License server did not return JSON")

    data = res.json()

    if not res.ok or not data.get("success"):
        message = data.get("message") or "License activation failed"

        # Distinguish "bound to a different instance" from generic failure
        # so the consuming app can show a clearer message.
        if res.status_code == 403 and "another instance" in message.lower():
            raise LicenseAlreadyActivatedError(message)

        raise RuntimeError(message)

    # Server accepted this (machineId, instanceId) pair. Safe to commit
    # the id to disk now — only on a real success do we make it sticky.
    if not _read_stored_instance_id():
        _persist_instance_id(instance_id)

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
    on_start=None,
    on_stop=None,
):
    global interval_thread, last_state

    if not product_name or not key:
        raise ValueError("product_name and key are required")

    # Daemon is read-only: never generate a new id here. If none is on
    # disk and none was bound by an earlier activation, every /validate
    # call would 400 (server requires instanceId) — that's the right
    # signal: the user must run activation first.
    instance_id = _read_stored_instance_id()

    def validate_once():
        global last_state

        log("INFO", "Validating license", {"product_name": product_name})

        if not instance_id:
            log("WARN", "No .instance-id on disk — run activation first")
            return

        try:
            res = requests.post(
                f"{api_url}{endpoint}",
                json={"key": key, "productName": product_name, "instanceId": instance_id},
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
        while not stop_event.wait(VALIDATION_INTERVAL_SECONDS):
            validate_once()

    stop_event.clear()
    interval_thread = threading.Thread(target=loop, daemon=True)
    interval_thread.start()

    log("INFO", "License daemon started", {"interval_seconds": VALIDATION_INTERVAL_SECONDS})


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
):
    from fastapi import FastAPI

    if not app or not isinstance(app, FastAPI):
        raise ValueError("FastAPI app instance is required")

    # Avoid duplicate activation on cold start: if the server already
    # confirms this (machineId, instanceId) is active, skip the
    # /validate/activate call entirely and go straight to the daemon.
    status = check_license_status(
        product_name=product_name,
        key=key,
        api_url=api_url,
    )
    if status["active"]:
        log("INFO", "License already active on this instance — skipping activation", {
            "status": status["status"],
        })
    else:
        log("INFO", "License not active — activating", {"status": status["status"]})
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
            on_start=lambda _: log("INFO", "App unlocked"),
            on_stop=on_stop,
        )

    @app.on_event("shutdown")
    def _keybox_stop():
        stop_license_daemon()
