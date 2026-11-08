import "dotenv/config";
import app from "./app.js";
import connectDB from "./db/index.js";
import { processScheduledPosts } from "./services/scheduler.service.js";
import { processQueuedWebsiteAudits } from "./services/seo-audit.service.js";

const PORT = process.env.PORT || 8000;
connectDB();

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
  setInterval(() => {
    processScheduledPosts();
  }, 60 * 1000);

  // MongoDB acts as a lightweight queue in this free-provider first release.
  setInterval(() => {
    processQueuedWebsiteAudits();
  }, 15 * 1000);
});
