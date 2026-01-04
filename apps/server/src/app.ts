import express, { Express, Request, Response } from "express";
import morgan from "morgan";
import mongoose from "mongoose";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import auth from "./routes/auth.routes";
import license from "./routes/license.routes";

import validateKey from "./routes/validate.route";
// import "./utils/expireLicenses";
dotenv.config();

const app: Express = express();

app.use(express.json());
app.use(morgan("dev"));
app.use(helmet());
app.use(
  cors({
    origin: "*", // Adjust this in production to restrict origins
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);

app.use("/auth", auth);
app.use("/license", license);
app.use("/validate", validateKey);

const MONGO_URI: string =
  process.env.MONGO_URI || "mongodb://localhost:27017/your_database";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log(" Connected to MongoDB"))

  .catch((error: Error) => {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  });

app.get("/", (_req: Request, res: Response) =>
  res.json({
    message: "Node mongo express server is running",
    success: true,
    time: new Date().toISOString(),
  })
);

const PORT: number = parseInt(process.env.PORT || "3000", 10);
if (process.env.NODE_ENV === "development") {
  app.listen(PORT, () => {
    console.log(`Server running in development mode on port ${PORT}`);
  });
}

export default app;
