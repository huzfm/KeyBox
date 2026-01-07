import { Router } from "express";
import { createProjectWithLicense } from "../controllers/project.controller";
import { auth } from "../middleware/jwt";
const router = Router();

router.post("/createProject", auth, createProjectWithLicense);

export default router;
