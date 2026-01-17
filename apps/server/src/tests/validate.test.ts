import request from "supertest";
import app from "../app";
import { Status } from "../models/License";
import {
  createTestUser,
  createTestClient,
  createTestLicense,
  generateTestToken,
} from "./helpers/testHelpers";

describe("Validation Controller", () => {
  let userId: string;
  let clientId: string;
  let projectId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    const client = await createTestClient(user._id.toString());
    userId = user._id.toString();
    clientId = client._id.toString();
  });

  describe("POST /validate", () => {
    it("should validate an active license successfully", async () => {
      const license = await createTestLicense(userId, clientId, "project123", {
        status: Status.ACTIVE,
        productName: "Test Product",
        customer: "Test Customer",
      });

      const response = await request(app).post("/validate").send({
        key: license.key,
      });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.status).toBe("active");
      expect(response.body.duration).toBe("6 months");
      expect(response.body.expiresAt).toBeDefined();
    });

    it("should reject validation without a key", async () => {
      const response = await request(app).post("/validate").send({});

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.message).toBe("License key is required");
    });

    it("should return invalid for non-existent key", async () => {
      const response = await request(app).post("/validate").send({
        key: "NONEXISTENT-KEY",
      });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.status).toBe("invalid");
      expect(response.body.message).toBe("Key does not exist");
    });

    it("should return invalid for revoked license", async () => {
      const license = await createTestLicense(userId, clientId, "project123", {
        status: Status.REVOKED,
      });

      const response = await request(app).post("/validate").send({
        key: license.key,
      });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.status).toBe("revoked");
      expect(response.body.message).toBe("License revoked by developer");
    });

    it("should return invalid for pending license", async () => {
      const license = await createTestLicense(userId, clientId, "project123", {
        status: Status.PENDING,
      });

      const response = await request(app).post("/validate").send({
        key: license.key,
      });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.status).toBe("pending");
      expect(response.body.message).toBe("License has not been activated yet");
    });

    it("should return invalid for expired license", async () => {
      const license = await createTestLicense(userId, clientId, "project123", {
        status: Status.EXPIRED,
      });

      const response = await request(app).post("/validate").send({
        key: license.key,
      });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.status).toBe("expired");
      expect(response.body.message).toBe("License has expired");
      expect(response.body.expiresAt).toBeDefined();
    });
  });

  describe("POST /validate/activate", () => {
    it("should activate a pending license", async () => {
      const license = await createTestLicense(userId, clientId, "project123", {
        status: Status.PENDING,
      });

      const response = await request(app).post("/validate/activate").send({
        key: license.key,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("License activated successfully");
      expect(response.body.activatedAt).toBeDefined();
      expect(response.body.expiresAt).toBeDefined();
    });

    it("should return success if license is already active", async () => {
      const license = await createTestLicense(userId, clientId, "project123", {
        status: Status.ACTIVE,
      });

      const response = await request(app).post("/validate/activate").send({
        key: license.key,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("License already activated");
    });

    it("should reject activation without a key", async () => {
      const response = await request(app).post("/validate/activate").send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("License key is required");
    });

    it("should reject activation for non-existent license", async () => {
      const response = await request(app).post("/validate/activate").send({
        key: "NONEXISTENT-KEY",
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("License not found");
    });

    it("should reject activation for revoked license", async () => {
      const license = await createTestLicense(userId, clientId, "project123", {
        status: Status.REVOKED,
      });

      const response = await request(app).post("/validate/activate").send({
        key: license.key,
      });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("License has been revoked");
    });

    it("should reject activation for expired license", async () => {
      const license = await createTestLicense(userId, clientId, "project123", {
        status: Status.EXPIRED,
      });

      const response = await request(app).post("/validate/activate").send({
        key: license.key,
      });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("License has expired");
    });
  });
});
