import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { TEMP_MEDIA_ROOT } from "./services/media-storage.service.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import businessRoutes from "./routes/business.routes.js";
import socialAccountRoutes from "./routes/socialAccount.routes.js";
import errorHandler from "./middleware/error.middleware.js";
import aiRoutes from "./routes/ai.routes.js";
import postRoutes from "./routes/post.routes.js";
import postPublicationRoutes from "./routes/postPublication.routes.js";
import instagramRoutes from "./routes/instagram.routes.js";
import facebookRoutes from "./routes/facebook.routes.js";
import publishRoutes from "./routes/publish.routes.js";
import recommendationRoutes from "./routes/recommendation.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Temporary previews are served from Backend/public/temp. Files are promoted to Cloudinary
// when their draft is scheduled or published.
app.use("/temp", express.static(TEMP_MEDIA_ROOT, {
  etag: false,
  maxAge: 0,
  setHeaders(response) {
    response.setHeader("Cache-Control", "no-store");
  },
}));

// Health check endpoint for uptime monitoring
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "ai-marketing-api",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});


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

app.use("/api/posts", postRoutes);

app.use("/api/post-publications", postPublicationRoutes);

app.use("/api/instagram", instagramRoutes);

app.use("/api/facebook", facebookRoutes);

app.use("/api/publish", publishRoutes);

app.use("/api/recommendations", recommendationRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/analytics", analyticsRoutes);

app.use("/api/reviews", reviewRoutes);

app.use("/api/uploads", uploadRoutes);








app.use(errorHandler);


export default app;