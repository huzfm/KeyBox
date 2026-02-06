import request from "supertest"
import app from "../app"
import { Status } from "../models/License"
import redis from "../lib/redis"
import {
        createTestUser,
        createTestClient,
        createTestProject,
        createTestLicense,
} from "./helpers/testHelpers"

describe("Redis License Fetch Test", () => {
        let userId: string
        let clientId: string
        let projectId: string

        beforeEach(async () => {
                const user = await createTestUser()
                const client = await createTestClient(user._id.toString())
                const project = await createTestProject(client._id.toString())

                userId = user._id.toString()
                clientId = client._id.toString()
                projectId = project._id.toString()

                jest.clearAllMocks()
        })

        it("should fetch from MongoDB and then cache in Redis on first call", async () => {
                const license = await createTestLicense(
                        userId,
                        clientId,
                        projectId,
                        {
                                status: Status.ACTIVE,
                        },
                )

                // Mock Redis to return null (cache miss)
                ;(redis.get as jest.Mock).mockResolvedValue(null)

                const response = await request(app)
                        .post("/validate")
                        .send({ key: license.key })

                expect(response.status).toBe(200)
                expect(response.body.valid).toBe(true)
                expect(redis.get).toHaveBeenCalledWith(`license:${license.key}`)
                expect(redis.set).toHaveBeenCalled()
        })

        it("should fetch from Redis (cache hit) and avoid MongoDB on subsequent calls", async () => {
                const key = "TEST-REDIS-KEY"
                const cachedData = {
                        status: Status.ACTIVE,
                        expiresAt: new Date(Date.now() + 100000).toISOString(),
                        duration: "6 months",
                }

                // Mock Redis to return the cached license (cache hit)
                ;(redis.get as jest.Mock).mockResolvedValue(
                        JSON.stringify(cachedData),
                )

                const response = await request(app)
                        .post("/validate")
                        .send({ key })

                expect(response.status).toBe(200)
                expect(response.body.valid).toBe(true)
                expect(response.body.status).toBe("active")
                expect(redis.get).toHaveBeenCalledWith(`license:${key}`)

                // In a cache hit, it should NOT reach the MongoDB findOne call.
                // If it hit Mongo, it would return "Key does not exist" because we didn't create it in Mongo memory server.
                // But since valid is true, it definitely came from cache.
        })

        it("should handle expired licenses in Redis", async () => {
                const key = "EXPIRED-REDIS-KEY"
                const cachedData = {
                        status: Status.ACTIVE,
                        expiresAt: new Date(Date.now() - 100000).toISOString(), // Already expired
                        duration: "6 months",
                }

                ;(redis.get as jest.Mock).mockResolvedValue(
                        JSON.stringify(cachedData),
                )

                const response = await request(app)
                        .post("/validate")
                        .send({ key })

                expect(response.status).toBe(200)
                expect(response.body.valid).toBe(false)
                expect(response.body.status).toBe("expired")
        })

        it("should invalidate cache on license activation", async () => {
                const license = await createTestLicense(
                        userId,
                        clientId,
                        projectId,
                        {
                                status: Status.PENDING,
                        },
                )

                const response = await request(app)
                        .post("/validate/activate")
                        .send({ key: license.key })

                expect(response.status).toBe(200)
                expect(response.body.success).toBe(true)
                expect(redis.del).toHaveBeenCalledWith(`license:${license.key}`)
        })
})
