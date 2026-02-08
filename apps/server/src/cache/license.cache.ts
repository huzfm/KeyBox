import { Status } from "../models/License"
import { getRedisClient } from "../lib/redis"

const TTL_SECONDS = 604800 // 1 week

export interface CachedLicense {
        status: Status
        message?: string
        expiresAt?: Date | string
        duration?: string
}

const getCachedLicense = async (key: string): Promise<CachedLicense | null> => {
        try {
                const redis = await getRedisClient()
                const data = await redis.get(`license:${key}`)
                return data ? JSON.parse(data) : null
        } catch (error) {
                console.error("Redis getCachedLicense error:", error)
                return null // Gracefully degrade - continue without cache
        }
}

const setCachedLicense = async (key: string, license: CachedLicense) => {
        try {
                const redis = await getRedisClient()
                await redis.set(`license:${key}`, JSON.stringify(license), {
                        EX: TTL_SECONDS,
                })
        } catch (error) {
                console.error("Redis setCachedLicense error:", error)
                // Gracefully degrade - continue without cache
        }
}

const invalidateCachedLicense = async (key: string) => {
        try {
                const redis = await getRedisClient()
                await redis.del(`license:${key}`)
        } catch (error) {
                console.error("Redis invalidateCachedLicense error:", error)
                // Gracefully degrade - continue without cache
        }
}

export { getCachedLicense, setCachedLicense, invalidateCachedLicense }
