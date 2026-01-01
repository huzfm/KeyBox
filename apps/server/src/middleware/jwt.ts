// middleware/jwt.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = header.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "defaultsecret"
    ) as {
      userId: string;
      email: string;
      role: string;
    };

    req.userId = decoded.userId; // Extract user ID
    req.userRole = decoded.role; // Extract role (optional for permissions)

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Unauthorized",
      error: (err as Error).message,
    });
  }
};
