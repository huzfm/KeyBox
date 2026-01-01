import { Router } from "express";
import {
  createLicense,
  getUsersAndLicenses,
  revokeLicense,
  getUserWithLicenses,
} from "../controllers/license.controller";
import { auth } from "../middleware/jwt";
const router = Router();

router.post("/create", auth, createLicense);
router.patch("/revoke", revokeLicense);
router.get("/user-licenses", getUsersAndLicenses);

router.get("/me", auth, getUserWithLicenses);

router.get("/user/:id", auth, getUserWithLicenses);
export default router;
