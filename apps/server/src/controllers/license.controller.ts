import { Request, Response } from "express"
import { License, Status } from "../models/License"
import { invalidateCachedLicense } from "../cache/license.cache"

interface LicenseBody {
     productName: string
     customer: string
     duration: number
}

export const toggleLicense = async (req: Request, res: Response) => {
     try {
          const key = req.params.key

          if (!key)
               return res
                    .status(400)
                    .json({ message: "License key is required" })

          const license = await License.findOne({ key })
          if (!license)
               return res.status(404).json({ message: "License not found" })

          if (license.status == Status.EXPIRED)
               return res.status(400).json({
                    message: "State of expired licenses cannot be changed",
               })

          license.status =
               license.status === Status.ACTIVE ? Status.REVOKED : Status.ACTIVE

          await license.save()

          //  Invalidate cache because state CHANGED
          await invalidateCachedLicense(key)

          return res.json({
               message: `License status changed to ${license.status}`,
               key: license.key,
               status: license.status,
          })
     } catch (error: any) {
          return res.status(500).json({
               message: "Failed to toggle status",
               error: error.message,
          })
     }
}
