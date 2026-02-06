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
              const { duration, clientId, projectId, services } = req.body;

              if (!duration || duration < 1 || duration > 12)
                     return res
                            .status(400)
                            .json({ message: "Invalid duration" });

              if (!clientId || !projectId)
                     return res
                            .status(400)
                            .json({ message: "Client & Project required" });

              const issuedAt = new Date();
              const expiresAt = new Date();
              expiresAt.setMonth(issuedAt.getMonth() + duration);

              const key = generateKey(projectId);

              const license = await License.create({
                     key,
                     duration,
                     issuedAt,
                     expiresAt,
                     status: Status.PENDING,
                     services: services || ["Hosting"],
                     user: req.userId!,
                     client: clientId,
                     project: projectId,
              });

              res.status(201).json({
                     message: "License created",
                     license,
              });
       } catch (error) {
              res.status(500).json({ error: (error as Error).message });
       }
};

export const toggleLicense = async (req: Request, res: Response) => {
       try {
              const key = req.params.key;

              if (!key)
                     return res
                            .status(400)
                            .json({ message: "License key is required" });

              const license = await License.findOne({ key });
              if (!license)
                     return res
                            .status(404)
                            .json({ message: "License not found" });

              license.status =
                     license.status === Status.ACTIVE
                            ? Status.REVOKED
                            : Status.ACTIVE;

              await license.save();

              return res.json({
                     message: `License status changed to ${license.status}`,
                     key: license.key,
                     status: license.status,
              });
       } catch (error: any) {
              return res
                     .status(500)
                     .json({
                            message: "Failed to toggle status",
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

export const test = async (req: AuthRequest, res: Response) => {
       try {
              const user = await User.findById(req.userId).select("-password");
              const licenses = await License.find({ user: req.userId });

              return res.json({ user, licenses });
       } catch (error) {
              console.error(error);
              res.status(500).json({ message: "Server Error" });
       }
};

export const getUserWithLicenses = async (req: AuthRequest, res: Response) => {
       try {
              const userId = req.params.id || req.userId;

              if (!userId) {
                     return res
                            .status(400)
                            .json({ message: "User ID is required" });
              }

              const user = await User.findById(userId)
                     .select("-password_hash")
                     .populate("licenses");

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
