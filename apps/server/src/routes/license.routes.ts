import { Router } from "express";
import { createLicense } from "../controllers/license.controller";
const router = Router();
router.post("/create", createLicense);
export default router;
