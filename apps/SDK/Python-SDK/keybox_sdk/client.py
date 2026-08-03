import hashlib
import platform
import re
import requests
import threading
import time
import uuid
from datetime import datetime
import os

# ── Module-level daemon state ─────────────────────────────────────────────────
_interval_thread: threading.Thread | None = None
_stop_event = threading.Event()
_state_lock = threading.Lock()
_last_state: str = "pending_validation"
_is_validating: bool = False            # Bug 6: overlap guard
_last_successful_validation: float | None = None  # Bug 8: offline grace (monotonic ts)

# ── Machine ID ────────────────────────────────────────────────────────────────
# Bug 2 fix: compute a stable hashed identifier from this machine's hardware.
# uuid.getnode() returns the MAC address as an integer — stable per NIC.
# We combine it with the hostname for better uniqueness.
_machine_id: str | None = None

def _get_machine_id() -> str:
    global _machine_id
    if _machine_id:
        return _machine_id
    try:
        raw = f"{platform.node()}-{uuid.getnode()}"
        _machine_id = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    except Exception:
        _machine_id = "fallback-" + uuid.uuid4().hex
    return _machine_id


# ── License State ─────────────────────────────────────────────────────────────
class LicenseState:
    """States mirror the server's Status enum exactly.
    PENDING_VALIDATION is the only SDK-internal state (cold-start sentinel)."""
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"
    PENDING_VALIDATION = "pending_validation"


# Bug 1 fix: server statuses that must always map to REVOKED (fail-closed).
# Previously these fell into the "unrecognised → keep state" branch, leaving
# an already-ACTIVE app permanently unlocked after the server denied the license.
_HARD_REVOKE_STATUSES: set[str] = {
    "invalid",
    "machine_mismatch",
    "instance_mismatch",
    "unknown",
}

# States that block requests (HTTP 402).
_INACTIVE_STATES: set[str] = {
    LicenseState.EXPIRED,
    LicenseState.REVOKED,
    LicenseState.PENDING,
}

# Paths that bypass the guard regardless of state.
DEFAULT_BYPASS_PATHS: set[str] = {"/health", "/license/status"}

# Daemon revalidation interval.
VALIDATION_INTERVAL_SECONDS = 900


# ── Bypass path matching ──────────────────────────────────────────────────────
def _matches_bypass(pathname: str, bypass_paths: set) -> bool:
    if not pathname:
        return False
    for pattern in bypass_paths:
        if pattern == pathname:
            return True
        if pattern.endswith("/") and pathname.startswith(pattern):
            return True
        if not pattern.endswith("/") and pathname.startswith(pattern + "/"):
            return True
    return False


# ── Logging ───────────────────────────────────────────────────────────────────
def log(level: str, message: str, meta: dict | None = None) -> None:
    time_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    meta_str = f"  {meta}" if meta else ""
    print(f"[{time_str}] [KEYBOX] [{level.upper()}] {message}{meta_str}", flush=True)


# ── Errors ────────────────────────────────────────────────────────────────────
class LicenseAlreadyActivatedError(RuntimeError):
    """Raised when the server confirms the license is already bound to a
    different (machineId, instanceId) pair."""
    def __init__(self, message: str):
        super().__init__(message)
        self.code = "LICENSE_ALREADY_ACTIVATED"


# ── Instance ID storage ───────────────────────────────────────────────────────
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


def _persist_instance_id(value: str) -> None:
    file_path = os.path.join(os.getcwd(), ".instance-id")
    try:
        # 'x' = exclusive create — won't clobber an existing file
        with open(file_path, "x", encoding="utf-8") as f:
            f.write(value)
    except FileExistsError:
        return
    except OSError as e:
        existing = _read_stored_instance_id()
        if existing != value:
            log("WARN", "Could not persist .instance-id; keeping existing value", {
                "path": file_path,
                "error": str(e),
            })


def _candidate_instance_id() -> str:
    return _read_stored_instance_id() or uuid.uuid4().hex


# ── Public state accessor ─────────────────────────────────────────────────────
def get_license_state() -> str:
    """Return the current license state string."""
    with _state_lock:
        return _last_state


# Bug 12 fix: set_license_state is no longer public.
# Exposing it made enforcement trivially bypassable.
# State is now only mutated by validated server responses.
def _set_license_state(state: str) -> None:
    global _last_state
    with _state_lock:
        _last_state = state


# ── Safe callback helper ──────────────────────────────────────────────────────
# Bug 10 fix: callbacks are wrapped so exceptions never crash the daemon.
def _fire_callback(cb, data) -> None:
    if not cb:
        return
    try:
        cb(data)
    except Exception as e:
        log("WARN", "License callback threw", {"error": str(e)})


# ── Check license status ──────────────────────────────────────────────────────
def check_license_status(
    *,
    product_name: str,
    key: str,
    api_url: str = "https://api-keybox.vercel.app",
    endpoint: str = "/validate",
    request_timeout: int = 10,
) -> dict:
    """Read-only check — does not activate. Returns {status, active, data}."""
    if not product_name or not key:
        raise ValueError("product_name and key are required")

    instance_id = _read_stored_instance_id()
    if not instance_id:
        return {"status": "not_activated", "active": False, "data": None}

    log("INFO", "Checking license status", {"product_name": product_name})

    res = requests.post(
        f"{api_url}{endpoint}",
        json={
            "key": key,
            "productName": product_name,
            "instanceId": instance_id,
            "machineId": _get_machine_id(),  # Bug 2 fix
        },
        timeout=request_timeout,
    )

    if "application/json" not in res.headers.get("content-type", ""):
        raise RuntimeError("License server did not return JSON")

    data = res.json()
    raw_status = data.get("status") if isinstance(data.get("status"), str) else ""
    status_upper = raw_status.upper()
    is_active = data.get("valid") is True and status_upper == "ACTIVE"

    return {"status": status_upper, "active": is_active, "data": data}


# ── Activate license ──────────────────────────────────────────────────────────
def activate_license(
    *,
    product_name: str,
    key: str,
    api_url: str = "https://api-keybox.vercel.app",
    endpoint: str = "/validate/activate",
    request_timeout: int = 10,
):
    """Activate a license key and persist the instance ID to .instance-id."""
    if not product_name or not key:
        raise ValueError("product_name and key are required")

    instance_id = _candidate_instance_id()
    log("INFO", "Activating license", {"product_name": product_name})

    res = requests.post(
        f"{api_url}{endpoint}",
        json={
            "key": key,
            "productName": product_name,
            "instanceId": instance_id,
            "machineId": _get_machine_id(),  # Bug 2 fix
        },
        timeout=request_timeout,
    )

    if "application/json" not in res.headers.get("content-type", ""):
        raise RuntimeError("License server did not return JSON")

    data = res.json()

    # Bug 7 fix: require success is True explicitly — missing field or {} is rejected.
    if not res.ok or data.get("success") is not True:
        message = data.get("message") or "License activation failed"

        log("ERROR", "License server rejected activation", {
            "http_status": res.status_code,
            "server_message": message,
        })

        if (
            res.status_code == 403
            and isinstance(message, str)
            and re.search(
                r"another\s+(instance|device|machine)|already\s+(activated|active|bound)",
                message,
                re.IGNORECASE,
            )
        ):
            raise LicenseAlreadyActivatedError(message)

        raise RuntimeError(message)

    if not _read_stored_instance_id():
        _persist_instance_id(instance_id)

    log("SUCCESS", "License activated")
    return data


# ── Background daemon ─────────────────────────────────────────────────────────
def start_license_daemon(
    *,
    product_name: str,
    key: str,
    api_url: str = "https://api-keybox.vercel.app",
    endpoint: str = "/validate",
    on_revoke=None,
    on_recover=None,
    interval_seconds: int = VALIDATION_INTERVAL_SECONDS,
    request_timeout: int = 10,
    offline_grace_seconds: int | None = None,
) -> None:
    """Start the background validation daemon in a daemon thread."""
    global _interval_thread, _last_state, _is_validating, _last_successful_validation

    if not product_name or not key:
        raise ValueError("product_name and key are required")

    if not isinstance(interval_seconds, int) or interval_seconds <= 0:
        raise ValueError("interval_seconds must be a positive integer")

    # Bug 8: offline grace defaults to max(2 × interval, 1800 s)
    offline_grace = (
        offline_grace_seconds
        if offline_grace_seconds is not None
        else max(interval_seconds * 2, 1800)
    )

    def validate_once() -> None:
        global _last_state, _is_validating, _last_successful_validation

        # Bug 6: overlap guard — skip tick if previous is still in flight
        with _state_lock:
            if _is_validating:
                log("INFO", "Skipping validation tick — previous check still in progress")
                return
            _is_validating = True

        try:
            # Bug 4 fix: re-read instanceId on every tick.
            # The original code captured it once at daemon startup, so a
            # failed activation left it permanently null with no retry path.
            instance_id = _read_stored_instance_id()

            if not instance_id:
                with _state_lock:
                    current = _last_state

                if current == LicenseState.PENDING_VALIDATION:
                    log("WARN", "No .instance-id on disk — retrying activation")
                    try:
                        activate_license(
                            product_name=product_name,
                            key=key,
                            api_url=api_url,
                            request_timeout=request_timeout,
                        )
                        instance_id = _read_stored_instance_id()
                    except Exception as activation_err:
                        log("WARN", "Activation retry failed", {"error": str(activation_err)})

                if not instance_id:
                    log("WARN", "No .instance-id on disk — skipping validation")
                    return

            log("INFO", "Validating license", {"product_name": product_name})

            res = requests.post(
                f"{api_url}{endpoint}",
                json={
                    "key": key,
                    "productName": product_name,
                    "instanceId": instance_id,
                    "machineId": _get_machine_id(),  # Bug 2 fix
                },
                timeout=request_timeout,
            )

            # 429 / 5xx: transient — keep current state
            if res.status_code == 429 or res.status_code >= 500:
                with _state_lock:
                    current = _last_state
                log("WARN", "Transient server response — keeping current state", {
                    "http_status": res.status_code,
                    "current_state": current,
                })
                return

            if "application/json" not in res.headers.get("content-type", ""):
                raise RuntimeError("Non-JSON response from license server")

            data = res.json()
            raw_status = data.get("status") if isinstance(data.get("status"), str) else ""
            status_upper = raw_status.upper()

            with _state_lock:
                previous_state = _last_state

            # Bug 1 fix: hard-fail statuses → REVOKED (fail-closed)
            if raw_status.lower() in _HARD_REVOKE_STATUSES:
                next_state = LicenseState.REVOKED
                log("WARN", "License validation returned hard-fail status — revoking", {
                    "server_status": raw_status,
                })
            elif data.get("valid") is True and status_upper == "ACTIVE":
                next_state = LicenseState.ACTIVE
                _last_successful_validation = time.monotonic()  # Bug 8: update grace timestamp
            elif status_upper == "REVOKED":
                next_state = LicenseState.REVOKED
            elif status_upper == "EXPIRED":
                next_state = LicenseState.EXPIRED
            elif status_upper == "PENDING":
                next_state = LicenseState.PENDING
            else:
                log("WARN", "Unrecognised license server response — keeping current state", {
                    "current_state": previous_state,
                    "server_status": raw_status,
                    "server_valid": data.get("valid"),
                })
                return

            if next_state != previous_state:
                if next_state == LicenseState.ACTIVE:
                    log("INFO", "License state changed to ACTIVE — requests will be accepted", {
                        "from": previous_state, "to": next_state,
                    })
                elif next_state in _INACTIVE_STATES:
                    log("ERROR", f"License state changed to {next_state} — requests will be rejected with 402", {
                        "from": previous_state, "to": next_state,
                        "server_message": data.get("message"),
                    })
                else:
                    log("INFO", f"License state changed to {next_state}", {
                        "from": previous_state, "to": next_state,
                    })

                with _state_lock:
                    _last_state = next_state

                # Bug 10 fix: callbacks wrapped, fired consistently
                if next_state in _INACTIVE_STATES and previous_state not in _INACTIVE_STATES:
                    _fire_callback(on_revoke, data)
                elif next_state == LicenseState.ACTIVE and previous_state in _INACTIVE_STATES:
                    _fire_callback(on_recover, data)

        except Exception as e:
            log("WARN", "License check failed — keeping current state", {"error": str(e)})

            with _state_lock:
                current = _last_state

            if current == LicenseState.PENDING_VALIDATION:
                # Cold-start failure: block immediately
                with _state_lock:
                    _last_state = LicenseState.REVOKED
                log("ERROR", "License daemon could not reach the server on startup — requests will be rejected with 402", {
                    "from": LicenseState.PENDING_VALIDATION,
                    "to": LicenseState.REVOKED,
                })
                # Bug 10 fix: fire on_revoke for cold-start failures too
                _fire_callback(on_revoke, None)

            elif current == LicenseState.ACTIVE and _last_successful_validation is not None:
                # Bug 8 fix: bounded offline grace period
                elapsed = time.monotonic() - _last_successful_validation
                if elapsed > offline_grace:
                    log("ERROR", "Offline grace period exceeded — blocking requests", {
                        "grace_seconds": offline_grace,
                        "elapsed_seconds": round(elapsed),
                    })
                    with _state_lock:
                        _last_state = LicenseState.REVOKED
                    _fire_callback(on_revoke, None)
                else:
                    log("WARN", "Network failure — within offline grace period", {
                        "elapsed_seconds": round(elapsed),
                        "grace_seconds": offline_grace,
                    })

        finally:
            # Bug 6: always release the overlap guard, even on exception
            with _state_lock:
                _is_validating = False

    def _loop() -> None:
        validate_once()
        while not _stop_event.wait(interval_seconds):
            validate_once()

    _stop_event.clear()
    _interval_thread = threading.Thread(target=_loop, daemon=True)
    _interval_thread.start()

    log("INFO", "License daemon started", {"interval_seconds": interval_seconds})


def stop_license_daemon() -> None:
    """Signal the daemon thread to stop after its current tick completes."""
    _stop_event.set()
    log("INFO", "License daemon stopped")


# ── FastAPI license guard ─────────────────────────────────────────────────────
def license_guard(bypass_paths=None):
    """Return a FastAPI middleware coroutine that returns HTTP 402 when the
    license is not ACTIVE. /health and /license/status are always bypassed."""
    try:
        from fastapi import Request
        from fastapi.responses import JSONResponse
    except ImportError:
        raise ImportError("license_guard requires FastAPI — pip install fastapi")

    allowed_paths = set(DEFAULT_BYPASS_PATHS)
    if bypass_paths:
        allowed_paths.update(bypass_paths)

    # Starlette calls an http middleware as (request, call_next) and expects a
    # Response back — it must forward the request itself, not return None.
    async def _guard(request: Request, call_next):
        state = get_license_state()
        if state == LicenseState.ACTIVE:
            return await call_next(request)
        if _matches_bypass(request.url.path, allowed_paths):
            return await call_next(request)
        return JSONResponse(
            status_code=402,
            content={
                "error": "LICENSE_INACTIVE",
                "state": state,
                "message": "Go pay your developer",
            },
        )

    return _guard


# ── FastAPI protector (main entry point) ──────────────────────────────────────
def protect_fastapi_app(
    *,
    app,
    product_name: str,
    key: str,
    api_url: str = "https://api-keybox.vercel.app",
    bypass_paths=None,
    on_revoke=None,
    on_recover=None,
    interval_seconds: int = VALIDATION_INTERVAL_SECONDS,
    request_timeout: int = 10,
    offline_grace_seconds: int | None = None,
) -> None:
    """Register the license guard and daemon on a FastAPI application.

    Activates the license on first run, registers the request guard as
    middleware, and starts/stops the daemon with the application lifecycle.
    """
    from fastapi import FastAPI

    if not isinstance(app, FastAPI):
        raise ValueError("FastAPI app instance is required")

    try:
        status = check_license_status(
            product_name=product_name,
            key=key,
            api_url=api_url,
            request_timeout=request_timeout,
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
                request_timeout=request_timeout,
            )
    except LicenseAlreadyActivatedError as e:
        log("ERROR", "License is already activated on another device. Requests will be rejected with 402 until this is resolved.", {
            "reason": str(e),
        })
    except Exception as e:
        log("ERROR", "Failed to activate license. Starting the app anyway — requests will be rejected with 402 until activation succeeds.", {
            "reason": str(e),
        })

    guard = license_guard(bypass_paths=bypass_paths)
    app.middleware("http")(guard)

    @app.on_event("startup")
    def _keybox_start():
        start_license_daemon(
            product_name=product_name,
            key=key,
            api_url=api_url,
            on_revoke=on_revoke,
            on_recover=on_recover,
            interval_seconds=interval_seconds,
            request_timeout=request_timeout,
            offline_grace_seconds=offline_grace_seconds,
        )

    @app.on_event("shutdown")
    def _keybox_stop():
        stop_license_daemon()
