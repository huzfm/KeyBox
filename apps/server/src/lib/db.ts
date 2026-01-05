import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

mongoose.set("bufferCommands", false);

const MONGO_URI = process.env.MONGO_URI as string;

if (!MONGO_URI) {
  throw new Error("MONGO_URI is not defined");
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    console.log("🟡 Connecting to MongoDB...");

    cached.promise = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // 🔥 FAIL FAST (5s)
      socketTimeoutMS: 5000,
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log("🟢 MongoDB connected");
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    console.error("🔴 MongoDB connection failed:", err);
    throw err;
  }
}
