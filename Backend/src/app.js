import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "AI Marketing Platform API is running",
  });
});


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

export default app;