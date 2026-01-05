import express, { Express, Request, Response } from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";

import auth from "./routes/auth.routes";
import license from "./routes/license.routes";
import validateKey from "./routes/validate.route";

const app: Express = express();

/* middleware */
app.use(express.json());
app.use(morgan("dev"));
app.use(helmet());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

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
