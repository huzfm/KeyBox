import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { UserType } from "../models/User";

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get("/auth/google/callback", (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    "google",
    { session: false },
    (err: any, user: UserType | false) => {
      try {
        if (err) {
          console.error("Google OAuth Error:", err);
          return res.redirect(`${FRONTEND_URL}/login?error=oauth_error`);
        }

        if (!user) {
          return res.redirect(`${FRONTEND_URL}/login?error=no_user`);
        }

        const token = jwt.sign(
          {
            userId: (user as any)._id,
            email: user.email,
            role: user.role,
          },
          process.env.JWT_SECRET || "defaultsecret",
          { expiresIn: "1h" }
        );

        return res.redirect(`${FRONTEND_URL}/dashboard?token=${token}`);
      } catch (e) {
        console.error("Callback Crash:", e);
        return res.redirect(`${FRONTEND_URL}/login?error=server_error`);
      }
    }
  )(req, res, next);
});

export default router;
