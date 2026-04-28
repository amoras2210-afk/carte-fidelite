const fs = require("fs");
const path = require("path");
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
    const appleFiles = [
      { key: "wwdr", label: "WWDR certificate", value: env.appleWalletWWDRPath },
      { key: "signerCert", label: "Signer certificate", value: env.appleWalletSignerCertPath },
      { key: "signerKey", label: "Signer private key", value: env.appleWalletSignerKeyPath }
    ].map((item) => {
      const resolvedPath = item.value ? path.resolve(process.cwd(), item.value) : null;
      return {
        key: item.key,
        label: item.label,
        configured: Boolean(item.value),
        exists: resolvedPath ? fs.existsSync(resolvedPath) : false
      };
    });

    const appleMissingItems = appleFiles.filter((item) => !item.configured || !item.exists).map((item) => item.label);
    const hasAppleCertificates = appleMissingItems.length === 0;
    const hasRealPassType =
      Boolean(env.appleWalletPassTypeIdentifier) && env.appleWalletPassTypeIdentifier !== "pass.com.yourcompany.loyalty";
    const hasRealTeamId =
      Boolean(env.appleWalletTeamIdentifier) && env.appleWalletTeamIdentifier !== "YOUR_TEAM_IDENTIFIER";
    const appleReady = hasAppleCertificates && hasRealPassType && hasRealTeamId;
    if (!hasRealPassType) appleMissingItems.push("Pass Type Identifier");
    if (!hasRealTeamId) appleMissingItems.push("Apple Team Identifier");
    const googleConfigured = Boolean(env.googleWalletIssuerId);

    return sendSuccess(res, {
      data: {
        appleWallet: {
          configured: hasAppleCertificates,
          ready: appleReady,
          passTypeIdentifier: env.appleWalletPassTypeIdentifier,
          teamIdentifier: env.appleWalletTeamIdentifier,
          missingItems: appleMissingItems,
          files: appleFiles,
          message: appleReady
            ? "Apple Wallet prêt pour générer des passes."
            : "Apple Wallet nécessite les certificats et identifiants Apple en production."
        },
        googleWallet: {
          configured: googleConfigured,
          issuerId: env.googleWalletIssuerId || "missing",
          classSuffix: env.googleWalletClassSuffix,
          mode: googleConfigured ? "ready_for_signing" : "template_payload",
          message: googleConfigured
            ? "Google Wallet a un issuer configuré. La signature finale reste à brancher selon votre compte Google."
            : "Google Wallet est actuellement en mode gabarit/payload, sans issuer de production."
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
