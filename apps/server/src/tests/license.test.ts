import request from "supertest";
import app from "../app";
import { Status } from "../models/License";
import {
  createTestUser,
  createTestClient,
  createTestProject,
  createTestLicense,
  generateTestToken,
} from "./helpers/testHelpers";

describe("License Controller", () => {
  let authToken: string;
  let userId: string;
  let clientId: string;
  let projectId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    const client = await createTestClient(user._id.toString());
    const project = await createTestProject(client._id.toString());

    userId = user._id.toString();
    clientId = client._id.toString();
    projectId = project._id.toString();
    authToken = generateTestToken(userId);
  });

  describe("POST /license", () => {
    it("should successfully create a license", async () => {
      const response = await request(app)
        .post("/license/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          duration: 6,
          clientId,
          projectId,
          services: ["Hosting", "Domain"],
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("License created");
      expect(response.body.license).toBeDefined();
      expect(response.body.license.key).toBeDefined();
      expect(response.body.license.duration).toBe(6);
      expect(response.body.license.status).toBe(Status.PENDING);
    });

    it("should reject license creation with duration less than 1", async () => {
      const response = await request(app)
        .post("/license/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          duration: 0,
          clientId,
          projectId,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid duration");
    });

    it("should reject license creation without client or project", async () => {
      const response = await request(app)
        .post("/license/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          duration: 6,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Client & Project required");
    });

    it("should reject license creation without authentication", async () => {
      const response = await request(app).post("/license/create").send({
        duration: 6,
        clientId,
        projectId,
      });

      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /license/revoke/:key", () => {
    it("should toggle license from ACTIVE to REVOKED", async () => {
      const license = await createTestLicense(userId, clientId, projectId, {
        status: Status.ACTIVE,
      });

      const response = await request(app).patch(
        `/license/revoke/${license.key}`
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("REVOKED");
      expect(response.body.status).toBe(Status.REVOKED);
      expect(response.body.key).toBe(license.key);
    });

    it("should toggle license from REVOKED to ACTIVE", async () => {
      const license = await createTestLicense(userId, clientId, projectId, {
        status: Status.REVOKED,
      });

      const response = await request(app).patch(
        `/license/revoke/${license.key}`
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("ACTIVE");
      expect(response.body.status).toBe(Status.ACTIVE);
    });

    it("should return 404 for non-existent license key", async () => {
      const response = await request(app).patch(
        "/license/revoke/NONEXISTENT-KEY"
      );

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("License not found");
    });

    it("should return 400 when key is missing", async () => {
      const response = await request(app).patch("/license/revoke/");

      expect(response.status).toBe(404);
    });
  });

  describe("GET /license/user-licenses", () => {
    it("should return users with their licenses", async () => {
      await createTestLicense(userId, clientId, projectId);

      const response = await request(app).get("/license/user-licenses");

      expect(response.status).toBe(200);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
    });
  });

  describe("GET /license/user/:id", () => {
    it("should return user with licenses by ID", async () => {
      await createTestLicense(userId, clientId, projectId);

      const response = await request(app)
        .get(`/license/user/${userId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        "User details successfully retrieved"
      );
      expect(response.body.user).toBeDefined();
      expect(response.body.licenseCount).toBeGreaterThan(0);
    });

    it("should return 404 for non-existent user", async () => {
      const fakeId = "507f1f77bcf86cd799439011";

      const response = await request(app)
        .get(`/license/user/${fakeId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("User not found");
    });

    it("should return 400 when user ID is missing", async () => {
      const response = await request(app).get("/license/user/");

      expect(response.status).toBe(404);
    });
  });
});
