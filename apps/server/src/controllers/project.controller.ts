import { Response } from "express"
import mongoose from "mongoose"
import { AuthRequest } from "../middleware/jwt"
import { Client } from "../models/Client"
import { Project } from "../models/Project"
import { License, Status } from "../models/License"
import { generateKey } from "../utils/genratekey"

export const createProjectWithLicense = async (
        req: AuthRequest,
        res: Response,
) => {
        const useTransactions = process.env.NODE_ENV !== "test"
        const session = useTransactions ? await mongoose.startSession() : null

        if (session) session.startTransaction()

        try {
                const { clientId, projectName, duration, services } = req.body

                if (!clientId || !projectName)
                        return res.status(400).json({
                                message: "Client ID & Project name required",
                        })

                if (!duration || duration < 1 || duration > 12)
                        return res
                                .status(400)
                                .json({ message: "Invalid duration" })

                if (!Array.isArray(services) || services.length === 0)
                        return res.status(400).json({
                                message: "At least one service is required",
                        })

                if (!req.userId)
                        return res.status(401).json({ message: "Unauthorized" })

                const client = await Client.findById(clientId)
                if (!client) {
                        if (session) {
                                await session.abortTransaction()
                                session.endSession()
                        }
                        return res
                                .status(404)
                                .json({ message: "Client not found" })
                }

                const project = await Project.create(
                        [
                                {
                                        name: projectName,
                                        client: clientId,
                                },
                        ],
                        session ? { session } : {},
                )

                const issuedAt = new Date()
                const expiresAt = new Date()
                expiresAt.setMonth(issuedAt.getMonth() + duration)

                const licenseKey = generateKey(project[0]._id.toString())

                const license = await License.create(
                        [
                                {
                                        key: licenseKey,
                                        duration,
                                        issuedAt,
                                        expiresAt,
                                        services,
                                        status: Status.PENDING,
                                        user: req.userId,
                                        client: clientId,
                                        project: project[0]._id,
                                },
                        ],
                        session ? { session } : {},
                )

                if (session) {
                        await session.commitTransaction()
                        session.endSession()
                }

                return res.status(201).json({
                        message: "Project and License created successfully",
                        project: project[0],
                        license: license[0],
                })
        } catch (error) {
                if (session) {
                        await session.abortTransaction()
                        session.endSession()
                }

                return res.status(500).json({
                        message: "Failed to create project and license",
                        error: (error as Error).message,
                })
        }
}
