const db = require("../config/db");
const { sendSuccess } = require("../utils/httpResponse");
const ApiError = require("../utils/ApiError");
const {
  isGoogleMailConfigured,
  buildGoogleConnectUrl,
  verifyGoogleMailState,
  exchangeGoogleCode
} = require("../services/googleMailService");

async function getGoogleConnectUrl(req, res, next) {
  try {
    if (!isGoogleMailConfigured()) {
      throw new ApiError(503, "Google Mail OAuth non configure sur le serveur", null, "GOOGLE_MAIL_NOT_CONFIGURED");
    }
    const merchantId = req.auth.merchantId;
    const connectUrl = buildGoogleConnectUrl({ merchantId });
    return sendSuccess(res, { data: { connectUrl } });
  } catch (error) {
    next(error);
  }
}

async function googleOAuthCallback(req, res, next) {
  try {
    const code = String(req.query.code || "").trim();
    const state = String(req.query.state || "").trim();
    if (!code || !state) {
      throw new ApiError(400, "Google callback missing code/state", null, "GOOGLE_MAIL_CALLBACK_INVALID");
    }

    const { merchantId } = verifyGoogleMailState(state);
    const { refreshToken, email } = await exchangeGoogleCode(code);

    await db.query(
      `UPDATE merchants
       SET google_mail_address = $1,
           google_mail_refresh_token = $2,
           google_mail_connected_at = NOW()
       WHERE id = $3`,
      [email, refreshToken, merchantId]
    );

    res.status(200).send(`<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Connexion Gmail</title></head>
  <body style="font-family: sans-serif; padding: 24px;">
    <h2>Connexion Gmail reussie</h2>
    <p>Vous pouvez fermer cette fenetre puis revenir dans Loyalty Pro.</p>
    <script>setTimeout(()=>window.close(), 1200);</script>
  </body>
</html>`);
  } catch (error) {
    next(error);
  }
}

async function disconnectGoogleMail(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;
    await db.query(
      `UPDATE merchants
       SET google_mail_address = NULL,
           google_mail_refresh_token = NULL,
           google_mail_connected_at = NULL
       WHERE id = $1`,
      [merchantId]
    );
    return sendSuccess(res, { data: { disconnected: true } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getGoogleConnectUrl,
  googleOAuthCallback,
  disconnectGoogleMail
};
