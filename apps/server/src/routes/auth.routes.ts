import { Router } from "express"
import {
        signup,
        login,
        getAllUsers,
        editUser,
} from "../controllers/auth.controller"
import { auth } from "../middleware/jwt"

const router = Router()
router.post("/signup", signup)
router.post("/login", login)
router.get("/users", auth, getAllUsers)
router.patch("/users/:id", auth, editUser)

export default router
