import dotenv from "dotenv"
dotenv.config()

import mongoose from "mongoose"
import app from "./app.ts"
import { connectRedis } from "./lib/redis.ts"

const PORT = process.env.PORT || 8000
const MONGO_URI = process.env.MONGO_URI as string

if (!MONGO_URI) {
        throw new Error("MONGO_URI is not defined")
}

async function startServer() {
        try {
                await mongoose.connect(MONGO_URI, {
                        serverSelectionTimeoutMS: 5000,
                })

                console.log("MongoDB connected")
                await connectRedis()

                app.listen(PORT, () => {
                        console.log(`Server running on port ${PORT}`)
                })
        } catch (err) {
                console.error("Startup error:", err)
                process.exit(1)
        }
}

startServer()
