import { Request, Response } from "express";
import { License, Status } from "../models/License";

export const validateLicense = async (req: Request, res: Response) => {
       try {
              const { key } = req.body;

              if (!key) {
                     return res.status(400).json({
                            valid: false,
                            message: "License key is required",
                     });
              }

              const license = await License.findOne({ key });

              if (!license) {
                     return res.json({
                            valid: false,
                            status: "invalid",
                            message: "Key does not exist",
                     });
              }

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

              if (license.status === Status.EXPIRED) {
                     return res.json({
                            valid: false,
                            status: "expired",
                            message: "License has expired",
                            expiresAt: license.expiresAt,
                     });
              }

              if (license.status === Status.ACTIVE) {
                     const now = new Date();
                     if (now > license.expiresAt) {
                            license.status = Status.EXPIRED;
                            await license.save();
                            return res.json({
                                   valid: false,
                                   status: "expired",
                                   message: "License has expired",
                                   expiresAt: license.expiresAt,
                            });
                     }

                     return res.json({
                            valid: true,
                            status: "active",
                            duration: `${license.duration} months`,
                            expiresAt: license.expiresAt,
                     });
              }

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

              const issuedAt = new Date();
              const expiresAt = new Date();
              expiresAt.setMonth(expiresAt.getMonth() + license.duration);

              license.status = Status.ACTIVE;
              license.issuedAt = issuedAt;
              license.expiresAt = expiresAt;

              await license.save();

              return res.json({
                     success: true,
                     message: "License activated successfully",
                     activatedAt: issuedAt,
                     expiresAt,
              });
       } catch (error) {
              return res.status(500).json({
                     success: false,
                     message: "Activation failed",
                     error: (error as Error).message,
              });
       }
};
