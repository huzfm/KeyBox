import { Router } from "express";
import {
  signup,
  login,
  getAllUsers,
  editUser,
} from "../controllers/auth.controller";

const router = Router();
router.post("/signup", signup);
router.post("/login", login);
router.get("/users", getAllUsers);
router.patch("/users/:id", editUser);

export default router;
