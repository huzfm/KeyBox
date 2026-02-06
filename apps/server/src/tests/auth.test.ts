import request from "supertest";
import app from "../app";
import { User, Role } from "../models/User";
import { createTestUser } from "./helpers/testHelpers";

describe("Authentication Controller", () => {
       describe("POST /auth/signup", () => {
              it("should successfully register a new user", async () => {
                     const response = await request(app)
                            .post("/auth/signup")
                            .send({
                                   name: "John Doe",
                                   email: "john@example.com",
                                   password: "password123",
                                   confirm_password: "password123",
                            });

                     expect(response.status).toBe(201);
                     expect(response.body.message).toBe("Signup successful");
                     expect(response.body.userId).toBeDefined();

                     const user = await User.findById(response.body.userId);
                     expect(user).toBeTruthy();
                     expect(user?.email).toBe("john@example.com");
                     expect(user?.name).toBe("John Doe");
              });

              it("should reject signup with missing fields", async () => {
                     const response = await request(app)
                            .post("/auth/signup")
                            .send({
                                   email: "john@example.com",
                                   password: "password123",
                            });

                     expect(response.status).toBe(400);
                     expect(response.body.message).toBe(
                            "All fields are required",
                     );
              });

              it("should reject signup with mismatched passwords", async () => {
                     const response = await request(app)
                            .post("/auth/signup")
                            .send({
                                   name: "John Doe",
                                   email: "john@example.com",
                                   password: "password123",
                                   confirm_password: "differentpassword",
                            });

                     expect(response.status).toBe(400);
                     expect(response.body.message).toBe(
                            "Passwords do not match",
                     );
              });

              it("should reject signup with short password", async () => {
                     const response = await request(app)
                            .post("/auth/signup")
                            .send({
                                   name: "John Doe",
                                   email: "john@example.com",
                                   password: "pass",
                                   confirm_password: "pass",
                            });

                     expect(response.status).toBe(400);
                     expect(response.body.message).toBe(
                            "Password must be at least 6 characters long",
                     );
              });

              it("should reject signup with duplicate email", async () => {
                     await createTestUser({ email: "john@example.com" });

                     const response = await request(app)
                            .post("/auth/signup")
                            .send({
                                   name: "John Doe",
                                   email: "john@example.com",
                                   password: "password123",
                                   confirm_password: "password123",
                            });

                     expect(response.status).toBe(400);
                     expect(response.body.message).toBe(
                            "Email already registered",
                     );
              });
       });

       describe("POST /auth/login", () => {
              let testUserEmail: string;

              beforeEach(async () => {
                     testUserEmail = `testuser-${Date.now()}@example.com`;
                     await createTestUser({
                            email: testUserEmail,
                            name: "Test User",
                     });
              });

              it("should successfully login with valid credentials", async () => {
                     const response = await request(app)
                            .post("/auth/login")
                            .send({
                                   email: testUserEmail,
                                   password: "password123",
                            });

                     expect(response.status).toBe(200);
                     expect(response.body.message).toBe("Login successful");
                     expect(response.body.token).toBeDefined();
                     expect(response.body.userId).toBeDefined();
                     expect(response.body.role).toBe(Role.DEVELOPER);
              });

              it("should reject login with non-existent email", async () => {
                     const response = await request(app)
                            .post("/auth/login")
                            .send({
                                   email: "nonexistent@example.com",
                                   password: "password123",
                            });

                     expect(response.status).toBe(404);
                     expect(response.body.message).toBe("User not found");
              });

              it("should reject login with incorrect password", async () => {
                     const response = await request(app)
                            .post("/auth/login")
                            .send({
                                   email: testUserEmail,
                                   password: "wrongpassword",
                            });

                     expect(response.status).toBe(400);
                     expect(response.body.message).toBe("Invalid credentials");
              });

              it("should reject login for OAuth users without password", async () => {
                     await createTestUser({
                            email: "oauth@example.com",
                            password_hash: undefined,
                     });

                     const response = await request(app)
                            .post("/auth/login")
                            .send({
                                   email: "oauth@example.com",
                                   password: "anypassword",
                            });

                     expect(response.status).toBe(400);
                     expect(response.body.message).toContain("Google sign-in");
              });
       });

       describe("GET /auth/users", () => {
              it("should return all users without password hashes", async () => {
                     await createTestUser({ email: "user1@example.com" });
                     await createTestUser({ email: "user2@example.com" });
                     await createTestUser({ email: "user3@example.com" });

                     const response = await request(app).get("/auth/users");

                     expect(response.status).toBe(200);
                     expect(response.body.users).toBeDefined();
                     expect(response.body.users.length).toBe(3);

                     response.body.users.forEach((user: any) => {
                            expect(user.password_hash).toBeUndefined();
                     });
              });

              it("should return empty array when no users exist", async () => {
                     const response = await request(app).get("/auth/users");

                     expect(response.status).toBe(200);
                     expect(response.body.users).toBeDefined();
                     expect(response.body.users.length).toBe(0);
              });
       });
});
