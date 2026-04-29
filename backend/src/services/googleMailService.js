const jwt = require("jsonwebtoken");
const { google } = require("googleapis");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");

const GOOGLE_MAIL_STATE_TYP = "google_mail_connect";
const GOOGLE_MAIL_STATE_AUD = "loyalty.google.mail";
const GOOGLE_MAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email"
];

function isGoogleMailConfigured() {
  return Boolean(env.googleMailClientId && env.googleMailClientSecret && env.googleMailRedirectUri);
}

function createOauthClient() {
  if (!isGoogleMailConfigured()) {
    throw new ApiError(503, "Google Mail OAuth is not configured on server", null, "GOOGLE_MAIL_NOT_CONFIGURED");
  }
  return new google.auth.OAuth2(env.googleMailClientId, env.googleMailClientSecret, env.googleMailRedirectUri);
}

function signGoogleMailState({ merchantId }) {
  return jwt.sign(
    {
      merchantId,
      typ: GOOGLE_MAIL_STATE_TYP,
      aud: GOOGLE_MAIL_STATE_AUD
    },
    env.jwtSecret,
    { expiresIn: "15m" }
  );
}

function verifyGoogleMailState(state) {
  const payload = jwt.verify(state, env.jwtSecret, {
    audience: GOOGLE_MAIL_STATE_AUD
  });
  if (payload.typ !== GOOGLE_MAIL_STATE_TYP || !payload.merchantId) {
    throw new ApiError(400, "Invalid Google Mail OAuth state", null, "GOOGLE_MAIL_INVALID_STATE");
  }
  return { merchantId: payload.merchantId };
}

function buildGoogleConnectUrl({ merchantId }) {
  const client = createOauthClient();
  const state = signGoogleMailState({ merchantId });
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_MAIL_SCOPES,
    state
  });
}

async function exchangeGoogleCode(code) {
  const client = createOauthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const profile = await oauth2.userinfo.get();
  const email = String(profile.data?.email || "").trim();
  if (!tokens.refresh_token || !email) {
    throw new ApiError(
      400,
      "Google did not return refresh token or email. Please retry and grant access.",
      null,
      "GOOGLE_MAIL_MISSING_TOKENS"
    );
  }
  return {
    refreshToken: tokens.refresh_token,
    email
  };
}

module.exports = {
  isGoogleMailConfigured,
  buildGoogleConnectUrl,
  verifyGoogleMailState,
  exchangeGoogleCode
};
