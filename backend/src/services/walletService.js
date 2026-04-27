const fs = require("fs");
const path = require("path");
const passkit = require("passkit-generator");
const QRCode = require("qrcode");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");

async function buildApplePass({ merchant, client }) {
  const certs = {
    wwdr: env.appleWalletWWDRPath ? fs.readFileSync(path.resolve(process.cwd(), env.appleWalletWWDRPath)) : null,
    signerCert: env.appleWalletSignerCertPath
      ? fs.readFileSync(path.resolve(process.cwd(), env.appleWalletSignerCertPath))
      : null,
    signerKey: env.appleWalletSignerKeyPath
      ? fs.readFileSync(path.resolve(process.cwd(), env.appleWalletSignerKeyPath))
      : null,
    signerKeyPassphrase: env.appleWalletPassphrase
  };

  if (!certs.wwdr || !certs.signerCert || !certs.signerKey) {
    throw new ApiError(
      500,
      "Apple Wallet certificates missing. Configure paths in backend/.env and place files in wallet/certs."
    );
  }

  const pass = await passkit.PKPass.from(
    {
      model: path.resolve(process.cwd(), "../wallet/templates/apple-pass-model"),
      certificates: certs
    },
    {
      serialNumber: client.id,
      description: `${merchant.business_name} loyalty card`,
      organizationName: merchant.business_name,
      teamIdentifier: env.appleWalletTeamIdentifier,
      passTypeIdentifier: env.appleWalletPassTypeIdentifier,
      foregroundColor: "rgb(255,255,255)",
      backgroundColor: merchant.brand_color || "rgb(30,30,30)",
      labelColor: "rgb(255,255,255)"
    }
  );

  const qrValue = `${merchant.id}:${client.id}:${client.points}`;
  const qrDataUrl = await QRCode.toDataURL(qrValue);
  pass.setBarcodes({
    message: qrValue,
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1"
  });

  pass.primaryFields.add({
    key: "points",
    label: "POINTS",
    value: String(client.points)
  });
  pass.secondaryFields.add({
    key: "name",
    label: "CLIENT",
    value: client.full_name
  });
  pass.auxiliaryFields.add({
    key: "memberSince",
    label: "MEMBER SINCE",
    value: new Date(client.created_at).toISOString().slice(0, 10)
  });
  pass.backFields.add({
    key: "legal",
    label: "Privacy",
    value: "You can request data deletion anytime (GDPR)."
  });

  // Keep data URL available for debug and QR preview in future APIs.
  pass.setRelevantDate(new Date());
  return { passBuffer: pass.getAsBuffer(), qrDataUrl };
}

module.exports = {
  buildApplePass
};
