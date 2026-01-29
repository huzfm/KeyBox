import 'dotenv/config'
import session from 'express-session'
import passport from 'passport'
import { NextFunction } from 'express'
import googleAuthRoutes from "./routes/googleAuth.routes"
import "./config/googleStrategy"

import express, { Application, Request, Response } from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";

import auth from "./routes/auth.routes";
import license from "./routes/license.routes";
import validateKey from "./routes/validate.route";
import { ensureDB } from "./lib/ensureDB";
import clientRoutes from "./routes/client.route";
import projectRoutes from "./routes/project.routes";
import dashboardRoutes from "./routes/dashboard.routes";

const app: Application = express();
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use(helmet());

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
}))
app.use(passport.initialize())
app.use(passport.session())
app.use('/', googleAuthRoutes)


if (process.env.NODE_ENV !== 'test') {
  app.use(ensureDB);
}

app.use("/api/v1/auth", auth);
app.use("/api/v1/license", license);
app.use("/validate", validateKey);
app.use("/api/v1/clients", clientRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("🔥 Global Error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});



app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "Server running",
    success: true,
    time: new Date().toISOString(),
  });
});

export default app;
