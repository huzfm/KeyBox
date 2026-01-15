import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { UserType } from "../models/User";

const router: Router = Router();

/**
 * Initiates Google OAuth flow
 */
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

/**
 * Handles Google OAuth callback
 */
router.get(
  "/auth/google/callback",
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("google", { failureRedirect: "/login" })(req, res, next);
  },
  (req: Request, res: Response) => {
    const user = req.user as UserType | undefined;

    if (user) {
      // Generate JWT token
      const token = jwt.sign(
        {
          userId: (user as any)._id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET || "defaultsecret",
        { expiresIn: "1h" }
      );

      // Redirect to frontend with token
      // You can customize this URL based on your frontend routes
      res.redirect(`http://localhost:3000/dashboard?token=${token}`);
    } else {
      res.redirect("http://localhost:3000/login?error=auth_failed");
    }
  }
);

export default router;
