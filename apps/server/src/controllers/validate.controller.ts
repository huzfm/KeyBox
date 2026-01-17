// controllers/validateLicense.ts
import { Request, Response } from "express";
import { License, Status } from "../models/License";

export const validateLicense = async (req: Request, res: Response) => {
  try {
    const { key } = req.body;

    // ❌ No key provided
    if (!key) {
      return res.status(400).json({
        valid: false,
        message: "License key is required",
      });
    }

    // 🔎 Check if key exists
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
    if (license.status === Status.PENDING) {
      return res.json({
        valid: false,
        status: "pending",
        message: "License has not been activated yet",
      });
    }

    // ❌ Expired (status set by cron job)
    if (license.status === Status.EXPIRED) {
      return res.json({
        valid: false,
        status: "expired",
        message: "License has expired",
        expiresAt: license.expiresAt,
      });
    }

    // 🟢 Valid and Active
    if (license.status === Status.ACTIVE) {
      return res.json({
        valid: true,
        status: "active",
        duration: `${license.duration} months`,
        expiresAt: license.expiresAt,
      });
    }

    // 🌀 Unknown/Unexpected status
    return res.json({
      valid: false,
      status: "unknown",
      message: "Unknown license status",
    });
  } catch (error) {
    return res.status(500).json({
      valid: false,
      status: "error",
      message: "Validation failed",
      error: (error as Error).message,
    });
  }
};

export const activateLicense = async (req: Request, res: Response) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: "License key is required",
      });
    }

    const license = await License.findOne({ key });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: "License not found",
      });
    }

    if (license.status === Status.REVOKED) {
      return res.status(403).json({
        success: false,
        message: "License has been revoked",
      });
    }

    if (license.status === Status.EXPIRED) {
      return res.status(403).json({
        success: false,
        message: "License has expired",
      });
    }

    if (license.status === Status.ACTIVE) {
      return res.json({
        success: true,
        message: "License already activated",
        activatedAt: license.issuedAt,
      });
    }

    // ✅ ACTIVATE
    license.status = Status.ACTIVE;
    license.issuedAt = new Date();

    await license.save();

    return res.json({
      success: true,
      message: "License activated successfully",
      activatedAt: license.issuedAt,
      expiresAt: license.expiresAt,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Activation failed",
      error: (error as Error).message,
    });
  }
};
