import { Request, Response } from "express";
import { License, Status } from "../models/License";
import { generateKey } from "../utils/genratekey";
import { User } from "../models/User";
import { AuthRequest } from "./../middleware/jwt";

interface LicenseBody {
  productName: string;
  customer: string;
  duration: number;
}

export const createLicense = async (req: AuthRequest, res: Response) => {
  try {
    const { productName, customer, duration } = req.body;

    // Basic Validation
    if (!productName)
      return res.status(400).json({ message: "Product name is required" });

    if (!customer)
      return res.status(400).json({ message: "Customer is required" });

    if (!duration || duration < 1 || duration > 12)
      return res
        .status(400)
        .json({ message: "Duration must be between 1-12 months" });

    // Must come from JWT
    if (!req.userId)
      return res.status(401).json({ message: "User not authenticated" });

    const issuedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(issuedAt.getMonth() + duration);

    const key = generateKey(productName);

    const license = await License.create({
      key,
      productName,
      customer,
      duration,
      issuedAt,
      expiresAt,
      status: Status.ACTIVE,
      user: req.userId, // <-- JWT extracted user
    });

    return res.status(201).json({
      message: "License Created Successfully",
      licenseKey: license.key,
      productName,
      customer,
      duration,
      expiresAt,
      status: license.status,
      userId: req.userId,
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
    // Accept key from params, query, or body
    const key = req.params.key ?? req.query.key ?? req.body.key;

    if (!key) {
      return res.status(400).json({ message: "License key is required" });
    }

    const license = await License.findOne({ key });

    if (!license) {
      return res.status(404).json({ message: "License not found" });
    }

    if (license.status === Status.REVOKED) {
      return res.status(409).json({ message: "License is already revoked" });
    }

    license.status = Status.REVOKED;
    await license.save();

    return res.json({
      message: "License successfully revoked",
      key: license.key,
      status: license.status,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to revoke license",
      error: error.message,
    });
  }
};

export const getUsersAndLicenses = async (req: Request, res: Response) => {
  try {
    const users = await User.find().populate("licenses").exec();
    return res.json({
      users,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve users and licenses",
      error: (error as Error).message,
    });
  }
};

export const getUserWithLicenses = async (req: AuthRequest, res: Response) => {
  try {
    // Get user id from token or params
    const userId = req.params.id || req.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId)
      .select("-password_hash") // don't return password hash
      .populate("licenses"); // populate virtual licenses

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const licenseCount = user.licenses?.length || 0;

    return res.json({
      message: "User details successfully retrieved",
      user,
      licenseCount,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch user and licenses",
      error: (error as Error).message,
    });
  }
};
