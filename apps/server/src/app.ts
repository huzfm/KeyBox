import "dotenv/config";
import express, { Application, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import "./config/googleStrategy";

import googleAuthRoutes from "./routes/googleAuth.routes";
import auth from "./routes/auth.routes";
import license from "./routes/license.routes";
import validateKey from "./routes/validate.route";
import clientRoutes from "./routes/client.route";
import projectRoutes from "./routes/project.routes";
import dashboardRoutes from "./routes/dashboard.routes";

const app: Application = express();


app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
}));

app.use(express.json());
app.use(morgan("dev"));
app.use(helmet());

app.use(session({
  name: "sid",
  secret: process.env.SESSION_SECRET || "session_secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  }
}));

app.use(passport.initialize());
app.use(passport.session());


app.use("/", googleAuthRoutes);
app.use("/auth", auth);
app.use("/license", license);
app.use("/validate", validateKey);
app.use("/clients", clientRoutes);
app.use("/projects", projectRoutes);
app.use("/dashboard", dashboardRoutes);


app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Server running",
    time: new Date().toISOString(),
  });
});


app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("🔥 Global Error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

export default app;
