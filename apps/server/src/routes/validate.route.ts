import { Router } from "express";
import { validateLicense } from "../controllers/validate.controller";

const router = Router();

router.get("/", validateLicense);

export default router;
