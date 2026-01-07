/* -------------------------------------------------------
   KeyBox License SDK (Node.js)
   Features:
   - activateLicense()  → one-time activation
   - startLicenseDaemon() → continuous validation
   - stopLicenseDaemon()  → stop background checks
-------------------------------------------------------- */

let intervalId = null;
let lastState = "unknown"; // "valid" | "invalid" | "unknown"

function log(level, message, meta = {}) {
      const time = new Date().toISOString();
      console.log(
            `[${time}] [KEYBOX] [${level}] ${message}`,
            Object.keys(meta).length ? meta : ""
      );
}

/* =======================================================
   🔐 ACTIVATE LICENSE (first time)
======================================================= */
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
            body: JSON.stringify({ key, productName })
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
            expiresAt: data.expiresAt
      });

      return data;
}

/* =======================================================
   🔁 LICENSE DAEMON (continuous validation)
======================================================= */
export async function startLicenseDaemon({
      productName,
      key,
      apiUrl = "http://api-keybox.vercel.app",
      endpoint = "/validate",
      intervalSeconds = 86400, // default 24h
      onStart,   // when becomes valid
      onStop     // when becomes invalid
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
                        body: JSON.stringify({ key, productName })
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
                              status: data.status
                        });

                        lastState = currentState;

                        if (currentState === "valid") {
                              log("INFO", "License valid → starting app");
                              onStart && onStart(data);
                        } else {
                              log("ERROR", "License invalid → stopping app", {
                                    status: data.status,
                                    message: data.message
                              });
                              onStop && onStop(data);
                        }
                  }

            } catch (err) {
                  log("ERROR", "License validation error", { error: err.message });

                  if (lastState !== "invalid") {
                        lastState = "invalid";
                        onStop && onStop({
                              valid: false,
                              status: "error",
                              message: err.message
                        });
                  }
            }
      }

      // initial check
      await validateOnce();

      // scheduler
      intervalId = setInterval(validateOnce, intervalSeconds * 1000);

      log("INFO", "License daemon started", { intervalSeconds });
}

/* =======================================================
   🛑 STOP DAEMON
======================================================= */
export function stopLicenseDaemon() {
      if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            lastState = "unknown";
            log("INFO", "License daemon stopped");
      }
}
