import { Router } from "express";
import { getDashboard } from "../controllers/dashboard.controller";
import { auth } from "../middleware/jwt";

const router = Router();

router.get("/", auth, getDashboard);

export default router;
