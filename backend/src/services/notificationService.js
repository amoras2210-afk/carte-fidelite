const nodemailer = require("nodemailer");
const { google } = require("googleapis");
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

async function loadMerchantGoogleMailAuth(merchantId) {
  if (!merchantId || !env.googleMailClientId || !env.googleMailClientSecret || !env.googleMailRedirectUri) {
    return null;
  }
  const result = await db.query(
    "SELECT google_mail_address, google_mail_refresh_token FROM merchants WHERE id = $1",
    [merchantId]
  );
  const row = result.rows[0];
  if (!row?.google_mail_address || !row?.google_mail_refresh_token) return null;

  const oauth2Client = new google.auth.OAuth2(
    env.googleMailClientId,
    env.googleMailClientSecret,
    env.googleMailRedirectUri
  );
  oauth2Client.setCredentials({ refresh_token: row.google_mail_refresh_token });

  return {
    gmailAddress: row.google_mail_address,
    oauth2Client
  };
}

function mimeEncodedWordUtf8(text) {
  return `=?UTF-8?B?${Buffer.from(String(text), "utf8").toString("base64")}?=`;
}

function encodeGmailRawMessage(rawString) {
  return Buffer.from(rawString)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendPlainTextViaGmailApi({
  oauth2Client,
  fromEmail,
  merchantDisplayName,
  toEmail,
  subjectLine,
  bodyPlain
}) {
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const safeDisplay = merchantNameOrFallback(merchantDisplayName, fromEmail);
  const fromHeader = /^[\x00-\x7F]+$/.test(safeDisplay)
    ? `${safeDisplay} <${fromEmail}>`
    : `${mimeEncodedWordUtf8(safeDisplay)} <${fromEmail}>`;

  const headerBlock = [
    `From: ${fromHeader}`,
    `To: ${toEmail}`,
    `Subject: ${mimeEncodedWordUtf8(subjectLine)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8"
  ].join("\r\n");
  const raw = `${headerBlock}\r\n\r\n${bodyPlain}\r\n`;

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodeGmailRawMessage(raw)
    }
  });
}

async function sendReviewViaGmailApi({
  oauth2Client,
  fromEmail,
  merchantDisplayName,
  clientEmail,
  clientName,
  reviewUrl
}) {
  const safeReviewUrl = reviewUrl || "https://www.google.com/maps";
  const body =
    `Bonjour ${clientName},\n\n` +
    "Merci pour votre visite. Si vous avez 30 secondes, pouvez-vous nous laisser un avis ?\n\n" +
    `${safeReviewUrl}\n\n` +
    "Merci !";

  const subject = `${merchantDisplayName} - Votre avis compte`;
  await sendPlainTextViaGmailApi({
    oauth2Client,
    fromEmail,
    merchantDisplayName,
    toEmail: clientEmail,
    subjectLine: subject,
    bodyPlain: body
  });
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

async function sendCampaignEmail({ merchantId, merchantName, clientEmail, clientName, title, message }) {
  if (!clientEmail) {
    return { delivered: false, reason: "missing_email" };
  }

  const googleAuth = merchantId ? await loadMerchantGoogleMailAuth(merchantId) : null;
  if (googleAuth) {
    try {
      await sendPlainTextViaGmailApi({
        oauth2Client: googleAuth.oauth2Client,
        fromEmail: googleAuth.gmailAddress,
        merchantDisplayName: merchantName,
        toEmail: clientEmail,
        subjectLine: `${merchantName} - ${title}`,
        bodyPlain: `Bonjour ${clientName},\n\n${message}`
      });
      return { delivered: true };
    } catch (error) {
      console.error("[notification] Gmail API campaign email failed:", error.message || error);
      return { delivered: false, reason: `gmail_api:${String(error.message || error).slice(0, 500)}` };
    }
  }

  if (!transporter) {
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

  const googleAuth = await loadMerchantGoogleMailAuth(merchantId);
  if (googleAuth) {
    try {
      await sendReviewViaGmailApi({
        oauth2Client: googleAuth.oauth2Client,
        fromEmail: googleAuth.gmailAddress,
        merchantDisplayName: merchantName,
        clientEmail,
        clientName,
        reviewUrl
      });
      return { delivered: true };
    } catch (error) {
      console.error("[notification] Gmail API review email failed:", error.message || error);
      return { delivered: false, reason: `gmail_api:${String(error.message || error).slice(0, 500)}` };
    }
  }

  if (!transporter) {
    return { delivered: false, reason: "smtp_not_configured_or_missing_email" };
  }

  const safeReviewUrl = reviewUrl || "https://www.google.com/maps";
  await transporter.sendMail({
    from: env.smtpFrom,
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
