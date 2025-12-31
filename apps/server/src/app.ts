import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import userRoutes from "./routes/userRoutes";

dotenv.config();

const app = express();
app.use(express.json());
app.use(morgan("dev"));

app.use("/api", userRoutes);

app.get("/", (req, res) => {
res.json({ message: "Node PostgreSQL Typescript is running " });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log(`🚀 Server running on http://localhost:${PORT}`);
});