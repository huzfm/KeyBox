import { Router } from "express";
import {
  createLicense,
  revokeLicense,
} from "../controllers/license.controller";
const router = Router();
router.post("/create", createLicense);
router.put("/revoke/:key", revokeLicense);
export default router;
