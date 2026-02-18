import { invalidateCachedLicense } from "../cache/license.cache"
import { Request, Response } from "express"
import { License, Status } from "../models/License"
import { getCachedLicense, setCachedLicense } from "../cache/license.cache"
import { machineIdSync } from "node-machine-id"

export const validateLicense = async (req: Request, res: Response) => {
        try {
                const { key } = req.body

                if (!key) {
                        return res.status(400).json({
                                valid: false,
                                message: "License key is required",
                        })
                }

                // 🔐 Generate current machine ID
                const currentMachineId = machineIdSync(true)

                // 🔹 1. Try Redis first
                const cached = await getCachedLicense(key)
                if (cached) {
                        console.log("REDIS HIT for license:", key)

                        // 🚨 Machine mismatch
                        if (
                                cached.status === Status.ACTIVE &&
                                cached.machineId &&
                                cached.machineId !== currentMachineId
                        ) {
                                return res.json({
                                        valid: false,
                                        status: "machine_mismatch",
                                        message: "License is not valid for this machine",
                                })
                        }

                        if (cached.status !== Status.ACTIVE) {
                                return res.json({
                                        valid: false,
                                        status: cached.status.toLowerCase(),
                                        message: cached.message,
                                        expiresAt: cached.expiresAt,
                                })
                        }

                        if (
                                cached.expiresAt &&
                                new Date() > new Date(cached.expiresAt)
                        ) {
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
                                                machineId: license.machineId,
                                        })
                                }

                                return res.json({
                                        valid: false,
                                        status: "expired",
                                        message: "License has expired",
                                        expiresAt: cached.expiresAt,
                                })
                        }

                        return res.json({
                                valid: true,
                                status: "active",
                                duration: cached.duration,
                                expiresAt: cached.expiresAt,
                        })
                }

                // 🔹 2. MongoDB fallback
                console.log("MONGO HIT for license:", key)

                const license = await License.findOne({ key })

                if (!license) {
                        return res.json({
                                valid: false,
                                status: "invalid",
                                message: "Key does not exist",
                        })
                }

                // 🚨 Machine mismatch check (authoritative)
                if (
                        license.status === Status.ACTIVE &&
                        license.machineId !== currentMachineId
                ) {
                        return res.json({
                                valid: false,
                                status: "machine_mismatch",
                                message: "License is not valid for this machine",
                        })
                }

                if (license.status === Status.REVOKED) {
                        await setCachedLicense(key, {
                                status: Status.REVOKED,
                                message: "License revoked by developer",
                                machineId: license.machineId,
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
                                machineId: license.machineId,
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

                        // ✅ Cache INCLUDING machineId
                        await setCachedLicense(key, {
                                status: Status.ACTIVE,
                                expiresAt: license.expiresAt,
                                duration: `${license.duration} months`,
                                machineId: license.machineId,
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

export const activateLicense = async (req: Request, res: Response) => {
        try {
                const { key } = req.body

                if (!key) {
                        return res.status(400).json({
                                success: false,
                                message: "License key is required",
                        })
                }

                // 🔐 Generate stable machine ID (hashed)
                const machineId = machineIdSync(true)

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

                // 🚨 Already activated
                if (license.status === Status.ACTIVE) {
                        if (license.machineId !== machineId) {
                                return res.status(403).json({
                                        success: false,
                                        message: "License already activated on another machine",
                                })
                        }

                        return res.json({
                                success: true,
                                message: "License already activated on this machine",
                                activatedAt: license.issuedAt,
                                expiresAt: license.expiresAt,
                        })
                }

                // 🟢 First-time activation
                const issuedAt = new Date()
                const expiresAt = new Date()
                expiresAt.setMonth(expiresAt.getMonth() + license.duration)

                license.status = Status.ACTIVE
                license.issuedAt = issuedAt
                license.expiresAt = expiresAt
                license.machineId = machineId // ✅ STORED IN DB

                await license.save()
                await invalidateCachedLicense(key)

                return res.json({
                        success: true,
                        message: "License activated successfully",
                        machineId,
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
