const nodemailer = require("nodemailer");
const env = require("../config/env");
const db = require("../config/db");

const transporter =
  env.smtpHost && env.smtpUser && env.smtpPass
    ? nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpSecure,
        auth: { user: env.smtpUser, pass: env.smtpPass }
      })
    : null;

async function buildMerchantGoogleTransport(merchantId, merchantName) {
  if (!merchantId || !env.googleMailClientId || !env.googleMailClientSecret) return null;
  const result = await db.query(
    "SELECT google_mail_address, google_mail_refresh_token FROM merchants WHERE id = $1",
    [merchantId]
  );
  const row = result.rows[0];
  if (!row?.google_mail_address || !row?.google_mail_refresh_token) return null;
  return {
    transport: nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: row.google_mail_address,
        clientId: env.googleMailClientId,
        clientSecret: env.googleMailClientSecret,
        refreshToken: row.google_mail_refresh_token
      }
    }),
    from: `${merchantNameOrFallback(merchantName, row.google_mail_address)} <${row.google_mail_address}>`,
    replyTo: row.google_mail_address
  };
}

function merchantNameOrFallback(merchantName, fallback) {
  const safe = String(merchantName || "").trim();
  return safe || fallback || "Loyalty Pro";
}

async function sendRewardUnlockedEmail({ merchantName, clientEmail, clientName, points, rewardsEarned }) {
  if (!transporter || !clientEmail) {
    return { delivered: false, reason: "smtp_not_configured_or_missing_email" };
  }

  await transporter.sendMail({
    from: env.smtpFrom,
    to: clientEmail,
    subject: `${merchantName} - Vous avez debloque une recompense`,
    text: `Bonjour ${clientName}, vous avez ${points} points et ${rewardsEarned} recompense(s) debloquee(s).`
  });

  return { delivered: true };
}

async function sendCampaignEmail({ merchantName, clientEmail, clientName, title, message }) {
  if (!transporter || !clientEmail) {
    return { delivered: false, reason: "smtp_not_configured_or_missing_email" };
  }

  await transporter.sendMail({
    from: env.smtpFrom,
    to: clientEmail,
    subject: `${merchantName} - ${title}`,
    text: `Bonjour ${clientName},\n\n${message}`
  });

  return { delivered: true };
}

async function sendReviewRequestEmail({ merchantId, merchantName, clientEmail, clientName, reviewUrl }) {
  if (!clientEmail) {
    return { delivered: false, reason: "missing_email" };
  }
  const googleSender = await buildMerchantGoogleTransport(merchantId, merchantName);
  const senderTransport = googleSender?.transport || transporter;
  if (!senderTransport) {
    return { delivered: false, reason: "smtp_not_configured_or_missing_email" };
  }

  const safeReviewUrl = reviewUrl || "https://www.google.com/maps";
  await senderTransport.sendMail({
    from: googleSender?.from || env.smtpFrom,
    replyTo: googleSender?.replyTo || undefined,
    to: clientEmail,
    subject: `${merchantName} - Votre avis compte`,
    text:
      `Bonjour ${clientName},\n\n` +
      "Merci pour votre visite. Si vous avez 30 secondes, pouvez-vous nous laisser un avis ?\n\n" +
      `${safeReviewUrl}\n\n` +
      "Merci !"
  });

  return { delivered: true };
}

module.exports = {
  sendRewardUnlockedEmail,
  sendCampaignEmail,
  sendReviewRequestEmail
};
