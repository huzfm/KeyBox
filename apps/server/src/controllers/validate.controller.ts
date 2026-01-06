// // // controllers/validateLicense.ts
// // import { Request, Response } from "express";
// // import { License, Status } from "../models/License";

// // export const validateLicense = async (req: Request, res: Response) => {
// //   try {
// //     const { key } = req.body;

// //     // ❌ No key provided
// //     if (!key) {
// //       return res.status(400).json({
// //         valid: false,
// //         message: "License key is required",
// //       });
// //     }

// //     // 🔎 Check if key exists
// //     const license = await License.findOne({ key });

// //     if (!license) {
// //       return res.json({
// //         valid: false,
// //         status: "invalid",
// //         message: "Key does not exist",
// //       });
// //     }

// //     // ❌ Revoked
// //     if (license.status === Status.REVOKED) {
// //       return res.json({
// //         valid: false,
// //         status: "revoked",
// //         message: "License revoked by developer",
// //       });
// //     }

// //     // ❌ Expired (status set by cron job)
// //     if (license.status === Status.EXPIRED) {
// //       return res.json({
// //         valid: false,
// //         status: "expired",
// //         message: "License has expired",
// //         expiresAt: license.expiresAt,
// //       });
// //     }

// //     // 🟢 Valid and Active
// //     if (license.status === Status.ACTIVE) {
// //       return res.json({
// //         valid: true,
// //         status: "active",
// //         productName: license.productName,
// //         customer: license.customer,
// //         duration: `${license.duration} months`,
// //         expiresAt: license.expiresAt,
// //       });
// //     }

// //     // 🌀 Unknown/Unexpected status
// //     return res.json({
// //       valid: false,
// //       status: "unknown",
// //       message: "Unknown license status",
// //     });
// //   } catch (error) {
// //     return res.status(500).json({
// //       valid: false,
// //       status: "error",
// //       message: "Validation failed",
// //       error: (error as Error).message,
// //     });
// //   }
// // };

// import type { VercelRequest, VercelResponse } from "@vercel/node";
// import { License, Status } from "../models/License";

// export const validateLicense = async (
//   req: VercelRequest,
//   res: VercelResponse
// ) => {
//   if (req.method !== "POST") {
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   const { key } = req.body;

//   if (!key) {
//     return res.status(400).json({
//       valid: false,
//       message: "License key is required",
//     });
//   }

//   const license = await License.findOne({ key });

//   if (!license) {
//     return res.json({
//       valid: false,
//       status: "invalid",
//       message: "Key does not exist",
//     });
//   }

//   if (license.status === Status.REVOKED) {
//     return res.json({
//       valid: false,
//       status: "revoked",
//       message: "License revoked by developer",
//     });
//   }

//   if (license.status === Status.EXPIRED) {
//     return res.json({
//       valid: false,
//       status: "expired",
//       message: "License has expired",
//       expiresAt: license.expiresAt,
//     });
//   }

//   return res.json({
//     valid: true,
//     status: "active",
//     expiresAt: license.expiresAt,
//   });
// };
