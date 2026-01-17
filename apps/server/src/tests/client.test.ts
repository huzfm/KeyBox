import request from "supertest";
import app from "../app";
import { Client } from "../models/Client";
import { createTestUser, generateTestToken } from "./helpers/testHelpers";

describe("Client Controller", () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user._id.toString();
    authToken = generateTestToken(userId);
  });

  describe("POST /clients", () => {
    it("should successfully create a client", async () => {
      const response = await request(app)
        .post("/clients")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Acme Corp",
          email: "contact@acmecorp.com",
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Client created successfully");
      expect(response.body.client).toBeDefined();
      expect(response.body.client.name).toBe("Acme Corp");
      expect(response.body.client.email).toBe("contact@acmecorp.com");
      expect(response.body.client.owner.toString()).toBe(userId);

      const client = await Client.findById(response.body.client._id);
      expect(client).toBeTruthy();
      expect(client?.name).toBe("Acme Corp");
    });

    it("should reject client creation without name", async () => {
      const response = await request(app)
        .post("/clients")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          email: "contact@acmecorp.com",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Client name required");
    });

    it("should reject client creation without email", async () => {
      const response = await request(app)
        .post("/clients")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Acme Corp",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Client email required");
    });

    it("should reject client creation without authentication", async () => {
      const response = await request(app).post("/clients").send({
        name: "Acme Corp",
        email: "contact@acmecorp.com",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("No token provided");
    });

    it("should reject client creation with invalid token", async () => {
      const response = await request(app)
        .post("/clients")
        .set("Authorization", "Bearer invalid-token")
        .send({
          name: "Acme Corp",
          email: "contact@acmecorp.com",
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Unauthorized");
    });

    it("should handle validation errors properly", async () => {
      const response = await request(app)
        .post("/clients")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "",
          email: "",
        });

      expect(response.status).toBe(400);
    });
  });
});
