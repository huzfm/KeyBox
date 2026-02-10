import fetch from "node-fetch";

let intervalId = null;
let lastState = "unknown";

function log(level, message, meta = {}) {
    const time = new Date().toISOString();
    console.log(
        `[${time}] [KEYBOX] [${level}] ${message}`,
        meta && Object.keys(meta).length ? JSON.stringify(meta) : ""
    );
}

/* ---------------- ACTIVATE LICENSE ---------------- */

export async function activateLicense({
    productName,
    key,
    apiUrl = "https://api-keybox.vercel.app",
    endpoint = "/validate/activate",
}) {
    if (!productName || !key) {
        throw new Error("productName and key are required");
    }

    log("INFO", "Activating license", { productName });

    const res = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, productName }),
    });

    const data = await res.json().catch(() => {
        throw new Error("License server did not return JSON");
    });

    if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "License activation failed");
    }

    log("INFO", "License activated");
    return data;
}

/* ---------------- LICENSE DAEMON ---------------- */

const DEFAULT_INTERVAL = 900; // 15 minutes

export async function startLicenseDaemon({
    productName,
    key,
    apiUrl = "https://api-keybox.vercel.app",
    endpoint = "/validate",
    onRevoke,
}) {
    if (!productName || !key) {
        throw new Error("productName and key are required");
    }

    async function validateOnce() {
        log("INFO", "Validating license", { productName });

        try {
            const res = await fetch(`${apiUrl}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key, productName }),
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

/* ---------------- STOP DAEMON ---------------- */

export function stopLicenseDaemon() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    log("INFO", "License daemon stopped");
}

/* ---------------- MAIN WRAPPER ---------------- */

export async function protectNodeApp({
    app,
    port,
    productName,
    key,
    apiUrl,
}) {
    if (!app) throw new Error("Express app instance is required");
    if (!port) throw new Error("port is required");

    // Permission to start
    await activateLicense({ productName, key, apiUrl });

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
