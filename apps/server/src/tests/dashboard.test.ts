import request from "supertest";
import app from "../app";
import {
  createTestUser,
  createTestClient,
  createTestProject,
  createTestLicense,
  generateTestToken,
} from "./helpers/testHelpers";

describe("Dashboard Controller", () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user._id.toString();
    authToken = generateTestToken(userId);
  });

  describe("GET /api/v1/dashboard", () => {
    it("should return full dashboard data for user", async () => {

      const client1 = await createTestClient(userId, {
        name: "Client 1",
        email: "client1@example.com",
      });
      const client2 = await createTestClient(userId, {
        name: "Client 2",
        email: "client2@example.com",
      });

      const project1 = await createTestProject(client1._id.toString(), {
        name: "Project 1",
      });
      const project2 = await createTestProject(client1._id.toString(), {
        name: "Project 2",
      });
      const project3 = await createTestProject(client2._id.toString(), {
        name: "Project 3",
      });

      await createTestLicense(
        userId,
        client1._id.toString(),
        project1._id.toString()
      );
      await createTestLicense(
        userId,
        client1._id.toString(),
        project2._id.toString()
      );

      const response = await request(app)
        .get("/api/v1/dashboard")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Dashboard fetched successfully");
      expect(response.body.clientsCount).toBe(2);
      expect(response.body.projectsCount).toBe(3);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      const dashboardData = response.body.data;
      expect(dashboardData.length).toBe(2);

      dashboardData.forEach((client: any) => {
        expect(client.projects).toBeDefined();
        expect(Array.isArray(client.projects)).toBe(true);

        client.projects.forEach((project: any) => {
          expect(project.licenses).toBeDefined();
          expect(Array.isArray(project.licenses)).toBe(true);
        });
      });
    });

    it("should return empty data when user has no clients", async () => {
      const response = await request(app)
        .get("/api/v1/dashboard")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.clientsCount).toBe(0);
      expect(response.body.projectsCount).toBe(0);
      expect(response.body.data).toEqual([]);
    });

    it("should reject dashboard request without authentication", async () => {
      const response = await request(app).get("/api/v1/dashboard");

      expect(response.status).toBe(401);
    });

    it("should handle clients with no projects", async () => {
      await createTestClient(userId, { email: "client@example.com" });

      const response = await request(app)
        .get("/api/v1/dashboard")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.clientsCount).toBe(1);
      expect(response.body.projectsCount).toBe(0);
      expect(response.body.data[0].projects).toEqual([]);
    });

    it("should handle projects with no licenses", async () => {
      const client = await createTestClient(userId);
      await createTestProject(client._id.toString());

      const response = await request(app)
        .get("/api/v1/dashboard")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.projectsCount).toBe(1);
      expect(response.body.data[0].projects[0].licenses).toEqual([]);
    });

    it("should only return data for authenticated user", async () => {

      await createTestClient(userId);

      const user2 = await createTestUser({ email: "user2@example.com" });
      await createTestClient(user2._id.toString(), {
        email: "client2@example.com",
      });

      const response = await request(app)
        .get("/api/v1/dashboard")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.clientsCount).toBe(1);
    });
  });
});
