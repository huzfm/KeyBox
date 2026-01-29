import request from "supertest";
import app from "../app";
import { Project } from "../models/Project";
import { License, Status } from "../models/License";
import {
  createTestUser,
  createTestClient,
  generateTestToken,
} from "./helpers/testHelpers";

describe("Project Controller", () => {
  let authToken: string;
  let userId: string;
  let clientId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    const client = await createTestClient(user._id.toString());

    userId = user._id.toString();
    clientId = client._id.toString();
    authToken = generateTestToken(userId);
  });

  describe("POST /api/v1/projects", () => {
    it("should successfully create project with license in a transaction", async () => {
      const response = await request(app)
        .post("/api/v1/projects/createProject")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          clientId,
          projectName: "Enterprise Project",
          duration: 12,
          services: ["Hosting", "Domain"],
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe(
        "Project and License created successfully"
      );
      expect(response.body.project).toBeDefined();
      expect(response.body.license).toBeDefined();

      expect(response.body.project.name).toBe("Enterprise Project");
      expect(response.body.project.client.toString()).toBe(clientId);

      expect(response.body.license.key).toBeDefined();
      expect(response.body.license.duration).toBe(12);
      expect(response.body.license.status).toBe(Status.PENDING);
      expect(response.body.license.services).toEqual([
        "Hosting",
        "Domain",
      ]);

      const project = await Project.findById(response.body.project._id);
      expect(project).toBeTruthy();

      const license = await License.findOne({
        key: response.body.license.key,
      });
      expect(license).toBeTruthy();
    });

    it("should reject project creation without clientId", async () => {
      const response = await request(app)
        .post("/api/v1/projects/createProject")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          projectName: "Test Project",
          duration: 6,
          services: ["Hosting"],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Client ID & Project name required");
    });

    it("should reject project creation without projectName", async () => {
      const response = await request(app)
        .post("/api/v1/projects/createProject")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          clientId,
          duration: 6,
          services: ["Hosting"],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Client ID & Project name required");
    });

    it("should reject project creation with invalid duration", async () => {
      const response = await request(app)
        .post("/api/v1/projects/createProject")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          clientId,
          projectName: "Test Project",
          duration: 15,
          services: ["Hosting"],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid duration");
    });

    it("should reject project creation with duration less than 1", async () => {
      const response = await request(app)
        .post("/api/v1/projects/createProject")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          clientId,
          projectName: "Test Project",
          duration: 0,
          services: ["Hosting"],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid duration");
    });

    it("should reject project creation without services", async () => {
      const response = await request(app)
        .post("/api/v1/projects/createProject")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          clientId,
          projectName: "Test Project",
          duration: 6,
          services: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("At least one service is required");
    });

    it("should reject project creation with non-array services", async () => {
      const response = await request(app)
        .post("/api/v1/projects/createProject")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          clientId,
          projectName: "Test Project",
          duration: 6,
          services: "API",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("At least one service is required");
    });

    it("should reject project creation with non-existent clientId", async () => {
      const fakeClientId = "507f1f77bcf86cd799439011";

      const response = await request(app)
        .post("/api/v1/projects/createProject")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          clientId: fakeClientId,
          projectName: "Test Project",
          duration: 6,
          services: ["Hosting"],
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Client not found");
    });

    it("should reject project creation without authentication", async () => {
      const response = await request(app).post("/api/v1/projects/createProject").send({
        clientId,
        projectName: "Test Project",
        duration: 6,
        services: ["API"],
      });

      expect(response.status).toBe(401);
    });

    it("should handle transaction rollback on error", async () => {

      const initialProjectCount = await Project.countDocuments();
      const initialLicenseCount = await License.countDocuments();

      await request(app)
        .post("/api/v1/projects/createProject")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          clientId: "invalid-id-format",
          projectName: "Test Project",
          duration: 6,
          services: ["Hosting"],
        });

      const finalProjectCount = await Project.countDocuments();
      const finalLicenseCount = await License.countDocuments();

      expect(finalProjectCount).toBe(initialProjectCount);
      expect(finalLicenseCount).toBe(initialLicenseCount);
    });
  });
});
