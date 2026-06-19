import request from "supertest";
import app from "../app";
import { Status } from "../models/License";
import { machineIdSync } from "node-machine-id";
import {
       createTestUser,
       createTestClient,
       createTestProject,
       createTestLicense,
       generateTestToken,
} from "./helpers/testHelpers";

describe("Validation Controller", () => {
       let userId: string;
       let clientId: string;
       let projectId: string;

       const INSTANCE_ID = "instance-aaa-111";

       beforeEach(async () => {
              const user = await createTestUser();
              const client = await createTestClient(user._id.toString());
              const project = await createTestProject(client._id.toString());

              userId = user._id.toString();
              clientId = client._id.toString();
              projectId = project._id.toString();
       });

       describe("POST /validate", () => {
              it("should validate an active license successfully", async () => {
                     const license = await createTestLicense(
                            userId,
                            clientId,
                            projectId,
                            {
                                   status: Status.ACTIVE,
                                   productName: "Test Product",
                                   customer: "Test Customer",
                                   instanceId: INSTANCE_ID,
                            },
                     );

                     const response = await request(app)
                            .post("/validate")
                            .send({
                                   key: license.key,
                                   instanceId: INSTANCE_ID,
                            });

                     expect(response.status).toBe(200);
                     expect(response.body.valid).toBe(true);
                     expect(response.body.status).toBe("active");
                     expect(response.body.duration).toBe("6 months");
                     expect(response.body.expiresAt).toBeDefined();
              });

              it("should reject validation without a key", async () => {
                     const response = await request(app)
                            .post("/validate")
                            .send({ instanceId: INSTANCE_ID });

                     expect(response.status).toBe(400);
                     expect(response.body.valid).toBe(false);
                     expect(response.body.message).toBe(
                            "License key is required",
                     );
              });

              it("should reject validation without an instanceId", async () => {
                     const response = await request(app)
                            .post("/validate")
                            .send({ key: "SOME-KEY" });

                     expect(response.status).toBe(400);
                     expect(response.body.valid).toBe(false);
                     expect(response.body.message).toBe(
                            "Instance ID is required",
                     );
              });

              it("should return invalid for non-existent key", async () => {
                     const response = await request(app)
                            .post("/validate")
                            .send({
                                   key: "NONEXISTENT-KEY",
                                   instanceId: INSTANCE_ID,
                            });

                     expect(response.status).toBe(200);
                     expect(response.body.valid).toBe(false);
                     expect(response.body.status).toBe("invalid");
                     expect(response.body.message).toBe("Key does not exist");
              });

              it("should return invalid for revoked license", async () => {
                     const license = await createTestLicense(
                            userId,
                            clientId,
                            projectId,
                            {
                                   status: Status.REVOKED,
                                   instanceId: INSTANCE_ID,
                            },
                     );

                     const response = await request(app)
                            .post("/validate")
                            .send({
                                   key: license.key,
                                   instanceId: INSTANCE_ID,
                            });

                     expect(response.status).toBe(200);
                     expect(response.body.valid).toBe(false);
                     expect(response.body.status).toBe("revoked");
                     expect(response.body.message).toBe(
                            "License revoked by developer",
                     );
              });

              it("should return invalid for pending license", async () => {
                     const license = await createTestLicense(
                            userId,
                            clientId,
                            projectId,
                            {
                                   status: Status.PENDING,
                                   instanceId: INSTANCE_ID,
                            },
                     );

                     const response = await request(app)
                            .post("/validate")
                            .send({
                                   key: license.key,
                                   instanceId: INSTANCE_ID,
                            });

                     expect(response.status).toBe(200);
                     expect(response.body.valid).toBe(false);
                     expect(response.body.status).toBe("pending");
                     expect(response.body.message).toBe(
                            "License has not been activated yet",
                     );
              });

              it("should return invalid for expired license", async () => {
                     const license = await createTestLicense(
                            userId,
                            clientId,
                            projectId,
                            {
                                   status: Status.EXPIRED,
                                   instanceId: INSTANCE_ID,
                            },
                     );

                     const response = await request(app)
                            .post("/validate")
                            .send({
                                   key: license.key,
                                   instanceId: INSTANCE_ID,
                            });

                     expect(response.status).toBe(200);
                     expect(response.body.valid).toBe(false);
                     expect(response.body.status).toBe("expired");
                     expect(response.body.message).toBe("License has expired");
                     expect(response.body.expiresAt).toBeDefined();
              });

              it("should return instance_mismatch when instanceId differs from the bound one", async () => {
                     const license = await createTestLicense(
                            userId,
                            clientId,
                            projectId,
                            {
                                   status: Status.ACTIVE,
                                   instanceId: "instance-original",
                            },
                     );

                     const response = await request(app)
                            .post("/validate")
                            .send({
                                   key: license.key,
                                   instanceId: "instance-different",
                            });

                     expect(response.status).toBe(200);
                     expect(response.body.valid).toBe(false);
                     expect(response.body.status).toBe("instance_mismatch");
                     expect(response.body.message).toBe(
                            "License is not valid for this instance",
                     );
              });
       });

       describe("POST validate/activate", () => {
              it("should activate a pending license", async () => {
                     const license = await createTestLicense(
                            userId,
                            clientId,
                            projectId,
                            {
                                   status: Status.PENDING,
                            },
                     );

                     const response = await request(app)
                            .post("/validate/activate")
                            .send({
                                   key: license.key,
                                   instanceId: INSTANCE_ID,
                            });

                     expect(response.status).toBe(200);
                     expect(response.body.success).toBe(true);
                     expect(response.body.message).toBe(
                            "License activated successfully",
                     );
                     expect(response.body.instanceId).toBe(INSTANCE_ID);
                     expect(response.body.activatedAt).toBeDefined();
                     expect(response.body.expiresAt).toBeDefined();
              });

              it("should reject activation without a key", async () => {
                     const response = await request(app)
                            .post("/validate/activate")
                            .send({ instanceId: INSTANCE_ID });

                     expect(response.status).toBe(400);
                     expect(response.body.success).toBe(false);
                     expect(response.body.message).toBe(
                            "License key is required",
                     );
              });

              it("should reject activation without an instanceId", async () => {
                     const response = await request(app)
                            .post("/validate/activate")
                            .send({ key: "SOME-KEY" });

                     expect(response.status).toBe(400);
                     expect(response.body.success).toBe(false);
                     expect(response.body.message).toBe(
                            "Instance ID is required",
                     );
              });

              it("should reject re-activation on a different instance", async () => {
                     // Pre-seed an active license bound to a specific instance.
                     // We seed the same machineId the server's node-machine-id
                     // will compute at activation time, so the controller's
                     // machine-mismatch check passes and the instance check
                     // is the one that fires.
                     const runtimeMachineId = machineIdSync(true);
                     const license = await createTestLicense(
                            userId,
                            clientId,
                            projectId,
                            {
                                   status: Status.ACTIVE,
                                   machineId: runtimeMachineId,
                                   instanceId: "instance-original",
                            },
                     );

                     const response = await request(app)
                            .post("/validate/activate")
                            .send({
                                   key: license.key,
                                   instanceId: "instance-different",
                            });

                     expect(response.status).toBe(403);
                     expect(response.body.success).toBe(false);
                     expect(response.body.message).toBe(
                            "License already activated on another instance",
                     );
              });
       });
});
