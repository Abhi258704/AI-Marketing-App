import "dotenv/config";
import connectDB from "../db/index.js";
import SocialAccount from "../models/socialAccount.model.js";
import { setSocialAccountToken } from "../services/social-token-crypto.service.js";

async function migrateSocialAccountTokens() {
  await connectDB();
  const accounts = await SocialAccount.find({
    $or: [
      { accessToken: { $type: "string", $ne: "" } },
      { refreshToken: { $type: "string", $ne: "" } },
    ],
  });

  let migrated = 0;
  for (const account of accounts) {
    if (account.accessToken) setSocialAccountToken(account, "accessToken", account.accessToken);
    if (account.refreshToken) setSocialAccountToken(account, "refreshToken", account.refreshToken);
    await account.save();
    migrated += 1;
  }

  console.log(`Social token migration complete. Processed ${migrated} account(s).`);
  process.exit(0);
}

migrateSocialAccountTokens().catch((error) => {
  console.error("Social token migration failed:", error);
  process.exit(1);
});
