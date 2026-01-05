import { Request, Response, NextFunction } from "express";
import { connectDB } from "./db";

let ready = false;

export async function ensureDB(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  if (ready) return next();

  try {
    await connectDB();
    ready = true;
    next();
  } catch (err) {
    console.error("Mongo connection failed", err);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
}
