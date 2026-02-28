import { Router } from "express"
import {
        validateLicense,
        activateLicense,
} from "../controllers/redisLicense.controller"
import { rateLimter } from "../middleware/rateLimit"

const router = Router()

router.post("/", rateLimter, validateLicense)
router.post("/activate", rateLimter, activateLicense)

export default router
