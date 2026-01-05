import express, { Application, Express, Request, Response } from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";

import auth from "./routes/auth.routes";
import license from "./routes/license.routes";
import validateKey from "./routes/validate.route";
import { ensureDB } from "./lib/ensureDB";

const app: Application = express();

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

app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "Server running",
    success: true,
    time: new Date().toISOString(),
  });
});

export default app;
