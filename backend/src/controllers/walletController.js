const db = require("../config/db");
const ApiError = require("../utils/ApiError");
const env = require("../config/env");
const { buildApplePass } = require("../services/walletService");
const { buildGoogleWalletPayload } = require("../services/googleWalletTemplate");
const { sendSuccess } = require("../utils/httpResponse");

async function getMerchantAndClient(merchantId, clientId) {
  const merchantResult = await db.query("SELECT * FROM merchants WHERE id = $1", [merchantId]);
  const clientResult = await db.query(
    "SELECT * FROM clients WHERE id = $1 AND merchant_id = $2",
    [clientId, merchantId]
  );

  const merchant = merchantResult.rows[0];
  const client = clientResult.rows[0];

  if (!merchant || !client) {
    throw new ApiError(404, "Merchant or client not found", null, "WALLET_ENTITY_NOT_FOUND");
  }
  return { merchant, client };
}

async function generateAppleWalletPass(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;
    const clientId = req.params.clientId;
    const { merchant, client } = await getMerchantAndClient(merchantId, clientId);
    const { passBuffer } = await buildApplePass({ merchant, client });

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader("Content-Disposition", `attachment; filename=loyalty-${client.id}.pkpass`);
    res.send(passBuffer);
  } catch (error) {
    next(error);
  }
}

async function getGoogleWalletPayload(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;
    const clientId = req.params.clientId;
    const { merchant, client } = await getMerchantAndClient(merchantId, clientId);
    const payload = buildGoogleWalletPayload({ merchant, client });
    return sendSuccess(res, { data: payload });
  } catch (error) {
    next(error);
  }
}

async function walletDiagnostics(req, res, next) {
  try {
    const hasAppleCertificates =
      Boolean(process.env.APPLE_WALLET_WWDR_PATH) &&
      Boolean(process.env.APPLE_WALLET_SIGNER_CERT_PATH) &&
      Boolean(process.env.APPLE_WALLET_SIGNER_KEY_PATH);

    return sendSuccess(res, {
      data: {
        appleWallet: {
          configured: hasAppleCertificates
        },
        googleWallet: {
          configured: Boolean(env.googleWalletIssuerId),
          issuerId: env.googleWalletIssuerId || "missing",
          mode: env.googleWalletIssuerId ? "ready_for_signing" : "template_payload"
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  generateAppleWalletPass,
  getGoogleWalletPayload,
  walletDiagnostics
};
