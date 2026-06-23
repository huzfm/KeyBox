import requests
import threading
import uuid
from datetime import datetime
import os

interval_thread = None
stop_event = threading.Event()

# State manager — single source of truth for license state.
# Customers can read this via get_license_state() to render their
# own UI; the license_guard() middleware reads from the same store.
# We initialize with "pending_validation" — the explicit cold-start
# state. Previously we used "unknown", but the guard treated
# "unknown" as a free-pass (let requests through), which meant a
# daemon that could never reach the server would silently serve
# traffic forever with no license. PENDING_VALIDATION is blocked.
_state_lock = threading.Lock()
_last_state = "pending_validation"


# Fixed validation interval (15 minutes)
VALIDATION_INTERVAL_SECONDS = 900


# --------------------
# License State
# --------------------

class LicenseState:
    """States mirror the server's Status enum exactly so there is no
    impedance mismatch between what the server sends and what the SDK
    stores. The only SDK-internal state that has no server counterpart
    is PENDING_VALIDATION (the cold-start sentinel)."""
    # Server reports the license was created but not activated yet.
    PENDING = "PENDING"
    # License is valid and active — the only state that lets traffic through.
    ACTIVE = "ACTIVE"
    # License has passed its expiry date.
    EXPIRED = "EXPIRED"
    # License was explicitly revoked by the developer.
    REVOKED = "REVOKED"
    # Internal SDK sentinel: set on startup before the first successful
    # response from the license server. Requests are BLOCKED in this state.
    PENDING_VALIDATION = "pending_validation"


# States that definitively indicate the license is not usable.
# Requests are blocked (HTTP 402) whenever the current state is in this set.
_INACTIVE_STATES = {LicenseState.EXPIRED, LicenseState.REVOKED, LicenseState.PENDING}

# Paths that should never be blocked by the license guard. Customers
# can extend this list via the `bypass_paths` option to
# protect_fastapi_app.
DEFAULT_BYPASS_PATHS = {"/health", "/license/status"}


def _matches_bypass(pathname: str, bypass_paths: set) -> bool:
    if not pathname:
        return False
    for pattern in bypass_paths:
        if pattern == pathname:
            return True
        # Prefix match: "/license" matches "/license/renew", etc.
        if pattern.endswith("/") and pathname.startswith(pattern):
            return True
        if not pattern.endswith("/") and pathname.startswith(pattern + "/"):
            return True
    return False


def get_license_state() -> str:
    """Return the current license state as a string from `LicenseState`."""
    with _state_lock:
        return _last_state


def set_license_state(state: str) -> None:
    """Update the in-memory license state. Validates the input; logs
    and ignores anything outside `LicenseState`."""
    allowed = {
        LicenseState.PENDING,
        LicenseState.ACTIVE,
        LicenseState.EXPIRED,
        LicenseState.REVOKED,
        LicenseState.PENDING_VALIDATION,
    }
    if state not in allowed:
        log("WARN", "Ignoring invalid license state", {"state": state, "allowed": list(allowed)})
        return
    with _state_lock:
        global _last_state
        _last_state = state


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
    status = (data.get("status") or "").upper()
    is_active = data.get("valid") is True and status == "ACTIVE"

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
    on_recover=None,
    # Override the daemon's poll interval (default 900s / 15 minutes).
    # Useful for tests and for customers who want a different cadence.
    # Must be a positive integer.
    interval_seconds: int = VALIDATION_INTERVAL_SECONDS,
):
    global interval_thread

    if not product_name or not key:
        raise ValueError("product_name and key are required")

    if not isinstance(interval_seconds, int) or interval_seconds <= 0:
        raise ValueError("interval_seconds must be a positive integer")

    # Daemon is read-only: never generate a new id here. If none is on
    # disk and none was bound by an earlier activation, every /validate
    # call would 400 (server requires instanceId) — that's the right
    # signal: the user must run activation first.
    instance_id = _read_stored_instance_id()

    def validate_once():
        global _last_state
        with _state_lock:
            previous_state = _last_state

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
            # Coerce defensively: server may return status as a non-string.
            # Compare uppercase to match the server's Status enum.
            status_upper = (data.get("status") or "").upper()

            # Translate server status into our internal LicenseState.
            # Valid server statuses: PENDING, ACTIVE, EXPIRED, REVOKED.
            # Any unrecognised response is a transient error — keep the
            # last known state instead of blocking or going to UNKNOWN.
            if valid and status_upper == LicenseState.ACTIVE:
                next_state = LicenseState.ACTIVE
            elif status_upper == LicenseState.REVOKED:
                next_state = LicenseState.REVOKED
            elif status_upper == LicenseState.EXPIRED:
                next_state = LicenseState.EXPIRED
            elif status_upper == LicenseState.PENDING:
                next_state = LicenseState.PENDING
            else:
                # Unrecognised response — do NOT change state.
                log("WARN", "Unrecognised license server response — keeping current state", {
                    "current_state": previous_state,
                    "server_status": data.get("status"),
                    "server_valid": valid,
                })
                return

            if next_state != previous_state:
                if next_state == LicenseState.ACTIVE:
                    log("INFO", "License state changed to ACTIVE — requests will be accepted", {
                        "from": previous_state,
                        "to": next_state,
                    })
                elif next_state in _INACTIVE_STATES:
                    log("ERROR", f"License state changed to {next_state} — requests will be rejected with 402", {
                        "from": previous_state,
                        "to": next_state,
                        "server_message": data.get("message"),
                    })
                else:
                    log("INFO", f"License state changed to {next_state}", {
                        "from": previous_state,
                        "to": next_state,
                    })

                with _state_lock:
                    _last_state = next_state

                # Fire the appropriate callback.
                if next_state in _INACTIVE_STATES and previous_state not in _INACTIVE_STATES:
                    on_stop and on_stop(data)
                elif next_state == LicenseState.ACTIVE and previous_state in _INACTIVE_STATES:
                    on_recover and on_recover(data)
                elif next_state == LicenseState.ACTIVE:
                    on_start and on_start(data)

        except Exception as e:
            log("WARN", "License check failed — keeping app running", {"error": str(e)})

            # Network/protocol failure on startup: transition out of
            # PENDING_VALIDATION so the guard definitively blocks requests.
            with _state_lock:
                previous_state = _last_state
                if previous_state == LicenseState.PENDING_VALIDATION:
                    _last_state = LicenseState.REVOKED
                    entered_inactive = True
                else:
                    entered_inactive = False

            if previous_state == LicenseState.PENDING_VALIDATION:
                log(
                    "ERROR",
                    "License daemon could not reach the server on startup — requests will be rejected with 402 until the server is reachable",
                    {"from": LicenseState.PENDING_VALIDATION, "to": LicenseState.REVOKED},
                )

            if entered_inactive:
                on_stop and on_stop({
                    "valid": False,
                    "status": LicenseState.REVOKED,
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
    stop_event.set()
    log("INFO", "License daemon stopped")


# --------------------
# FastAPI License Guard
# --------------------

def license_guard(bypass_paths=None):
    """Return a FastAPI dependency that rejects every request with
    HTTP 402 when the current license state is not VALID.

    Read-only — never mutates state. Customers can mount this as a
    dependency on individual routes or globally via FastAPI middleware.
    `protect_fastapi_app` registers it as middleware automatically.

    `bypass_paths` is an optional set of path prefixes that skip the
    guard (defaults are `/health` and `/license/status`, always included).
    """
    try:
        from fastapi import Request
        from fastapi.responses import JSONResponse
    except ImportError:
        raise ImportError(
            "license_guard requires FastAPI. `pip install fastapi` to use it."
        )

    allowed_paths = set(DEFAULT_BYPASS_PATHS)
    if bypass_paths:
        allowed_paths.update(bypass_paths)

    async def _guard(request: Request):
        state = get_license_state()
        # Only ACTIVE lets traffic through. All other states —
        # PENDING_VALIDATION (cold start), PENDING (not yet activated),
        # REVOKED, EXPIRED — result in a 402. There is no UNKNOWN state:
        # transient/unrecognised server responses keep the previous
        # state rather than transitioning to a synthetic blocking state.
        if state == LicenseState.ACTIVE:
            return None
        if _matches_bypass(request.url.path, allowed_paths):
            return None
        return JSONResponse(
            status_code=402,
            content={
                "error": "LICENSE_INACTIVE",
                "state": state,
                "message": "Please pay your developer",
                "renewContact": "support@keybox.dev",
            },
        )

    return _guard


# --------------------
# FastAPI Protector
# --------------------

def protect_fastapi_app(
    *,
    app,
    product_name: str,
    key: str,
    api_url: str = "https://api-keybox.vercel.app",
    bypass_paths=None,
):
    from fastapi import FastAPI

    if not app or not isinstance(app, FastAPI):
        raise ValueError("FastAPI app instance is required")

    # Avoid duplicate activation on cold start: if the server already
    # confirms this (machineId, instanceId) is active, skip the
    # /validate/activate call entirely and go straight to the daemon.
    #
    # We deliberately do NOT raise on activation failure. If the
    # license is already revoked, the server will refuse to activate
    # — but the app should still come up so the guard can serve 402
    # responses and so that, once the customer pays, the next daemon
    # tick flips state back to VALID without a restart.
    try:
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
    except LicenseAlreadyActivatedError as e:
        log("ERROR", "License is already activated on another device. Requests will be rejected with 402 until this is resolved.", {
            "reason": str(e),
        })
    except Exception as e:
        log("ERROR", "Failed to activate license. Starting the app anyway — requests will be rejected with 402 until activation succeeds.", {
            "reason": str(e),
        })

    # Register the guard as middleware FIRST so customer routes are
    # protected automatically. The guard is read-only; the daemon just
    # feeds the state manager. No process kill on inactive state.
    guard = license_guard(bypass_paths=bypass_paths)
    app.middleware("http")(guard)

    @app.on_event("startup")
    def _keybox_start():
        start_license_daemon(
            product_name=product_name,
            key=key,
            api_url=api_url,
            on_start=lambda _: log("INFO", "App unlocked"),
            on_stop=lambda data: log(
                "ERROR",
                f"License {data.get('status', 'invalid').upper()} — requests will be rejected with 402",
                data,
            ),
            on_recover=lambda _: log("INFO", "License recovered — requests resumed"),
        )

    @app.on_event("shutdown")
    def _keybox_stop():
        stop_license_daemon()
