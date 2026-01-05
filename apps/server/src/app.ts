import express, { Express, Request, Response } from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";

import auth from "./routes/auth.routes";
import license from "./routes/license.routes";
import validateKey from "./routes/validate.route";
import { ensureDB } from "./lib/ensureDB";

dotenv.config();

const app: Express = express();

/* middleware */
app.use(express.json());
app.use(morgan("dev"));
app.use(helmet());
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));

/* 🔥 BLOCK REQUESTS UNTIL DB IS READY */
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

/* dev only */
if (process.env.NODE_ENV === "development") {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, () => {
    console.log(`Dev server running on port ${PORT}`);
  });
}

export default app;
