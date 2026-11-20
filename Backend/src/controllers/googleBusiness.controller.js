import { createHash, randomBytes } from "node:crypto";
import GoogleBusinessConnection from "../models/googleBusinessConnection.model.js";
import GoogleBusinessOAuthState from "../models/googleBusinessOAuthState.model.js";
import {
  fetchGoogleBusinessAccounts,
  fetchGoogleBusinessLocations,
  getGoogleBusinessAccessToken,
} from "../services/google-business.service.js";
import {
  createGoogleBusinessAuthorizationUrl,
  exchangeGoogleBusinessCode,
  getGoogleBusinessProfile,
} from "../services/google-business.service.js";
import {
  decryptGoogleBusinessToken,
  encryptGoogleBusinessToken,
  validateGoogleBusinessEncryptionConfig,
} from "../services/google-business-crypto.service.js";

function getFrontendUrl() {
  const value = process.env.FRONTEND_URL || "http://localhost:3000";
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error("FRONTEND_URL must be a valid frontend origin.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("FRONTEND_URL must use HTTP or HTTPS.");
  }

  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("FRONTEND_URL must use HTTPS in production.");
  }

  return url;
}

function redirectToFrontend(res, status, message = "") {
  const destination = new URL("/", getFrontendUrl());
  destination.searchParams.set("gbp", status);

  if (message) {
    destination.searchParams.set("gbp_message", message.slice(0, 180));
  }

  return res.redirect(302, destination.toString());
}

function safeGoogleError(error) {
  const status = error?.response?.status;
  if (status === 401) return "Google authorization expired. Connect the account again.";
  if (status === 403) return "Google did not allow access. Check the Google account permissions and API access.";
  if (error?.message?.includes("GBP_TOKEN_ENCRYPTION_KEY")) {
    return "The backend Google Business token-encryption key is not configured.";
  }
  return "Google Business Profile could not complete the connection. Check the configuration and try again.";
}

export async function startGoogleBusinessConnection(req, res) {
  try {
    validateGoogleBusinessEncryptionConfig();
    getFrontendUrl();

    const state = randomBytes(32).toString("hex");
    const stateHash = createHash("sha256").update(state).digest("hex");

    await GoogleBusinessOAuthState.create({
      stateHash,
      userId: req.user._id,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const authorizationUrl = createGoogleBusinessAuthorizationUrl(state);
    return res.status(200).json({ authorizationUrl });
  } catch (error) {
    console.error("Start Google Business OAuth error:", error.message);
    return res.status(503).json({
      message: error.message || "Google Business Profile connection is not configured.",
    });
  }
}

export async function googleBusinessOAuthCallback(req, res) {
  try {
    const state = String(req.query.state || "");

    if (!/^[a-f0-9]{64}$/i.test(state)) {
      return redirectToFrontend(res, "error", "The Google connection state is invalid or expired. Start again.");
    }

    const stateHash = createHash("sha256").update(state).digest("hex");
    const stateRecord = await GoogleBusinessOAuthState.findOneAndDelete({
      stateHash,
      expiresAt: { $gt: new Date() },
    });

    if (!stateRecord) {
      return redirectToFrontend(res, "error", "The Google connection request expired. Start again.");
    }

    if (req.query.error) {
      return redirectToFrontend(res, "error", "Google access was cancelled or denied.");
    }

    const code = String(req.query.code || "");
    if (!code) {
      return redirectToFrontend(res, "error", "Google did not return an authorization code.");
    }

    const tokens = await exchangeGoogleBusinessCode(code);
    const existing = await GoogleBusinessConnection.findOne({
      userId: stateRecord.userId,
    }).select("+refreshTokenEncrypted");

    let profile = {};
    if (tokens.access_token) {
      try {
        profile = await getGoogleBusinessProfile(tokens.access_token);
      } catch (error) {
        console.warn("Google Business profile lookup failed:", error.message);
      }
    }

    const previousEmail = existing?.googleEmail?.toLowerCase() || null;
    const nextEmail = profile.email?.toLowerCase() || previousEmail;
    const accountChanged = Boolean(
      previousEmail && nextEmail && previousEmail !== nextEmail
    );

    let refreshToken = tokens.refresh_token || null;

    if (!refreshToken && existing?.refreshTokenEncrypted && !accountChanged) {
      refreshToken = decryptGoogleBusinessToken(existing.refreshTokenEncrypted);
    }

    if (!refreshToken) {
      return redirectToFrontend(
        res,
        "error",
        "Google did not provide an offline refresh token. Retry and approve access for the selected Google account."
      );
    }

    await GoogleBusinessConnection.findOneAndUpdate(
      { userId: stateRecord.userId },
      {
        $set: {
          googleEmail: nextEmail,
          googleName: profile.name || existing?.googleName || null,
          refreshTokenEncrypted: encryptGoogleBusinessToken(refreshToken),
          scopes: tokens.scope ? tokens.scope.split(" ") : [],
          status: "connected",
          connectedAt: new Date(),
          lastError: null,
        },
      },
      { returnDocument: "after", upsert: true, runValidators: true }
    );

    return redirectToFrontend(res, "connected");
  } catch (error) {
    console.error(
      "Google Business OAuth callback error:",
      error.response?.data || error.message
    );

    try {
      return redirectToFrontend(res, "error", safeGoogleError(error));
    } catch (redirectError) {
      console.error("Google Business callback redirect error:", redirectError.message);
      return res.status(500).send("Google Business Profile connection failed. Return to the app and try again.");
    }
  }
}


async function getConnectedGoogleBusinessAccount(userId) {
  return GoogleBusinessConnection.findOne({
    userId,
    status: "connected",
  }).select("+refreshTokenEncrypted");
}

export async function listGoogleBusinessAccounts(req, res) {
  try {
    const connection = await getConnectedGoogleBusinessAccount(req.user._id);
    if (!connection) {
      return res.status(409).json({ message: "Connect Google Business Profile first." });
    }

    const accessToken = await getGoogleBusinessAccessToken(
      connection,
      decryptGoogleBusinessToken
    );
    const accounts = await fetchGoogleBusinessAccounts(accessToken);

    return res.status(200).json({
      accounts: accounts.map((account) => ({
        name: account.name,
        accountName: account.accountName || null,
        type: account.type || null,
        role: account.role || null,
        permissionLevel: account.permissionLevel || null,
      })),
    });
  } catch (error) {
    console.error("List Google Business accounts error:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      await GoogleBusinessConnection.updateOne(
        { userId: req.user._id },
        { $set: { status: "reauthorization_required", lastError: "Google authorization needs to be renewed." } }
      );
    }
    return res.status(error.response?.status === 403 ? 403 : 502).json({
      message: error.response?.data?.error?.message || safeGoogleError(error),
    });
  }
}

export async function listGoogleBusinessLocations(req, res) {
  try {
    const connection = await getConnectedGoogleBusinessAccount(req.user._id);
    if (!connection) {
      return res.status(409).json({ message: "Connect Google Business Profile first." });
    }

    const accountId = String(req.params.accountId || "");
    if (!/^[A-Za-z0-9_-]+$/.test(accountId)) {
      return res.status(400).json({ message: "Invalid Google Business account ID." });
    }

    const accessToken = await getGoogleBusinessAccessToken(
      connection,
      decryptGoogleBusinessToken
    );
    const locations = await fetchGoogleBusinessLocations(
      accessToken,
      `accounts/${accountId}`
    );

    return res.status(200).json({
      locations: locations.map((location) => ({
        name: location.name,
        title: location.title || null,
        storeCode: location.storeCode || null,
        websiteUri: location.websiteUri || null,
        phoneNumbers: location.phoneNumbers || null,
        storefrontAddress: location.storefrontAddress || null,
        primaryCategory: location.primaryCategory || null,
        metadata: location.metadata || null,
      })),
    });
  } catch (error) {
    console.error("List Google Business locations error:", error.response?.data || error.message);
    if (error.response?.status === 401) {
      await GoogleBusinessConnection.updateOne(
        { userId: req.user._id },
        { $set: { status: "reauthorization_required", lastError: "Google authorization needs to be renewed." } }
      );
    }
    return res.status(error.response?.status === 403 ? 403 : 502).json({
      message: error.response?.data?.error?.message || safeGoogleError(error),
    });
  }
}

export async function getGoogleBusinessConnection(req, res) {
  try {
    const connection = await GoogleBusinessConnection.findOne({
      userId: req.user._id,
    }).select("googleEmail googleName scopes status connectedAt updatedAt");

    return res.status(200).json({
      connected: connection?.status === "connected",
      connection: connection
        ? {
            googleEmail: connection.googleEmail,
            googleName: connection.googleName,
            scopes: connection.scopes,
            status: connection.status,
            connectedAt: connection.connectedAt,
            updatedAt: connection.updatedAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Get Google Business connection error:", error.message);
    return res.status(500).json({
      message: "Could not load the Google Business Profile connection.",
    });
  }
}

export async function disconnectGoogleBusiness(req, res) {
  try {
    await Promise.all([
      GoogleBusinessConnection.deleteOne({ userId: req.user._id }),
      GoogleBusinessOAuthState.deleteMany({ userId: req.user._id }),
    ]);

    return res.status(200).json({
      message: "Google Business Profile disconnected and stored credentials deleted.",
    });
  } catch (error) {
    console.error("Disconnect Google Business error:", error.message);
    return res.status(500).json({
      message: "Could not disconnect Google Business Profile.",
    });
  }
}
