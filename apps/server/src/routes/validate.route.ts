import { Router } from "express";
import {
  validateLicense,
  activateLicense,
} from "../controllers/validate.controller";

const router = Router();

router.post("/", validateLicense);
router.post("/activate", activateLicense);

export default router;
