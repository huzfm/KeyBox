import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

// Importing src/app.ts pulls in modules that validate their config at import
// time: src/lib/db.ts requires MONGO_URI and src/config/googleStrategy.ts
// requires the Google OAuth pair, both throwing if unset. Those are deliberate
// fail-fast guards for real deploys, and the tests need neither connection —
// Mongo comes from mongodb-memory-server below, and the OAuth flow is only
// exercised as far as the redirect, which needs the strategy registered but
// never contacts Google. Placeholders keep the suite runnable without a .env
// file (CI has none, since .env is gitignored). Real values still win.
process.env.MONGO_URI ||= "mongodb://127.0.0.1:27017/keybox-test"
process.env.GOOGLE_CLIENT_ID ||= "test-google-client-id"
process.env.GOOGLE_CLIENT_SECRET ||= "test-google-client-secret"
// src/middleware/jwt.ts falls back to "ABCDEF" while the test helpers fall back
// to "defaultsecret", so an unset secret makes token verification fail.
process.env.JWT_SECRET ||= "test-jwt-secret"

jest.mock("../lib/redis", () => ({
     get: jest.fn(),
     set: jest.fn(),
     del: jest.fn(),
     on: jest.fn(),
     isOpen: true,
     connect: jest.fn().mockResolvedValue(undefined),
     default: {
          get: jest.fn(),
          set: jest.fn(),
          del: jest.fn(),
          on: jest.fn(),
          isOpen: true,
          connect: jest.fn().mockResolvedValue(undefined),
     },
}))

let mongoServer: MongoMemoryServer

process.env.NODE_ENV = "test"

beforeAll(async () => {
     mongoServer = await MongoMemoryServer.create({
          binary: {
               version: "6.0.5",
          },
     })
     const mongoUri = mongoServer.getUri()

     await mongoose.connect(mongoUri)
})

afterEach(async () => {
     if (mongoose.connection.readyState !== 0) {
          const collections = mongoose.connection.collections
          for (const key in collections) {
               await collections[key].deleteMany({})
          }
     }
})

afterAll(async () => {
     if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect()
     }
     if (mongoServer) {
          await mongoServer.stop()
     }
})

global.console = {
     ...console,
     log: jest.fn(),
     debug: jest.fn(),
     info: jest.fn(),
     warn: jest.fn(),
     error: jest.fn(),
}
