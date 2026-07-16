import { Router } from "express"
import { toggleLicense, renewLicense } from "../controllers/license.controller"
import { auth } from "../middleware/jwt"
const router = Router()

router.patch("/revoke/:key", auth, toggleLicense)
router.patch("/renew/:key", auth, renewLicense)

export default router
