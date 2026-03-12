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
})
