import { Router } from "express";
import {
  createLicense,
  getUsersAndLicenses,
  toggleLicense,
  getUserWithLicenses,
  test,
} from "../controllers/license.controller";
import { auth } from "../middleware/jwt";
const router = Router();

router.post("/create", auth, createLicense);
router.patch("/revoke/:key", toggleLicense);
router.get("/user-licenses", getUsersAndLicenses);

router.get("/me", auth, getUserWithLicenses);

router.get("/user/:id", auth, getUserWithLicenses);
router.get("/user-license", auth, test);
export default router;
