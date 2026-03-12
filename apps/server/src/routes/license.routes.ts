import { Router } from "express"
import { toggleLicense } from "../controllers/license.controller"
import { auth } from "../middleware/jwt"
const router = Router()

router.patch("/revoke/:key", auth, toggleLicense)

export default router
