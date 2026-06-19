import fetch from "node-fetch";
import { randomUUID } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

let intervalId = null;
let lastState = "unknown";

function log(level, message, meta = {}) {
    const time = new Date().toISOString();
    console.log(
        `[${time}] [KEYBOX] [${level}] ${message}`,
        meta && Object.keys(meta).length ? JSON.stringify(meta) : ""
    );
}

// Thrown when the server confirms the license is already bound to a
// different (machineId, instanceId) pair. Consumers can catch this to
// show a friendlier message and avoid persisting any local state.
export class LicenseAlreadyActivatedError extends Error {
    constructor(message) {
        super(message);
        this.name = "LicenseAlreadyActivatedError";
        this.code = "LICENSE_ALREADY_ACTIVATED";
    }
}

// Returns the on-disk instance id, or null if none exists yet.
// We deliberately do NOT generate + persist on the first call — the
// id is only written to disk after the server confirms activation.
function readStoredInstanceId() {
    const filePath = join(process.cwd(), ".instance-id");
    try {
        return readFileSync(filePath, "utf8").trim() || null;
    } catch {
        return null;
    }
}

// Persists the given id to <cwd>/.instance-id. Uses an exclusive-create
// flag so a concurrent process can't clobber its own id with ours.
function persistInstanceId(id) {
    const filePath = join(process.cwd(), ".instance-id");
    try {
        writeFileSync(filePath, id, { encoding: "utf8", flag: "wx" });
    } catch (err) {
        if (err && err.code === "EEXIST") {
            // Someone (another instance, or a previous successful run)
            // already wrote a file. Leave it as-is.
            return;
        }
        // Other I/O errors: re-read to confirm what's on disk.
        const existing = readStoredInstanceId();
        if (existing !== id) {
            // Different content — don't clobber, just log.
            log("WARN", "Could not persist .instance-id; keeping existing value", {
                path: filePath,
            });
        }
    }
}

// Returns a usable instance id for an outgoing request: the stored one
// if present, otherwise a fresh candidate that has NOT been written to
// disk yet. The caller is responsible for calling persistInstanceId()
// once the server confirms activation.
function getCandidateInstanceId() {
    return readStoredInstanceId() || randomUUID();
}

// Read-only check: ask the server whether the license is already
// activated for the (machineId, instanceId) we'd be sending. Returns
// `{ status, active, data }` where `active` is true ONLY when the
// server says `valid: true` AND status === "active" for the stored
// instance id. Callers use this to decide whether activation is
// actually needed on cold start.
export async function checkLicenseStatus({
    productName,
    key,
    apiUrl = "http://localhost:5000",
    endpoint = "/validate",
}) {
    if (!productName || !key) {
        throw new Error("productName and key are required");
    }

    const instanceId = readStoredInstanceId();

    // No .instance-id on disk → never activated from this app, so
    // there's nothing the server can confirm. Caller should activate.
    if (!instanceId) {
        return {
            status: "not_activated",
            active: false,
            data: null,
        };
    }

    log("INFO", "Checking license status", { productName });

    const res = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, productName, instanceId }),
    });

    const data = await res.json().catch(() => null);

    const statusLower = (data?.status || "unknown").toLowerCase();
    const isActive = data?.valid === true && statusLower === "active";

    return {
        status: statusLower,
        active: isActive,
        data,
    };
}


export async function activateLicense({
    productName,
    key,
    apiUrl = "http://localhost:5000",
    endpoint = "/validate/activate",
}) {
    if (!productName || !key) {
        throw new Error("productName and key are required");
    }

    const instanceId = getCandidateInstanceId();

    log("INFO", "Activating license", { productName });

    const res = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, productName, instanceId }),
    });

    const data = await res.json().catch(() => {
        throw new Error("License server did not return JSON");
    });

    if (!res.ok || data?.success === false) {
        const message = data?.message || "License activation failed";

        // Distinguish "bound to a different instance" from generic failure
        // so the consuming app can show a clearer message.
        if (
            res.status === 403 &&
            typeof message === "string" &&
            message.toLowerCase().includes("another instance")
        ) {
            throw new LicenseAlreadyActivatedError(message);
        }

        throw new Error(message);
    }

    // Server accepted this (machineId, instanceId) pair. Safe to commit
    // the id to disk now — only on a real success do we make it sticky.
    if (!readStoredInstanceId()) {
        persistInstanceId(instanceId);
    }

    log("INFO", "License activated");
    return data;
}


const DEFAULT_INTERVAL = 900; // 15 minutes

export async function startLicenseDaemon({
    productName,
    key,
    apiUrl = "http://localhost:5000",
    endpoint = "/validate",
    onRevoke,
}) {
    if (!productName || !key) {
        throw new Error("productName and key are required");
    }

    // Daemon is read-only: never generate a new id here. If none is on
    // disk and none was bound by an earlier activation, every /validate
    // call would 400 (server requires instanceId) — that's the right
    // signal: the user must run activation first.
    const instanceId = readStoredInstanceId();

    async function validateOnce() {
        log("INFO", "Validating license", { productName });

        if (!instanceId) {
            log("WARN", "No .instance-id on disk — run activation first");
            return;
        }

        try {
            const res = await fetch(`${apiUrl}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key, productName, instanceId }),
            });

            const data = await res.json().catch(() => {
                throw new Error("Non-JSON response from license server");
            });

            const statusLower = (data.status || "unknown").toLowerCase();
            const terminalStatuses = ["revoked", "expired", "invalid"];

            const isTerminal =
                data.valid === false && terminalStatuses.includes(statusLower);

            if (isTerminal && lastState !== "invalid") {
                lastState = "invalid";
                log("ERROR", `License ${statusLower.toUpperCase()} — shutting down`, data);
                onRevoke?.(data);
                return;
            }

            if (data.valid === true) {
                lastState = "valid";
            } else if (statusLower === "server_error" || statusLower === "error") {
                log("WARN", "Server error — keeping app running");
                lastState = "unknown";
            } else {
                lastState = "unknown";
            }
        } catch (err) {
            log("WARN", "License check failed — keeping app running", {
                error: err.message,
            });
        }
    }

    await validateOnce();

    if (lastState === "invalid") return;

    intervalId = setInterval(validateOnce, DEFAULT_INTERVAL * 1000);

    log("INFO", "License daemon started", {
        intervalSeconds: DEFAULT_INTERVAL,
    });
}


export function stopLicenseDaemon() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    log("INFO", "License daemon stopped");
}


export async function protectNodeApp({
    app,
    port,
    productName,
    key,
    apiUrl,
}) {
    if (!app) throw new Error("Express app instance is required");
    if (!port) throw new Error("port is required");

    // Avoid duplicate activation on cold start: if the server already
    // confirms this (machineId, instanceId) is active, skip the
    // /validate/activate call entirely and go straight to the daemon.
    try {
        const status = await checkLicenseStatus({ productName, key, apiUrl });
        if (status.active) {
            log("INFO", "License already active on this instance — skipping activation", {
                status: status.status,
            });
        } else {
            log("INFO", "License not active — activating", { status: status.status });
            await activateLicense({ productName, key, apiUrl });
        }
    } catch (err) {
        if (err instanceof LicenseAlreadyActivatedError) {
            log("ERROR", "License is already activated on another device. App will not start.", {
                reason: err.message,
            });
        } else {
            log("ERROR", "Failed to activate license. App will not start.", {
                reason: err.message,
            });
        }
        throw err;
    }

    const server = app.listen(port, () => {
        log("INFO", `Licensed app running at http://localhost:${port}`);
    });

    await startLicenseDaemon({
        productName,
        key,
        apiUrl,
        onRevoke: () => {
            log("ERROR", "License revoked — shutting down app");
            stopLicenseDaemon();

            const forceExit = setTimeout(() => {
                log("WARN", "Forcing process exit...");
                process.exit(1);
            }, 1000);

            server.close(() => {
                clearTimeout(forceExit);
                log("INFO", "Server closed gracefully");
                process.exit(1);
            });
        },
    });
}
