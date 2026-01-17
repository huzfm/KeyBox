import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { UserType } from "../models/User";

const router: Router = Router();

router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/auth/google/callback",
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("google", { failureRedirect: "/login" })(req, res, next);
  },
  (req: Request, res: Response) => {
    const user = req.user as UserType | undefined;

    if (user) {

      const token = jwt.sign(
        {
          userId: (user as any)._id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET || "defaultsecret",
        { expiresIn: "1h" }
      );

      res.redirect(`https://keyboxx.vercel.app/dashboard?token=${token}`);
    } else {
      res.redirect("https://keyboxx.vercel.app/login?error=auth_failed");
    }
  }
);

export default router;
