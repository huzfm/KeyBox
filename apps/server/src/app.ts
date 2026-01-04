// import express, { Express, Request, Response } from "express";
// import morgan from "morgan";
// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import helmet from "helmet";
// import cors from "cors";
// import auth from "./routes/auth.routes";
// import license from "./routes/license.routes";
// import serverless from "serverless-http";

// import validateKey from "./routes/validate.route";
// import "./utils/expireLicenses";
// dotenv.config();

// const app: Express = express();
// export const handler = serverless(app);

// app.use(express.json());
// app.use(morgan("dev"));
// app.use(helmet());
// app.use(
//   cors({
//     origin: "*", // Adjust this in production to restrict origins
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
//   })
// );

// app.use("/auth", auth);
// app.use("/license", license);
// app.use("/validate", validateKey);

// const MONGO_URI: string =
//   process.env.MONGO_URI || "mongodb://localhost:27017/your_database";

// mongoose
//   .connect(MONGO_URI)
//   .then(() => console.log(" Connected to MongoDB"))

//   .catch((error: Error) => {
//     console.error("MongoDB connection error:", error.message);
//     process.exit(1);
//   });

// app.get("/", (_req: Request, res: Response) =>
//   res.json({
//     message: "Node mongo express server is running",
//     success: true,
//     time: new Date().toISOString(),
//   })
// );

// const PORT: number = parseInt(process.env.PORT || "3000", 10);
// if (process.env.NODE_ENV === "development") {
//   app.listen(PORT, () => {
//     console.log(`Server running in development mode on port ${PORT}`);
//   });
// }

// export default serverless(app);

import express from "express";
import morgan from "morgan";
import mongoose from "mongoose";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import serverless from "serverless-http";

import auth from "./routes/auth.routes";
import license from "./routes/license.routes";
import validateKey from "./routes/validate.route";

dotenv.config();

const app = express();

/* ---------------- MIDDLEWARE ---------------- */

app.use(express.json());
app.use(morgan("dev"));
app.use(helmet());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);

/* ---------------- ROUTES ---------------- */

app.use("/auth", auth);
app.use("/license", license);
app.use("/validate", validateKey);

app.get("/", (_req, res) =>
  res.json({
    message: "Serverless API running",
    success: true,
    time: new Date().toISOString(),
  })
);

/* ---------------- MONGODB (CACHED) ---------------- */

const MONGO_URI = process.env.MONGO_URI!;
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

/* ---------------- SERVERLESS HANDLER ---------------- */

export const handler = async (event: any, context: any) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await connectDB();
  return serverless(app)(event, context);
};
/* ---------------- LOCAL DEV SERVER ---------------- */

if (process.env.NODE_ENV === "development") {
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.listen(PORT, () => {
    console.log(`Server running in development mode on port ${PORT}`);
  });
}
