import { createClient, RedisClientType } from "redis"

let redis: RedisClientType | null = null

function createRedisClient(): RedisClientType {
        const client = createClient({
                username: "default",
                password: process.env.REDIS_PASSWORD,
                socket: {
                        host: "redis-10357.c212.ap-south-1-1.ec2.cloud.redislabs.com",
                        port: 10357,
                        connectTimeout: 10000,
                        reconnectStrategy: (retries) => {
                                if (retries > 3) {
                                        console.log(
                                                "Redis: Max retries reached",
                                        )
                                        return new Error("Max retries reached")
                                }
                                return Math.min(retries * 500, 3000)
                        },
                },
        })

        client.on("error", (err) =>
                console.log("Redis Client Error:", err.message),
        )
        client.on("connect", () => console.log("Redis connecting..."))
        client.on("ready", () => console.log("Redis ready"))

        return client as RedisClientType
}

// Get Redis client with automatic connection (serverless-safe)
export async function getRedisClient(): Promise<RedisClientType> {
        if (!redis) {
                redis = createRedisClient()
        }

        if (!redis.isOpen) {
                try {
                        await redis.connect()
                } catch (error) {
                        console.error("Failed to connect to Redis:", error)
                        // Reset client on connection failure for next attempt
                        redis = null
                        throw error
                }
        }

        return redis
}

// For backwards compatibility
export async function connectRedis(): Promise<void> {
        try {
                await getRedisClient()
                console.log("Connected to Redis")
        } catch (error) {
                console.error("Redis connection failed:", error)
                // Don't throw - allow server to start without Redis
        }
}

// Legacy default export - use getRedisClient() instead for serverless
export default {
        get client() {
                return redis
        },
        getClient: getRedisClient,
        connect: connectRedis,
}
