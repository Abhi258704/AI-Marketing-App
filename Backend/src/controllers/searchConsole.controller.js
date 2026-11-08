import axios from "axios";
import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import Business from "../models/business.model.js";
import GoogleOAuthState from "../models/googleOAuthState.model.js";
import SearchConsoleConnection from "../models/searchConsoleConnection.model.js";
import SearchConsoleProperty from "../models/searchConsoleProperty.model.js";
import SearchConsoleReport from "../models/searchConsoleReport.model.js";
import {
  createSearchConsoleAuthorizationUrl,
  exchangeSearchConsoleCode,
  fetchSearchConsolePerformance,
  fetchSearchConsoleProperties,
  isGoogleReauthorizationError,
  SEARCH_CONSOLE_READONLY_SCOPE,
} from "../services/search-console.service.js";
import {
  buildSearchConsoleDateRange,
  propertyMatchesWebsite,
} from "../services/search-console-helpers.service.js";
import {
  decryptRefreshToken,
  encryptRefreshToken,
  validateSearchConsoleEncryptionConfig,
} from "../services/search-console-crypto.service.js";

const REPORT_CACHE_HOURS = 6;

async function ownedBusiness(businessId, userId) {
  if (!mongoose.isValidObjectId(businessId)) return null;
  return Business.findOne({ _id: businessId, ownerId: userId, isActive: true });
}

function frontendUrl() {
  const value = process.env.FRONTEND_URL || "http://localhost:3000";
  let url;
  try { url = new URL(value); } catch {
    throw new Error("FRONTEND_URL must be a valid frontend origin.");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("FRONTEND_URL must use HTTP or HTTPS.");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("FRONTEND_URL must use HTTPS in production.");
  }
  return url;
}

function callbackRedirect(res, status, message = "") {
  let destination;
  try {
    destination = new URL("/seo/search-console", frontendUrl());
  } catch {
    destination = new URL("http://localhost:3000/seo/search-console");
  }
  destination.searchParams.set("gsc", status);
  if (message) destination.searchParams.set("gsc_message", message.slice(0, 180));
  return res.redirect(302, destination.toString());
}

function safeGoogleError(error) {
  const status = error?.response?.status;
  const message = error?.response?.data?.error?.message || error?.message;
  if (status === 403) return "Google did not allow access to this Search Console property. Check the account's property permissions.";
  if (status === 401) return "Google authorization expired. Connect the Google account again.";
  if (message?.includes("GSC_TOKEN_ENCRYPTION_KEY")) return "The backend token-encryption key is not configured.";
  return "Google Search Console could not complete this request. Check the connection and try again.";
}

export async function startSearchConsoleConnection(req, res) {
  try {
    validateSearchConsoleEncryptionConfig();
    frontendUrl();
    const state = randomBytes(32).toString("hex");
    const stateHash = createHash("sha256").update(state).digest("hex");
    await GoogleOAuthState.create({
      stateHash,
      userId: req.user._id,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    const authorizationUrl = await createSearchConsoleAuthorizationUrl(state);
    return res.status(200).json({ authorizationUrl });
  } catch (error) {
    console.error("Start Search Console OAuth error:", error.message);
    return res.status(503).json({ message: error.message || "Google Search Console connection is not configured." });
  }
}

export async function searchConsoleOAuthCallback(req, res) {
  let stateRecord = null;
  try {
    const state = String(req.query.state || "");
    if (!/^[a-f0-9]{64}$/i.test(state)) return callbackRedirect(res, "error", "The Google connection state is invalid or expired. Start again.");
    const stateHash = createHash("sha256").update(state).digest("hex");
    stateRecord = await GoogleOAuthState.findOneAndDelete({
      stateHash,
      expiresAt: { $gt: new Date() },
    });
    if (!stateRecord) return callbackRedirect(res, "error", "The Google connection request expired. Start again.");
    if (req.query.error) return callbackRedirect(res, "error", "Google access was cancelled or denied.");
    const code = String(req.query.code || "");
    if (!code) return callbackRedirect(res, "error", "Google did not return an authorization code.");

    const tokens = await exchangeSearchConsoleCode(code);
    const existing = await SearchConsoleConnection.findOne({ userId: stateRecord.userId })
      .select("+refreshTokenEncrypted");
    let refreshToken = tokens.refresh_token || null;
    if (!refreshToken && existing?.refreshTokenEncrypted) {
      refreshToken = decryptRefreshToken(existing.refreshTokenEncrypted);
    }
    if (!refreshToken) {
      return callbackRedirect(res, "error", "Google did not provide offline access. Retry and approve the requested access.");
    }

    let profile = {};
    if (tokens.access_token) {
      try {
        const response = await axios.get("https://openidconnect.googleapis.com/v1/userinfo", {
          headers: { Authorization: "Bearer " + tokens.access_token },
          timeout: 15000,
        });
        profile = response.data || {};
      } catch {
        // The Search Console connection can still work if profile email lookup is unavailable.
      }
    }

    const previousEmail = existing?.googleEmail?.toLowerCase() || null;
    const nextEmail = profile.email?.toLowerCase() || previousEmail;
    const accountChanged = Boolean(previousEmail && nextEmail && previousEmail !== nextEmail);
    const connection = await SearchConsoleConnection.findOneAndUpdate(
      { userId: stateRecord.userId },
      {
        $set: {
          googleEmail: nextEmail,
          googleName: profile.name || existing?.googleName || null,
          refreshTokenEncrypted: encryptRefreshToken(refreshToken),
          scopes: tokens.scope ? tokens.scope.split(" ") : [SEARCH_CONSOLE_READONLY_SCOPE],
          status: "connected",
          connectedAt: new Date(),
          lastError: null,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    if (accountChanged) {
      await SearchConsoleProperty.deleteMany({ userId: stateRecord.userId });
      await SearchConsoleReport.deleteMany({ userId: stateRecord.userId });
    }

    return callbackRedirect(res, "connected");
  } catch (error) {
    console.error("Search Console OAuth callback error:", error.response?.data || error.message);
    return callbackRedirect(res, "error", safeGoogleError(error));
  }
}

export async function getSearchConsoleConnection(req, res) {
  try {
    const business = await ownedBusiness(req.params.businessId, req.user._id);
    if (!business) return res.status(404).json({ message: "Business not found." });
    const [connection, property] = await Promise.all([
      SearchConsoleConnection.findOne({ userId: req.user._id }).select("googleEmail googleName status connectedAt lastUsedAt"),
      SearchConsoleProperty.findOne({ businessId: business._id, userId: req.user._id }).select("siteUrl permissionLevel selectedAt"),
    ]);
    return res.status(200).json({
      connected: connection?.status === "connected",
      connection: connection ? {
        googleEmail: connection.googleEmail,
        googleName: connection.googleName,
        status: connection.status,
        connectedAt: connection.connectedAt,
        lastUsedAt: connection.lastUsedAt,
      } : null,
      property: property ? {
        siteUrl: property.siteUrl,
        permissionLevel: property.permissionLevel,
        selectedAt: property.selectedAt,
      } : null,
    });
  } catch (error) {
    console.error("Get Search Console connection error:", error.message);
    return res.status(500).json({ message: "Could not load the Search Console connection." });
  }
}

async function getConnectedAccount(userId) {
  return SearchConsoleConnection.findOne({ userId, status: "connected" }).select("+refreshTokenEncrypted");
}

export async function listSearchConsoleProperties(req, res) {
  try {
    const business = await ownedBusiness(req.params.businessId, req.user._id);
    if (!business) return res.status(404).json({ message: "Business not found." });
    const connection = await getConnectedAccount(req.user._id);
    if (!connection) return res.status(409).json({ message: "Connect Google Search Console first." });
    const properties = await fetchSearchConsoleProperties(connection);
    await SearchConsoleConnection.updateOne({ _id: connection._id }, { $set: { lastUsedAt: new Date(), lastError: null } });
    return res.status(200).json({
      properties: properties.map((property) => ({
        ...property,
        matchesBusiness: propertyMatchesWebsite(property.siteUrl, business.website),
        selectable: property.permissionLevel !== "siteUnverifiedUser" && propertyMatchesWebsite(property.siteUrl, business.website),
      })),
    });
  } catch (error) {
    if (isGoogleReauthorizationError(error)) {
      await SearchConsoleConnection.updateOne({ userId: req.user._id }, {
        $set: { status: "reauthorization_required", lastError: "Google authorization needs to be renewed." },
      });
    }
    console.error("List Search Console properties error:", error.response?.data || error.message);
    return res.status(error.response?.status === 403 ? 403 : 502).json({ message: safeGoogleError(error) });
  }
}

export async function selectSearchConsoleProperty(req, res) {
  try {
    const business = await ownedBusiness(req.params.businessId, req.user._id);
    if (!business) return res.status(404).json({ message: "Business not found." });
    if (!business.website) return res.status(400).json({ message: "Add the business website before selecting a Search Console property." });

    const siteUrl = String(req.body?.siteUrl || "").trim();
    if (!siteUrl) return res.status(400).json({ message: "Choose a Search Console property." });
    const connection = await getConnectedAccount(req.user._id);
    if (!connection) return res.status(409).json({ message: "Connect Google Search Console first." });

    const properties = await fetchSearchConsoleProperties(connection);
    const property = properties.find((item) => item.siteUrl === siteUrl);
    if (!property || property.permissionLevel === "siteUnverifiedUser") {
      return res.status(403).json({ message: "This Google account does not have sufficient access to that Search Console property." });
    }
    if (!propertyMatchesWebsite(siteUrl, business.website)) {
      return res.status(400).json({ message: "That Search Console property does not match this business website. Choose the matching domain or URL-prefix property." });
    }

    await SearchConsoleProperty.findOneAndUpdate(
      { businessId: business._id },
      {
        $set: {
          userId: req.user._id,
          connectionId: connection._id,
          siteUrl,
          permissionLevel: property.permissionLevel,
          selectedAt: new Date(),
        },
      },
      { new: true, upsert: true, runValidators: true }
    );
    await SearchConsoleReport.deleteMany({ businessId: business._id });
    return res.status(200).json({
      message: "Search Console property connected to this business.",
      property: { siteUrl, permissionLevel: property.permissionLevel },
    });
  } catch (error) {
    console.error("Select Search Console property error:", error.response?.data || error.message);
    return res.status(error.response?.status === 403 ? 403 : 502).json({ message: safeGoogleError(error) });
  }
}

export async function getSearchConsolePerformance(req, res) {
  try {
    const business = await ownedBusiness(req.params.businessId, req.user._id);
    if (!business) return res.status(404).json({ message: "Business not found." });
    const selected = await SearchConsoleProperty.findOne({ businessId: business._id, userId: req.user._id });
    if (!selected) return res.status(409).json({ message: "Select a matching Search Console property first." });
    const connection = await getConnectedAccount(req.user._id);
    if (!connection || String(selected.connectionId) !== String(connection._id)) {
      return res.status(409).json({ message: "Reconnect the Google account that owns this Search Console property." });
    }

    const range = buildSearchConsoleDateRange(req.query.days);
    const forceRefresh = req.query.refresh === "true";
    const now = new Date();
    let report = null;
    if (!forceRefresh) {
      report = await SearchConsoleReport.findOne({
        businessId: business._id,
        startDate: range.startDate,
        endDate: range.endDate,
        expiresAt: { $gt: now },
      }).lean();
    }

    if (!report) {
      const fresh = await fetchSearchConsolePerformance(connection, selected.siteUrl, range);
      const expiresAt = new Date(Date.now() + REPORT_CACHE_HOURS * 60 * 60 * 1000);
      report = await SearchConsoleReport.findOneAndUpdate(
        { businessId: business._id, startDate: range.startDate, endDate: range.endDate },
        {
          $set: {
            userId: req.user._id,
            siteUrl: selected.siteUrl,
            startDate: fresh.startDate,
            endDate: fresh.endDate,
            totals: fresh.totals,
            daily: fresh.daily,
            queries: fresh.queries,
            pages: fresh.pages,
            countries: fresh.countries,
            devices: fresh.devices,
            fetchedAt: fresh.fetchedAt,
            expiresAt,
          },
        },
        { new: true, upsert: true, runValidators: true }
      ).lean();
    }

    await SearchConsoleConnection.updateOne({ _id: connection._id }, {
      $set: { lastUsedAt: new Date(), lastError: null },
    });

    return res.status(200).json({
      report: {
        siteUrl: report.siteUrl,
        startDate: report.startDate,
        endDate: report.endDate,
        totals: report.totals,
        daily: report.daily,
        queries: report.queries,
        pages: report.pages,
        countries: report.countries,
        devices: report.devices,
        fetchedAt: report.fetchedAt,
        cacheExpiresAt: report.expiresAt,
        note: "Search Console data is typically delayed by 2–3 days. Query rows are limited to the top rows returned by Google.",
      },
    });
  } catch (error) {
    if (isGoogleReauthorizationError(error)) {
      await SearchConsoleConnection.updateOne({ userId: req.user._id }, {
        $set: { status: "reauthorization_required", lastError: "Google authorization needs to be renewed." },
      });
    }
    console.error("Search Console performance error:", error.response?.data || error.message);
    const status = error.response?.status === 403 ? 403 : error.response?.status === 400 ? 400 : 502;
    return res.status(status).json({ message: safeGoogleError(error) });
  }
}

export async function disconnectSearchConsole(req, res) {
  try {
    const connection = await SearchConsoleConnection.findOne({ userId: req.user._id });
    if (!connection) return res.status(200).json({ message: "Google Search Console is already disconnected." });
    await Promise.all([
      SearchConsoleProperty.deleteMany({ userId: req.user._id }),
      SearchConsoleReport.deleteMany({ userId: req.user._id }),
      GoogleOAuthState.deleteMany({ userId: req.user._id }),
      SearchConsoleConnection.deleteOne({ _id: connection._id }),
    ]);
    return res.status(200).json({ message: "Google Search Console disconnected and stored credentials deleted." });
  } catch (error) {
    console.error("Disconnect Search Console error:", error.message);
    return res.status(500).json({ message: "Could not disconnect Google Search Console." });
  }
}
