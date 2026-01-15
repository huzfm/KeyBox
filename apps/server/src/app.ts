import 'dotenv/config'
import session from 'express-session'
import passport from 'passport'
import googleAuthRoutes from "./routes/googleAuth.routes"
import "./config/googleStrategy"




import express, { Application, Express, Request, Response } from "express";
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
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
}))
app.use(passport.initialize())
app.use(passport.session())
app.use('/', googleAuthRoutes)




app.use(express.json());
app.use(morgan("dev"));
app.use(helmet());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

/* 🔥 THIS MAKES MONGO WORK ON VERCEL */
app.use(ensureDB);

/* routes */
app.use("/auth", auth);
app.use("/license", license);
app.use("/validate", validateKey);
app.use("/clients", clientRoutes);
app.use("/projects", projectRoutes);
app.use("/dashboard", dashboardRoutes);

app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "Server running",
    success: true,
    time: new Date().toISOString(),
  });
});

export default app;
