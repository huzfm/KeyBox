import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User, Role } from "../../models/User";
import { Client } from "../../models/Client";
import { Project } from "../../models/Project";
import { License, Status } from "../../models/License";

/**
 * Generate a JWT token for testing
 */
export const generateTestToken = (userId: string, email: string = "test@example.com", role: Role = Role.DEVELOPER): string => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET || "defaultsecret",
    { expiresIn: "1h" }
  );
};

/**
 * Create a test user
 */
export const createTestUser = async (overrides: any = {}) => {
  const hashedPassword = await bcrypt.hash("password123", 10);
  
  // Generate unique email to avoid duplicate key errors
  const uniqueEmail = overrides.email || `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
  
  return await User.create({
    name: "Test User",
    email: uniqueEmail,
    password_hash: hashedPassword,
    role: Role.DEVELOPER,
    ...overrides,
  });
};

/**
 * Create a test client
 */
export const createTestClient = async (userId: string, overrides: any = {}) => {
  return await Client.create({
    name: "Test Client",
    email: "client@example.com",
    owner: userId,
    ...overrides,
  });
};

/**
 * Create a test project
 */
export const createTestProject = async (clientId: string, overrides: any = {}) => {
  return await Project.create({
    name: "Test Project",
    client: clientId,
    ...overrides,
  });
};

/**
 * Create a test license
 */
export const createTestLicense = async (
  userId: string,
  clientId: string,
  projectId: string,
  overrides: any = {}
) => {
  const issuedAt = new Date();
  const expiresAt = new Date();
  expiresAt.setMonth(issuedAt.getMonth() + 6);

  return await License.create({
    key: `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    duration: 6,
    issuedAt,
    expiresAt,
    status: Status.ACTIVE,
    user: userId,
    client: clientId,
    project: projectId,
    services: ["Hosting", "Domain"], // Use valid enum values
    ...overrides,
  });
};

/**
 * Create a complete test setup (user, client, project, license)
 */
export const createTestSetup = async () => {
  const user = await createTestUser();
  const client = await createTestClient(user._id.toString());
  const project = await createTestProject(client._id.toString());
  const license = await createTestLicense(
    user._id.toString(),
    client._id.toString(),
    project._id.toString()
  );

  return { user, client, project, license };
};
