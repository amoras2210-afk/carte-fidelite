const db = require("../config/db");
const { sendAutomationLifecycleEmail } = require("./notificationService");

const AUTOMATION_TYPES = {
  INACTIVE: "inactive_reengagement",
  BIRTHDAY: "signup_anniversary",
  REWARD: "reward_available"
};

const GLOBAL_COOLDOWN_DAYS = 7;

function normalizeName(value, fallback = "client") {
  const safe = String(value || "").trim();
  return safe || fallback;
}

function buildInactiveEmail({ merchantName, clientName }) {
  return {
    subjectLine: `${merchantName} - On vous attend`,
    bodyPlain:
      `Bonjour ${clientName},\n\n` +
      "Cela fait un moment que nous ne vous avons pas vu(e). " +
      "Passez nous voir pour continuer votre carte de fidelite.\n\n" +
      `A bientot,\n${merchantName}`
  };
}

function buildBirthdayEmail({ merchantName, clientName }) {
  return {
    subjectLine: `${merchantName} - Joyeux anniversaire de fidelite`,
    bodyPlain:
      `Bonjour ${clientName},\n\n` +
      "Aujourd'hui, cela fait un an de plus que vous faites partie de notre programme fidelite. " +
      "Merci pour votre confiance.\n\n" +
      `A bientot,\n${merchantName}`
  };
}

function buildRewardEmail({ merchantName, clientName, points, rewardLabel, rewardThreshold }) {
  return {
    subjectLine: `${merchantName} - Votre recompense est disponible`,
    bodyPlain:
      `Bonjour ${clientName},\n\n` +
      `Bonne nouvelle: vous avez ${points} points et votre recompense "${rewardLabel}" est disponible ` +
      `(seuil: ${rewardThreshold} points).\n\n` +
      "Montrez votre QR en caisse lors de votre prochaine visite.\n\n" +
      `A bientot,\n${merchantName}`
  };
}

async function hasGlobalCooldown(merchantId, clientId) {
  const result = await db.query(
    `SELECT id
     FROM automation_email_logs
     WHERE merchant_id = $1
       AND client_id = $2
       AND status = 'sent'
       AND sent_at >= NOW() - ($3::INT * INTERVAL '1 day')
     ORDER BY sent_at DESC
     LIMIT 1`,
    [merchantId, clientId, GLOBAL_COOLDOWN_DAYS]
  );
  return Boolean(result.rows[0]);
}

async function logAutomation({ merchantId, clientId, automationType, status, reason = null, subject = null, sent = false }) {
  await db.query(
    `INSERT INTO automation_email_logs
       (merchant_id, client_id, automation_type, status, reason, subject, sent_at)
     VALUES
       ($1, $2, $3, $4, $5, $6, CASE WHEN $7::BOOLEAN THEN NOW() ELSE NULL END)`,
    [merchantId, clientId, automationType, status, reason, subject, sent]
  );
}

async function processCandidates({ merchantId, merchantName, candidates, automationType, buildMessage }) {
  let sent = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    const clientId = candidate.id;
    const clientEmail = String(candidate.email || "").trim();
    if (!candidate.consent_marketing) {
      skipped += 1;
      await logAutomation({
        merchantId,
        clientId,
        automationType,
        status: "skipped",
        reason: "missing_marketing_consent"
      });
      continue;
    }
    if (!clientEmail) {
      skipped += 1;
      await logAutomation({
        merchantId,
        clientId,
        automationType,
        status: "skipped",
        reason: "missing_email"
      });
      continue;
    }
    if (await hasGlobalCooldown(merchantId, clientId)) {
      skipped += 1;
      await logAutomation({
        merchantId,
        clientId,
        automationType,
        status: "skipped",
        reason: "global_cooldown_7d"
      });
      continue;
    }

    const message = buildMessage(candidate);
    const delivery = await sendAutomationLifecycleEmail({
      merchantId,
      merchantName,
      clientEmail,
      clientName: normalizeName(candidate.full_name),
      subjectLine: message.subjectLine,
      bodyPlain: message.bodyPlain
    });

    if (delivery.delivered) {
      sent += 1;
      await logAutomation({
        merchantId,
        clientId,
        automationType,
        status: "sent",
        subject: message.subjectLine,
        sent: true
      });
    } else {
      skipped += 1;
      await logAutomation({
        merchantId,
        clientId,
        automationType,
        status: "failed",
        reason: delivery.reason || "delivery_failed",
        subject: message.subjectLine
      });
    }
  }

  return { sent, skipped };
}

async function processMerchantAutomations(merchantRow) {
  const merchantId = merchantRow.id;
  const merchantName = normalizeName(merchantRow.business_name, "Votre commerce");
  const inactiveDays = Number(merchantRow.auto_email_inactive_days || 30);
  const rewardThreshold = Number(merchantRow.reward_threshold || 10);
  const rewardLabel = normalizeName(merchantRow.reward_label, "votre recompense");

  const summary = {
    merchantId,
    inactive: { sent: 0, skipped: 0 },
    birthday: { sent: 0, skipped: 0 },
    reward: { sent: 0, skipped: 0 }
  };

  if (merchantRow.auto_email_inactive_enabled) {
    const inactiveCandidates = await db.query(
      `SELECT c.id, c.full_name, c.email, c.consent_marketing
       FROM clients c
       LEFT JOIN points_history ph
         ON ph.client_id = c.id
       WHERE c.merchant_id = $1
       GROUP BY c.id
       HAVING COALESCE(MAX(ph.created_at), MAX(c.updated_at), MAX(c.created_at)) <= NOW() - ($2::INT * INTERVAL '1 day')
       LIMIT 40`,
      [merchantId, inactiveDays]
    );
    summary.inactive = await processCandidates({
      merchantId,
      merchantName,
      candidates: inactiveCandidates.rows,
      automationType: AUTOMATION_TYPES.INACTIVE,
      buildMessage: (candidate) =>
        buildInactiveEmail({
          merchantName,
          clientName: normalizeName(candidate.full_name)
        })
    });
  }

  if (merchantRow.auto_email_birthday_enabled) {
    const birthdayCandidates = await db.query(
      `SELECT c.id, c.full_name, c.email, c.consent_marketing
       FROM clients c
       WHERE c.merchant_id = $1
         AND EXTRACT(MONTH FROM c.created_at) = EXTRACT(MONTH FROM NOW())
         AND EXTRACT(DAY FROM c.created_at) = EXTRACT(DAY FROM NOW())
       LIMIT 40`,
      [merchantId]
    );
    summary.birthday = await processCandidates({
      merchantId,
      merchantName,
      candidates: birthdayCandidates.rows,
      automationType: AUTOMATION_TYPES.BIRTHDAY,
      buildMessage: (candidate) =>
        buildBirthdayEmail({
          merchantName,
          clientName: normalizeName(candidate.full_name)
        })
    });
  }

  if (merchantRow.auto_email_reward_enabled) {
    const rewardCandidates = await db.query(
      `SELECT c.id, c.full_name, c.email, c.consent_marketing, c.points
       FROM clients c
       WHERE c.merchant_id = $1
         AND c.points >= $2
       LIMIT 40`,
      [merchantId, rewardThreshold]
    );
    summary.reward = await processCandidates({
      merchantId,
      merchantName,
      candidates: rewardCandidates.rows,
      automationType: AUTOMATION_TYPES.REWARD,
      buildMessage: (candidate) =>
        buildRewardEmail({
          merchantName,
          clientName: normalizeName(candidate.full_name),
          points: Number(candidate.points || 0),
          rewardLabel,
          rewardThreshold
        })
    });
  }

  return summary;
}

async function processAutomationEmails(limitMerchants = 20) {
  const merchants = await db.query(
    `SELECT m.id, m.business_name,
            m.auto_email_inactive_enabled, m.auto_email_inactive_days,
            m.auto_email_birthday_enabled, m.auto_email_reward_enabled,
            ls.reward_threshold, ls.reward_label
     FROM merchants m
     JOIN loyalty_settings ls ON ls.merchant_id = m.id
     WHERE m.auto_email_inactive_enabled = TRUE
        OR m.auto_email_birthday_enabled = TRUE
        OR m.auto_email_reward_enabled = TRUE
     ORDER BY m.created_at ASC
     LIMIT $1`,
    [limitMerchants]
  );

  const summaries = [];
  for (const merchantRow of merchants.rows) {
    try {
      const merchantSummary = await processMerchantAutomations(merchantRow);
      summaries.push(merchantSummary);
    } catch (error) {
      console.error("[automation-email-worker] merchant failed:", merchantRow.id, error.message || error);
    }
  }
  return summaries;
}

function startAutomationEmailWorker() {
  const tick = async () => {
    try {
      await processAutomationEmails(20);
    } catch (error) {
      console.error("[automation-email-worker] tick failed:", error.message || error);
    }
  };

  const interval = setInterval(tick, 5 * 60 * 1000);
  tick().catch(() => null);
  return () => clearInterval(interval);
}

module.exports = {
  AUTOMATION_TYPES,
  GLOBAL_COOLDOWN_DAYS,
  processAutomationEmails,
  startAutomationEmailWorker
};
