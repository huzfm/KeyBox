import { Request, Response } from "express"
import { AuthRequest } from "../middleware/jwt"
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

export const renewLicense = async (req: AuthRequest, res: Response) => {
     try {
          const key = req.params.key

          if (!key)
               return res
                    .status(400)
                    .json({ message: "License key is required" })

          const license = await License.findOne({ key })
          if (!license)
               return res.status(404).json({ message: "License not found" })

          if (license.user.toString() !== req.userId)
               return res.status(403).json({ message: "Forbidden" })

          if (
               license.status !== Status.EXPIRED &&
               license.status !== Status.ACTIVE
          )
               return res.status(400).json({
                    message: "Only active or expired licenses can be renewed",
               })

          const { duration } = req.body as { duration?: number }

          if (
               duration !== undefined &&
               (typeof duration !== "number" || duration < 1 || duration > 12)
          )
               return res.status(400).json({ message: "Invalid duration" })

          const renewDuration = duration ?? license.duration

          const expiresAt = new Date()
          expiresAt.setMonth(expiresAt.getMonth() + renewDuration)

          license.duration = renewDuration
          license.expiresAt = expiresAt
          license.status = Status.ACTIVE

          await license.save()

          //  Invalidate cache because state CHANGED
          await invalidateCachedLicense(key)

          return res.json({
               message: "License renewed successfully",
               key: license.key,
               status: license.status,
               expiresAt: license.expiresAt,
          })
     } catch (error: any) {
          return res.status(500).json({
               message: "Failed to renew license",
               error: error.message,
          })
     }
}
