import { MongoMemoryServer } from "mongodb-memory-server"
import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

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
        mongoServer = await MongoMemoryServer.create()
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
