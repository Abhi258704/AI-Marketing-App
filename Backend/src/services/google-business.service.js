import axios from "axios";
import { OAuth2Client } from "google-auth-library";

export const GOOGLE_BUSINESS_SCOPE =
  "https://www.googleapis.com/auth/business.manage";

export function createGoogleBusinessOAuthClient() {
  const clientId = process.env.GBP_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GBP_GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GBP_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google Business OAuth is not configured. Add GBP_GOOGLE_CLIENT_ID, GBP_GOOGLE_CLIENT_SECRET and GBP_REDIRECT_URI to the backend environment."
    );
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

export function createGoogleBusinessAuthorizationUrl(state) {
  const client = createGoogleBusinessOAuthClient();

  return client.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent select_account",
    state,
    scope: [GOOGLE_BUSINESS_SCOPE, "openid", "email", "profile"],
  });
}

export async function exchangeGoogleBusinessCode(code) {
  const client = createGoogleBusinessOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function getGoogleBusinessProfile(accessToken) {
  const client = createGoogleBusinessOAuthClient();
  client.setCredentials({ access_token: accessToken });
  const response = await client.request({
    url: "https://openidconnect.googleapis.com/v1/userinfo",
  });
  return response.data || {};
}

export async function getGoogleBusinessAccessToken(connection, decryptToken) {
  if (!connection?.refreshTokenEncrypted) {
    throw new Error("Google Business Profile is not connected.");
  }

  const client = createGoogleBusinessOAuthClient();
  client.setCredentials({
    refresh_token: decryptToken(connection.refreshTokenEncrypted),
  });

  const { token } = await client.getAccessToken();
  if (!token) {
    throw new Error("Google could not refresh the access token. Reconnect the Google account.");
  }

  return token;
}

async function getAllPages(url, accessToken, params = {}, collectionKey) {
  const items = [];
  let pageToken;

  do {
    const response = await axios.get(url, {
      headers: { Authorization: "Bearer " + accessToken },
      params: { ...params, ...(pageToken ? { pageToken } : {}) },
      timeout: 20000,
    });
    items.push(...(response.data?.[collectionKey] || []));
    pageToken = response.data?.nextPageToken;
  } while (pageToken);

  return items;
}

export async function fetchGoogleBusinessAccounts(accessToken) {
  return getAllPages(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    accessToken,
    { pageSize: 20 },
    "accounts"
  );
}

export async function fetchGoogleBusinessReviews(accessToken, accountName, locationName, pageToken = "") {
  if (!/^accounts\/[A-Za-z0-9_-]+$/.test(accountName)) {
    throw new Error("Invalid Google Business account.");
  }
  if (!/^locations\/[A-Za-z0-9_-]+$/.test(locationName)) {
    throw new Error("Invalid Google Business location.");
  }

  const response = await axios.get(
    `https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/reviews`,
    {
      headers: { Authorization: "Bearer " + accessToken },
      params: {
        pageSize: 50,
        orderBy: "updateTime desc",
        ...(pageToken ? { pageToken } : {}),
      },
      timeout: 20000,
    }
  );

  return response.data || {};
}

export async function fetchGoogleBusinessReview(accessToken, accountName, locationName, reviewName) {
  if (!/^accounts\/[A-Za-z0-9_-]+$/.test(accountName)) {
    throw new Error("Invalid Google Business account.");
  }
  if (!/^locations\/[A-Za-z0-9_-]+$/.test(locationName)) {
    throw new Error("Invalid Google Business location.");
  }
  const expectedReviewPrefix = `${accountName}/${locationName}/reviews/`;
  if (
    typeof reviewName !== "string" ||
    !reviewName.startsWith(expectedReviewPrefix) ||
    !/^[A-Za-z0-9_=-]+$/.test(reviewName.slice(expectedReviewPrefix.length))
  ) {
    throw new Error("This is not a valid review for the mapped Google Business location.");
  }

  const response = await axios.get(`https://mybusiness.googleapis.com/v4/${reviewName}`, {
    headers: { Authorization: "Bearer " + accessToken },
    timeout: 20000,
  });
  return response.data || {};
}

export async function publishGoogleBusinessReviewReply(
  accessToken,
  accountName,
  locationName,
  reviewName,
  comment
) {
  if (!/^accounts\/[A-Za-z0-9_-]+$/.test(accountName)) {
    throw new Error("Invalid Google Business account.");
  }
  if (!/^locations\/[A-Za-z0-9_-]+$/.test(locationName)) {
    throw new Error("Invalid Google Business location.");
  }
  const expectedReviewPrefix = `${accountName}/${locationName}/reviews/`;
  if (
    typeof reviewName !== "string" ||
    !reviewName.startsWith(expectedReviewPrefix) ||
    !/^[A-Za-z0-9_=-]+$/.test(reviewName.slice(expectedReviewPrefix.length))
  ) {
    throw new Error("This is not a valid review for the mapped Google Business location.");
  }
  if (typeof comment !== "string" || !comment.trim() || Buffer.byteLength(comment, "utf8") > 4096) {
    throw new Error("Google review replies must contain 1–4,096 UTF-8 bytes.");
  }

  const response = await axios.put(
    `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
    { comment: comment.trim() },
    {
      headers: { Authorization: "Bearer " + accessToken },
      timeout: 20000,
    }
  );

  return response.data || {};
}

export async function fetchGoogleBusinessLocations(accessToken, accountName) {
  if (!/^accounts\/[A-Za-z0-9_-]+$/.test(accountName)) {
    throw new Error("Invalid Google Business account.");
  }

  return getAllPages(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
    accessToken,
    {
      pageSize: 100,
      readMask: "name,title,storeCode,websiteUri,phoneNumbers,storefrontAddress,regularHours,categories,metadata",
    },
    "locations"
  );
}
