import { Status } from "../models/License"
import redis from "../lib/redis"

const TTL_SECONDS = 604800 // 1 week

export interface CachedLicense {
        status: Status
        message?: string
        expiresAt?: Date | string
        duration?: string
}

const getCachedLicense = async (key: string): Promise<CachedLicense | null> => {
        const data = await redis.get(`license:${key}`)
        return data ? JSON.parse(data) : null
}

const setCachedLicense = async (key: string, license: CachedLicense) => {
        await redis.set(`license:${key}`, JSON.stringify(license), {
                EX: TTL_SECONDS,
        })
}

const invalidateCachedLicense = async (key: string) => {
        await redis.del(`license:${key}`)
}

export { getCachedLicense, setCachedLicense, invalidateCachedLicense }
