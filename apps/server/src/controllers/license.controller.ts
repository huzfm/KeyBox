import { Request, Response } from "express";
import { License, Status } from "../models/License";
import { generateKey } from "../utils/genratekey";

interface LicenseBody {
  productName: string;
  customer: string;
  duration: number;
}

export const createLicense = async (
  req: Request<LicenseBody>,
  res: Response
) => {
  try {
    const { productName, customer, duration } = req.body;

    // 🧾 Validations
    if (!productName) {
      return res.status(400).json({ message: "Product name is required" });
    }
    if (!customer) {
      return res.status(400).json({ message: "Customer is required" });
    }
    if (!duration || duration < 1 || duration > 12) {
      return res.status(400).json({
        message: "Duration must be 1 to 12 months",
      });
    }

    const issuedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(issuedAt.getMonth() + duration);

    // 🔑 Generate unique license key
    const key = generateKey(productName);

    const license = await License.create({
      key,
      productName,
      customer,
      duration,
      issuedAt,
      expiresAt,
      status: Status.ACTIVE,
    });

    return res.json({
      message: "License Created Successfully",
      productName,
      customer,
      key: license.key,
      duration: `${duration} month(s)`,
      expiresAt: license.expiresAt,
      status: license.status,
    });
  } catch (error) {
    return res.status(500).json({
      message: "License creation failed",
      error: (error as Error).message,
    });
  }
};

export const revokeLicense = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    if (!key)
      return res.status(400).json({ message: "License key is required" });

    const license = await License.findOne({ key });

    if (!license) return res.status(404).json({ message: "License not found" });

    if (license.status === Status.REVOKED)
      return res.status(400).json({ message: "License already revoked" });

    license.status = Status.REVOKED;
    await license.save();

    return res.json({
      message: "License status updated to REVOKED",
      key,
      status: license.status,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to revoke license",
      error: (error as Error).message,
    });
  }
};
