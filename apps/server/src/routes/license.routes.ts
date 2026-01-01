import { Router } from "express";
import {
  createLicense,
  getUsersAndLicense,
  getUsersAndLicenses,
  revokeLicense,
} from "../controllers/license.controller";
import { get } from "http";
const router = Router();

router.post("/create", createLicense);
router.patch("/revoke", revokeLicense);
router.get("/user-licenses", getUsersAndLicenses);
router.get("/user/:id/licenses", getUsersAndLicense);
export default router;
