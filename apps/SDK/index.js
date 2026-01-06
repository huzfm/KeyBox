let intervalId = null;
let lastState = "unknown"; // "valid" | "invalid" | "unknown"

function log(level, message, meta = {}) {
      const time = new Date().toISOString();
      console.log(
            `[${time}] [LICENSE] [${level}] ${message}`,
            Object.keys(meta).length ? meta : ""
      );
}

export async function startLicenseDaemon({
      productName,
      key,
      apiUrl = "http://api-keybox.vercel.app",
      endpoint = "/validate",

      intervalSeconds = 5, // 24h default
      onStart,   // called when license becomes valid
      onStop     // called when license becomes invalid
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

                  // 🔁 STATE TRANSITION HANDLING
                  if (currentState !== lastState) {
                        log("INFO", "License state changed", {
                              from: lastState,
                              to: currentState,
                              status: data.status
                        });

                        lastState = currentState;

                        if (currentState === "valid") {
                              log("INFO", "License is valid → starting app");
                              onStart && onStart(data);
                        } else {
                              log("ERROR", "License is invalid → stopping app", {
                                    status: data.status,
                                    message: data.message
                              });
                              onStop && onStop(data);
                        }
                  } else {
                        log("INFO", "License state unchanged", { state: currentState });
                  }

            } catch (err) {
                  log("ERROR", "License validation error", { error: err.message });

                  // treat network / crash as invalid
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

      // 🔐 initial check
      await validateOnce();

      // ⏰ scheduler
      intervalId = setInterval(validateOnce, intervalSeconds * 1000);

      log("INFO", "License daemon started", {
            intervalSeconds
      });
}

export function stopLicenseDaemon() {
      if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            lastState = "unknown";
            log("INFO", "License daemon stopped");
      }
}
