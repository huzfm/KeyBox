import { createClient } from "redis"

const redis = createClient({
        username: "default",
        password: process.env.REDIS_PASSWORD,
        socket: {
                host: "redis-10357.c212.ap-south-1-1.ec2.cloud.redislabs.com",
                port: 10357,
        },
})

redis.on("error", (err) => console.log("Redis Client Error", err))

export async function connectRedis() {
        if (!redis.isOpen) {
                await redis.connect()
                console.log("Connected to Redis")
        }
}
export default redis
