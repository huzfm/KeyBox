import { Request, Response } from "express";
import { License, Status } from "../models/License";

export const validateLicense = async (req: Request, res: Response) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res
        .status(400)
        .json({ valid: false, message: "License key is required" });
    }

    const license = await License.findOne({ key });

    // ❌ No license found
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
    const now = new Date();
    if (now > license.expiresAt) {
      return res.json({
        valid: false,
        status: "expired",
        message: "License has expired",
      });
    }

    // ✅ Valid license
    return res.json({
      valid: true,
      status: "active",
      productName: license.productName,
      customer: license.customer,
      duration: `${license.duration} months`,
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
};
