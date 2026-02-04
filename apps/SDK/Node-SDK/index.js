

let intervalId = null;
let lastState = "unknown";

function log(level, message, meta = {}) {
    const time = new Date().toISOString();
    console.log(
        `[${time}] [KEYBOX] [${level}] ${message}`,
        Object.keys(meta).length ? meta : ""
    );
}

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

    const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, productName }),
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        throw new Error("License server did not return JSON");
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || "License activation failed");
    }

    log("INFO", "License activated", {
        status: data.status,
        expiresAt: data.expiresAt,
    });

    return data;
}

export async function startLicenseDaemon({
    productName,
    key,
    apiUrl = "https://api-keybox.vercel.app",
    endpoint = "/validate",
    intervalSeconds = 86400,
    onStart,
    onStop,
}) {
    if (!productName || !key) {
        throw new Error("productName and key are required");
    }

    async function validateOnce() {
        log("INFO", "Validating license", { productName });

        try {
            const response = await fetch(`${apiUrl}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key, productName }),
            });

            const contentType = response.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) {
                throw new Error("License server did not return JSON");
            }

            const data = await response.json();
            const currentState = data.valid ? "valid" : "invalid";

            if (currentState !== lastState) {
                log("INFO", "License state changed", {
                    from: lastState,
                    to: currentState,
                    status: data.status,
                });

                lastState = currentState;

                if (currentState === "valid") {
                    onStart && onStart(data);
                } else {
                    onStop && onStop(data);
                }
            }
        } catch (err) {
            log("ERROR", "License validation error", { error: err.message });

            if (lastState !== "invalid") {
                lastState = "invalid";
                onStop &&
                    onStop({
                        valid: false,
                        status: "error",
                        message: err.message,
                    });
            }
        }
    }

    await validateOnce();

    intervalId = setInterval(validateOnce, intervalSeconds * 1000);

    log("INFO", "License daemon started", { intervalSeconds });
}

export function stopLicenseDaemon() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        lastState = "unknown";
        log("INFO", "License daemon stopped");
    }
}

export async function protectNodeApp({
    app,
    port,
    productName,
    key,
    apiUrl,
    intervalSeconds = 86400,
}) {
    if (!app) throw new Error("Express app instance is required");
    if (!port) throw new Error("port is required");

    let server = null;

    await activateLicense({ productName, key, apiUrl });

    await startLicenseDaemon({
        productName,
        key,
        apiUrl,
        intervalSeconds,

        onStart: () => {
            if (!server) {
                server = app.listen(port, () => {
                    console.log(`Licensed app running at http://localhost:${port}`);
                });
            }
        },

        onStop: (data) => {
            console.error("License invalid → shutting down app", data);

            if (server) {
                server.close(() => process.exit(1));
            } else {
                process.exit(1);
            }
        },
    });
}