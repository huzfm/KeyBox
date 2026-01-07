import { Router } from "express";
import { createClient } from "../controllers/client.controller";
import { auth } from "../middleware/jwt";

const router = Router();

router.post("/", auth, createClient);

export default router;
