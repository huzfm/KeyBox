import "dotenv/config"
import { License, Status } from "./models/License"
import { connectDB } from "./lib/db"
import { invalidateCachedLicense } from "./cache/license.cache"

async function expireLicenses() {
        try {
                console.log(" Running license expiration job...")

                await connectDB()

                const now = new Date()

                // Find ACTIVE licenses that are past expiry
                const expiredLicenses = await License.find({
                        expiresAt: { $lt: now },
                        status: Status.ACTIVE,
                }).select("key")

                if (!expiredLicenses.length) {
                        console.log("✅ No licenses to expire")
                        process.exit(0)
                }

                // Update MongoDB
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

                process.exit(0)
        } catch (error) {
                console.error(" Expiration job failed:", error)
                process.exit(1)
        }
}

// Run manually
expireLicenses()

/*
run this script
 pnpm exec ts-node-dev --transpile-only src/cron.ts
 */
