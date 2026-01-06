let intervalId = null;

function log(level, message, meta = {}) {
      const time = new Date().toISOString();
      console.log(
            `[${time}] [LICENSE] [${level}] ${message}`,
            Object.keys(meta).length ? meta : ""
      );
}

export async function startLicenseGuard({
      productName,
      key,
      apiUrl = "http://api-keybox.vercel.app",
      endpoint = "/validate",
      intervalHours = 24,
      onValid,
      onInvalid
}) {
      if (!productName || !key) {
            throw new Error("productName and key are required");
      }

      async function validateOnce() {
            log("INFO", "Starting license validation", { productName });

            try {
                  const response = await fetch(`${apiUrl}${endpoint}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ productName, key })
                  });

                  const data = await response.json();

                  if (!data.valid) {
                        log("ERROR", "License validation failed", {
                              status: data.status,
                              message: data.message
                        });

                        if (onInvalid) onInvalid(data);
                        return;
                  }

                  log("INFO", "License validation successful", {
                        expiresAt: data.expiresAt
                  });

                  if (onValid) onValid(data);

            } catch (err) {
                  log("ERROR", "License validation error", {
                        error: err.message
                  });

                  if (onInvalid) {
                        onInvalid({
                              valid: false,
                              status: "error",
                              message: err.message
                        });
                  }
            }
      }

      // 🔐 Initial validation
      await validateOnce();

      // ⏰ Schedule periodic validation
      const intervalMs = intervalHours * 60 * 60 * 1000;

      log("INFO", "Scheduled recurring license validation", {
            everyHours: intervalHours
      });

      intervalId = setInterval(validateOnce, intervalMs);
}

export function stopLicenseGuard() {
      if (intervalId) {
            clearInterval(intervalId);
            log("INFO", "License guard stopped");
            intervalId = null;
      }
}
