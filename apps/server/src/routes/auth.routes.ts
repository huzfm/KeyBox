import { Router } from "express"
import { signup, login, getAllUsers } from "../controllers/auth.controller"
import { auth } from "../middleware/jwt"

const router = Router()
router.post("/signup", signup)
router.post("/login", login)
router.get("/users", auth, getAllUsers)

export default router
