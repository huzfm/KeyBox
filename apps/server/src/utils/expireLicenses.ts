// cron/expireLicenses.ts
import cron from "node-cron";
import { License, Status } from "../models/License";

export async function expireLicenses() {
  try {
    console.log("Checking for licenses to expire...");

    const now = new Date();
    const result = await License.updateMany(
      {
        expiresAt: {
          $lt: now,
        },
        status: Status.ACTIVE,
      },
      {
        $set: {
          status: Status.EXPIRED,
        },
      }
    );

    console.log(`Updated expired licenses: ${result.modifiedCount}`);
  } catch (error) {
    console.error("Error running cron job:", (error as Error).message);
  }
}

cron.schedule("* * * * *", expireLicenses);
