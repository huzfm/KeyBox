import express from "express";
import { validateLicense } from "../SDK/index.js";

const app = express();
const PORT = 4000;

async function startServer() {
      try {
            console.log("🔐 Validating license...");

            const license = await validateLicense({
                  productName: "my-node-app",
                  key: "TES-F853-274B-0B7E"
            });

            if (!license.valid) {
                  // ✅ USE BACKEND MESSAGE
                  console.error(`License error: ${license.message || "Invalid license"} ${license.status}`);
                  process.exit(1);
            }

            console.log("✅ License valid until:", license.expiresAt);

            app.get("/", (req, res) => {
                  res.send("Hello! App is running with a valid license.");
            });

            app.listen(PORT, () => {
                  console.log(`🚀 Express server running on http://localhost:${PORT}`);
            });

      } catch (err) {
            console.error("❌ License validation failed:", err.message);
            process.exit(1);
      }
}

startServer();
