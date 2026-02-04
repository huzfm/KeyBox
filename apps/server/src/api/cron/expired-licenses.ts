import type { VercelRequest, VercelResponse } from "@vercel/node";
import { License, Status } from "../../models/License";
import { connectDB } from "../../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers["x-vercel-cron"] !== "1") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await connectDB();

    const now = new Date();

    const result = await License.updateMany(
      {
        expiresAt: { $lt: now },
        status: Status.ACTIVE,
      },
      {
        $set: { status: Status.EXPIRED },
      },
    );

    console.log(`Updated expired licenses: ${result.modifiedCount}`);

    res.status(200).json({
      success: true,
      updated: result.modifiedCount,
    });
  } catch (error) {
    console.error("Cron error:", error);
    res.status(500).json({ error: "Cron failed" });
  }
}
