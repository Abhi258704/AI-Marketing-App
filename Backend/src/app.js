import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import businessRoutes from "./routes/business.routes.js";
import socialAccountRoutes from "./routes/socialAccount.routes.js";
import errorHandler from "./middleware/error.middleware.js";
import aiRoutes from "./routes/ai.routes.js";

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

app.use("/api/businesses", businessRoutes);

app.use("/api/social-accounts", socialAccountRoutes);

app.use("/api/ai", aiRoutes);


app.use(errorHandler);


export default app;