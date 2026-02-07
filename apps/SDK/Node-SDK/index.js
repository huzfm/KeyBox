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

    const res = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, productName }),
    });

    let data;
    try {
        data = await res.json();
    } catch {
        throw new Error("License server did not return JSON");
    }

    if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "License activation failed");
    }

    log("INFO", "License activated");
    return data;
}

const DEFAULT_INTERVAL = 900; //15 min


// LICENSE DAEMON                                       

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

            let data;
            try {
                data = await res.json();
            } catch {
                throw new Error("Non-JSON response");
            }
            const isRevoked = data.valid === false && data.status !== "error" && data.status !== "server_error";

            if (isRevoked && lastState !== "invalid") {
                lastState = "invalid";
                log("ERROR", "License revoked", data);
                onRevoke && onRevoke(data);
                return;
            }


            lastState = data.valid === true ? "valid" : "unknown";
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

/* STOP DAEMON                                           */

export function stopLicenseDaemon() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    log("INFO", "License daemon stopped");
}

// main function for SDK usage
export async function protectNodeApp({ app, port, productName, key, apiUrl }) {
    if (!app) throw new Error("Express app instance is required");
    if (!port) throw new Error("port is required");

    //  Activation = permission to start
    await activateLicense({ productName, key, apiUrl });

    // ALWAYS START SERVER
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
                log("INFO", "Server closed gracefully. Exiting...");
                process.exit(1);
            });
        },
    });
}
