import type { VercelRequest, VercelResponse } from "@vercel/node"
import { License, Status } from "../../models/License"
import { connectDB } from "../../lib/db"
import { invalidateCachedLicense } from "../../cache/license.cache"

export default async function handler(req: VercelRequest, res: VercelResponse) {
        if (req.headers["x-vercel-cron"] !== "1") {
                return res.status(401).json({ error: "Unauthorized" })
        }

        try {
                await connectDB()

                const now = new Date()

                // Find licenses that SHOULD expire
                const expiredLicenses = await License.find({
                        expiresAt: { $lt: now },
                        status: Status.ACTIVE,
                }).select("key")

                if (!expiredLicenses.length) {
                        return res.status(200).json({
                                success: true,
                                updated: 0,
                        })
                }

                //  Update DB
                await License.updateMany(
                        { key: { $in: expiredLicenses.map((l) => l.key) } },
                        { $set: { status: Status.EXPIRED } },
                )

                // Invalidate Redis cache
                for (const license of expiredLicenses) {
                        await invalidateCachedLicense(license.key)
                }

                console.log(
                        `Expired licenses updated: ${expiredLicenses.length}`,
                )

                res.status(200).json({
                        success: true,
                        updated: expiredLicenses.length,
                })
        } catch (error) {
                console.error("Cron error:", error)
                res.status(500).json({ error: "Cron failed" })
        }
}
