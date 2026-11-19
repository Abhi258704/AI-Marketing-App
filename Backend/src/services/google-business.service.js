import { OAuth2Client } from "google-auth-library";

export const GOOGLE_BUSINESS_SCOPE =
  "https://www.googleapis.com/auth/business.manage";

export function createGoogleBusinessOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GBP_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google Business OAuth is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GBP_REDIRECT_URI to the backend environment."
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
