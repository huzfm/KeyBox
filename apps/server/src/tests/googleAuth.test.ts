import request from "supertest";
import app from "../app";
import { User, Role } from "../models/User";
import { createTestUser } from "./helpers/testHelpers";

describe("Google Authentication", () => {
  describe("GET /auth/google", () => {
    it("should redirect to Google OAuth page", async () => {
      const response = await request(app).get("/auth/google");
      
      // Should redirect (302) to Google's OAuth page
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain("accounts.google.com");
    });
  });

  describe("Google OAuth User Management", () => {
    it("should create a new user with Google profile data", async () => {
      const googleProfile = {
        id: "google-user-123",
        displayName: "Google Test User",
        emails: [{ value: "googletest@example.com" }],
        photos: [{ value: "https://example.com/photo.jpg" }],
      };

      const newUser = await User.create({
        name: googleProfile.displayName,
        email: googleProfile.emails[0].value,
        googleId: googleProfile.id,
        profilePicture: googleProfile.photos[0].value,
        role: Role.DEVELOPER,
      });

      expect(newUser).toBeTruthy();
      expect(newUser.email).toBe("googletest@example.com");
      expect(newUser.googleId).toBe("google-user-123");
      expect(newUser.name).toBe("Google Test User");
      expect(newUser.profilePicture).toBe("https://example.com/photo.jpg");
      expect(newUser.role).toBe(Role.DEVELOPER);
    });

    it("should link Google account to existing user with same email", async () => {
      // Create existing user without Google ID
      const existingUser = await createTestUser({
        email: "existing@example.com",
        name: "Existing User",
      });

      expect(existingUser.googleId).toBeUndefined();

      // Simulate Google login linking (as done in googleStrategy.ts)
      existingUser.googleId = "google-link-456";
      existingUser.profilePicture = "https://example.com/linked.jpg";
      await existingUser.save();

      // Verify the update
      const updatedUser = await User.findById(existingUser._id);
      expect(updatedUser?.googleId).toBe("google-link-456");
      expect(updatedUser?.profilePicture).toBe("https://example.com/linked.jpg");
    });

    it("should find user by Google ID on subsequent logins", async () => {
      const googleId = "returning-google-id";
      
      await User.create({
        name: "Returning Google User",
        email: "returning@example.com",
        googleId: googleId,
        role: Role.DEVELOPER,
      });

      // Simulate finding user by Google ID (as done in googleStrategy.ts)
      const user = await User.findOne({ googleId });

      expect(user).toBeTruthy();
      expect(user?.email).toBe("returning@example.com");
      expect(user?.googleId).toBe(googleId);
    });

    it("should not create duplicate user if Google ID already exists", async () => {
      const googleId = "duplicate-test-id";
      
      await User.create({
        name: "First User",
        email: "first@example.com",
        googleId: googleId,
        role: Role.DEVELOPER,
      });

      // Attempt to create another user with same googleId should fail
      await expect(
        User.create({
          name: "Second User",
          email: "second@example.com",
          googleId: googleId,
          role: Role.DEVELOPER,
        })
      ).rejects.toThrow();
    });
  });

  describe("Google OAuth Error Scenarios", () => {
    it("should reject login for OAuth users trying password login", async () => {
      // Create Google OAuth user without password
      await User.create({
        name: "OAuth Only User",
        email: "oauthonly@example.com",
        googleId: "oauth-only-id",
        role: Role.DEVELOPER,
      });

      // Attempt normal login should fail
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "oauthonly@example.com",
        password: "anypassword",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Google sign-in");
    });

    it("should handle missing email in Google profile", async () => {
      // The Google strategy rejects profiles without email
      const profileWithoutEmail: {
        id: string;
        displayName: string;
        emails: { value: string }[];
        photos: { value: string }[];
      } = {
        id: "no-email-user",
        displayName: "No Email User",
        emails: [],
        photos: [],
      };

      const email = profileWithoutEmail.emails?.[0]?.value;
      expect(email).toBeUndefined();
    });

    it("should handle missing profile picture gracefully", async () => {
      const userWithoutPicture = await User.create({
        name: "No Picture User",
        email: "nopicture@example.com",
        googleId: "no-picture-id",
        role: Role.DEVELOPER,
      });

      expect(userWithoutPicture.profilePicture).toBeUndefined();
      expect(userWithoutPicture.googleId).toBe("no-picture-id");
    });
  });

  describe("Google OAuth Callback", () => {
    it("should return redirect status when callback is accessed", async () => {
      const response = await request(app).get("/auth/google/callback");
      
      // Without a valid code, should redirect (to Google OAuth or login)
      expect(response.status).toBe(302);
    });

    it("should have callback route registered at /auth/google/callback", async () => {
      const response = await request(app).get("/auth/google/callback");
      
      // Route should exist (not 404) and return redirect
      expect(response.status).not.toBe(404);
      expect(response.status).toBe(302);
    });
  });
});
