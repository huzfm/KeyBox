import { Request, Response } from "express"
import { License, Status } from "../models/License"
import { getCachedLicense, setCachedLicense } from "../cache/license.cache"

export const validateLicense = async (req: Request, res: Response) => {
        try {
                const { key } = req.body

                if (!key) {
                        return res.status(400).json({
                                valid: false,
                                message: "License key is required",
                        })
                }

                // 🔹 1. Try Redis first
                const cached = await getCachedLicense(key)
                if (cached) {
                        console.log("REDIS HIT for license:", key)

                        // 1. If already marked as non-active in cache, return immediately
                        if (cached.status !== Status.ACTIVE) {
                                return res.json({
                                        valid: false,
                                        status: cached.status.toLowerCase(),
                                        message: cached.message,
                                        expiresAt: cached.expiresAt,
                                })
                        }

                        // 2. If marked as ACTIVE but date has passed, state is CHANGING to EXPIRED
                        if (
                                cached.expiresAt &&
                                new Date() > new Date(cached.expiresAt)
                        ) {
                                console.log(
                                        "STATE CHANGE DETECTED (Expired): Updating MongoDB",
                                )
                                const license = await License.findOneAndUpdate(
                                        { key },
                                        { status: Status.EXPIRED },
                                        { new: true },
                                )

                                if (license) {
                                        await setCachedLicense(key, {
                                                status: Status.EXPIRED,
                                                expiresAt: license.expiresAt,
                                                message: "License has expired",
                                        })
                                }

                                return res.json({
                                        valid: false,
                                        status: "expired",
                                        message: "License has expired",
                                        expiresAt: cached.expiresAt,
                                })
                        }

                        // 3. Otherwise, it's ACTIVE and still valid
                        return res.json({
                                valid: true,
                                status: "active",
                                duration: cached.duration,
                                expiresAt: cached.expiresAt,
                        })
                }
                console.log("MONGO HIT for license:", key)

                const license = await License.findOne({ key })

                if (!license) {
                        return res.json({
                                valid: false,
                                status: "invalid",
                                message: "Key does not exist",
                        })
                }

                if (license.status === Status.REVOKED) {
                        await setCachedLicense(key, {
                                status: Status.REVOKED,
                                message: "License revoked by developer",
                        })

                        return res.json({
                                valid: false,
                                status: "revoked",
                                message: "License revoked by developer",
                        })
                }

                if (license.status === Status.PENDING) {
                        await setCachedLicense(key, {
                                status: Status.PENDING,
                                message: "License has not been activated yet",
                        })

                        return res.json({
                                valid: false,
                                status: "pending",
                                message: "License has not been activated yet",
                        })
                }

                if (license.status === Status.EXPIRED) {
                        await setCachedLicense(key, {
                                status: Status.EXPIRED,
                                message: "License has expired",
                                expiresAt: license.expiresAt,
                        })

                        return res.json({
                                valid: false,
                                status: "expired",
                                message: "License has expired",
                                expiresAt: license.expiresAt,
                        })
                }

                if (license.status === Status.ACTIVE) {
                        const now = new Date()

                        if (now > license.expiresAt) {
                                license.status = Status.EXPIRED
                                await license.save()

                                return res.json({
                                        valid: false,
                                        status: "expired",
                                        message: "License has expired",
                                        expiresAt: license.expiresAt,
                                })
                        }

                        await setCachedLicense(key, {
                                status: Status.ACTIVE,
                                expiresAt: license.expiresAt,
                                duration: `${license.duration} months`,
                        })

                        return res.json({
                                valid: true,
                                status: "active",
                                duration: `${license.duration} months`,
                                expiresAt: license.expiresAt,
                        })
                }

                return res.json({
                        valid: false,
                        status: "unknown",
                        message: "Unknown license status",
                })
        } catch (error) {
                return res.status(500).json({
                        valid: null,
                        status: "server_error",
                        message: "Internal validation error",
                        error: (error as Error).message,
                })
        }
}

import { invalidateCachedLicense } from "../cache/license.cache"

export const activateLicense = async (req: Request, res: Response) => {
        try {
                const { key } = req.body

                if (!key) {
                        return res.status(400).json({
                                success: false,
                                message: "License key is required",
                        })
                }

                const license = await License.findOne({ key })

                if (!license) {
                        return res.status(404).json({
                                success: false,
                                message: "License not found",
                        })
                }

                if (license.status === Status.REVOKED) {
                        return res.status(403).json({
                                success: false,
                                message: "License has been revoked",
                        })
                }

                if (license.status === Status.EXPIRED) {
                        return res.status(403).json({
                                success: false,
                                message: "License has expired",
                        })
                }

                if (license.status === Status.ACTIVE) {
                        return res.json({
                                success: true,
                                message: "License already activated",
                                activatedAt: license.issuedAt,
                        })
                }

                const issuedAt = new Date()
                const expiresAt = new Date()
                expiresAt.setMonth(expiresAt.getMonth() + license.duration)

                license.status = Status.ACTIVE
                license.issuedAt = issuedAt
                license.expiresAt = expiresAt

                await license.save()

                await invalidateCachedLicense(key)

                return res.json({
                        success: true,
                        message: "License activated successfully",
                        activatedAt: issuedAt,
                        expiresAt,
                })
        } catch (error) {
                return res.status(500).json({
                        success: false,
                        message: "Activation failed",
                        error: (error as Error).message,
                })
        }
}
