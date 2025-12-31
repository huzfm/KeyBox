import { Router } from "express";
import {
  createLicense,
  revokeLicense,
} from "../controllers/license.controller";
const router = Router();

router.post("/create", createLicense);
router.patch("/revoke", revokeLicense);
export default router;
