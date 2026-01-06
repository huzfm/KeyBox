import type { VercelRequest, VercelResponse } from "@vercel/node";
import { License, Status } from "../models/License";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ❌ Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({
      valid: false,
      message: "Method not allowed",
    });
  }

  try {
    const { key } = req.body;

    // ❌ Missing key
    if (!key) {
      return res.status(400).json({
        valid: false,
        message: "License key is required",
      });
    }

    // 🔎 Find license
    const license = await License.findOne({ key });

    if (!license) {
      return res.json({
        valid: false,
        status: "invalid",
        message: "Key does not exist",
      });
    }

    // ❌ Revoked
    if (license.status === Status.REVOKED) {
      return res.json({
        valid: false,
        status: "revoked",
        message: "License revoked by developer",
      });
    }

    // ❌ Expired
    if (license.status === Status.EXPIRED) {
      return res.json({
        valid: false,
        status: "expired",
        message: "License has expired",
        expiresAt: license.expiresAt,
      });
    }

    // ✅ Active
    return res.json({
      valid: true,
      status: "active",
      expiresAt: license.expiresAt,
    });
  } catch (error) {
    return res.status(500).json({
      valid: false,
      status: "error",
      message: "Validation failed",
      error: (error as Error).message,
    });
  }
}
