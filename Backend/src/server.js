import "dotenv/config";
import app from "./app.js";
import connectDB from "./db/index.js";
import { processScheduledPosts } from "./services/scheduler.service.js";
import { processQueuedWebsiteAudits } from "./services/seo-audit.service.js";
import { validateSocialTokenEncryptionConfig } from "./services/social-token-crypto.service.js";

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  // Fail fast rather than ever storing new social credentials without encryption.
  validateSocialTokenEncryptionConfig();

  // Do not accept requests or start background workers until MongoDB is ready.
  await connectDB();

  app.listen(PORT, () => {
    console.log("Server running on port " + PORT);

    setInterval(() => {
      processScheduledPosts().catch((error) => {
        console.error("Scheduled post worker failed:", error);
      });
    }, 60 * 1000);

    // MongoDB acts as a lightweight queue in this free-provider first release.
    setInterval(() => {
      processQueuedWebsiteAudits().catch((error) => {
        console.error("Website audit worker failed:", error);
      });
    }, 15 * 1000);
  });
};

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
