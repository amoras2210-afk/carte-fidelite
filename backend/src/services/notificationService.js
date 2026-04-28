const nodemailer = require("nodemailer");
const env = require("../config/env");

const transporter =
  env.smtpHost && env.smtpUser && env.smtpPass
    ? nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpSecure,
        auth: { user: env.smtpUser, pass: env.smtpPass }
      })
    : null;

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

async function sendReviewRequestEmail({ merchantName, clientEmail, clientName, reviewUrl }) {
  if (!transporter || !clientEmail) {
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
