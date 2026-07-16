import request from "supertest"
import app from "../app"
import { Status } from "../models/License"
import {
     createTestUser,
     createTestClient,
     createTestProject,
     createTestLicense,
     generateTestToken,
} from "./helpers/testHelpers"

describe("License Controller", () => {
     let authToken: string
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
          authToken = generateTestToken(userId)
     })

     describe("PATCH /license/revoke/:key", () => {
          it("should toggle license from ACTIVE to REVOKED", async () => {
               const license = await createTestLicense(
                    userId,
                    clientId,
                    projectId,
                    {
                         status: Status.ACTIVE,
                    },
               )

               const response = await request(app).patch(
                    `/license/revoke/${license.key}`,
               )

               expect(response.status).toBe(200)
               expect(response.body.message).toContain("REVOKED")
               expect(response.body.status).toBe(Status.REVOKED)
               expect(response.body.key).toBe(license.key)
          })

          it("should toggle license from REVOKED to ACTIVE", async () => {
               const license = await createTestLicense(
                    userId,
                    clientId,
                    projectId,
                    {
                         status: Status.REVOKED,
                    },
               )

               const response = await request(app).patch(
                    `/license/revoke/${license.key}`,
               )

               expect(response.status).toBe(200)
               expect(response.body.message).toContain("ACTIVE")
               expect(response.body.status).toBe(Status.ACTIVE)
          })

          it("should return 404 for non-existent license key", async () => {
               const response = await request(app).patch(
                    "/license/revoke/NONEXISTENT-KEY",
               )

               expect(response.status).toBe(404)
               expect(response.body.message).toBe("License not found")
          })

          it("should return 400 when key is missing", async () => {
               const response = await request(app).patch("/license/revoke/")

               expect(response.status).toBe(404)
          })
     })

     describe("PATCH /license/renew/:key", () => {
          it("should renew an expired license and extend its expiry", async () => {
               const license = await createTestLicense(
                    userId,
                    clientId,
                    projectId,
                    {
                         status: Status.EXPIRED,
                         duration: 3,
                    },
               )

               const response = await request(app)
                    .patch(`/license/renew/${license.key}`)
                    .set("Authorization", `Bearer ${authToken}`)

               expect(response.status).toBe(200)
               expect(response.body.status).toBe(Status.ACTIVE)
               expect(new Date(response.body.expiresAt).getTime()).toBeGreaterThan(
                    Date.now(),
               )
          })

          it("should renew an active license (early renewal)", async () => {
               const license = await createTestLicense(
                    userId,
                    clientId,
                    projectId,
                    {
                         status: Status.ACTIVE,
                    },
               )

               const response = await request(app)
                    .patch(`/license/renew/${license.key}`)
                    .set("Authorization", `Bearer ${authToken}`)

               expect(response.status).toBe(200)
               expect(response.body.status).toBe(Status.ACTIVE)
          })

          it("should accept an optional new duration", async () => {
               const license = await createTestLicense(
                    userId,
                    clientId,
                    projectId,
                    {
                         status: Status.EXPIRED,
                    },
               )

               const response = await request(app)
                    .patch(`/license/renew/${license.key}`)
                    .set("Authorization", `Bearer ${authToken}`)
                    .send({ duration: 12 })

               expect(response.status).toBe(200)

               const expected = new Date()
               expected.setMonth(expected.getMonth() + 12)
               expect(
                    Math.abs(
                         new Date(response.body.expiresAt).getTime() -
                              expected.getTime(),
                    ),
               ).toBeLessThan(5000)
          })

          it("should reject renewal of a PENDING license", async () => {
               const license = await createTestLicense(
                    userId,
                    clientId,
                    projectId,
                    {
                         status: Status.PENDING,
                    },
               )

               const response = await request(app)
                    .patch(`/license/renew/${license.key}`)
                    .set("Authorization", `Bearer ${authToken}`)

               expect(response.status).toBe(400)
          })

          it("should reject renewal of a license owned by another user", async () => {
               const otherUser = await createTestUser()
               const license = await createTestLicense(
                    otherUser._id.toString(),
                    clientId,
                    projectId,
                    {
                         status: Status.EXPIRED,
                    },
               )

               const response = await request(app)
                    .patch(`/license/renew/${license.key}`)
                    .set("Authorization", `Bearer ${authToken}`)

               expect(response.status).toBe(403)
          })

          it("should return 404 for non-existent license key", async () => {
               const response = await request(app)
                    .patch("/license/renew/NONEXISTENT-KEY")
                    .set("Authorization", `Bearer ${authToken}`)

               expect(response.status).toBe(404)
          })
     })
})
