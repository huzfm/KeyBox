import { Request, Response, NextFunction } from "express";
import { connectDB } from "../lib/db";

let ready = false;

export async function ensureDB(
  _req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!ready) {
    await connectDB();
    ready = true;
  }
  next();
}
