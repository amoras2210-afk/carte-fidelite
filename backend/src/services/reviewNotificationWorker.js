const db = require("../config/db");
const env = require("../config/env");
const { sendReviewRequestEmail } = require("./notificationService");

const REVIEW_NOTIFICATION_TYPE = "first_visit_review";

function buildFallbackReviewUrl(merchantName) {
  if (env.reviewDefaultUrl) return env.reviewDefaultUrl;
  return `https://www.google.com/search?q=${encodeURIComponent(`${merchantName} avis`)}`;
}

async function scheduleFirstVisitReviewNotification({ merchantId, clientId, merchantName, clientEmail, clientName, reviewUrl }) {
  if (!clientEmail) {
    return { scheduled: false, reason: "missing_email" };
  }

  const existing = await db.query(
    `SELECT id, status
     FROM delayed_notifications
     WHERE client_id = $1 AND notification_type = $2`,
    [clientId, REVIEW_NOTIFICATION_TYPE]
  );
  if (existing.rows[0]) {
    return { scheduled: false, reason: `already_${existing.rows[0].status}` };
  }

  const delay = Number.isFinite(env.reviewRequestDelayMinutes) ? Math.max(1, env.reviewRequestDelayMinutes) : 10;
  const safeUrl = reviewUrl || buildFallbackReviewUrl(merchantName);
  const sendAt = new Date(Date.now() + delay * 60 * 1000);
  await db.query(
    `INSERT INTO delayed_notifications
       (merchant_id, client_id, notification_type, status, send_at, payload)
     VALUES
       ($1, $2, $3, 'pending', $4, $5::jsonb)`,
    [
      merchantId,
      clientId,
      REVIEW_NOTIFICATION_TYPE,
      sendAt.toISOString(),
      JSON.stringify({
        merchantName,
        clientEmail,
        clientName,
        reviewUrl: safeUrl
      })
    ]
  );

  return { scheduled: true, sendAt: sendAt.toISOString() };
}

async function processDueReviewNotifications(limit = 20) {
  const due = await db.query(
    `SELECT id, payload
     FROM delayed_notifications
     WHERE status = 'pending'
       AND notification_type = $1
       AND send_at <= NOW()
     ORDER BY send_at ASC
     LIMIT $2`,
    [REVIEW_NOTIFICATION_TYPE, limit]
  );

  for (const row of due.rows) {
    const payload = row.payload || {};
    try {
      const result = await sendReviewRequestEmail({
        merchantName: payload.merchantName || "Votre commerce",
        clientEmail: payload.clientEmail,
        clientName: payload.clientName || "client",
        reviewUrl: payload.reviewUrl
      });

      if (result.delivered) {
        await db.query(
          `UPDATE delayed_notifications
           SET status = 'sent',
               sent_at = NOW(),
               attempts = attempts + 1,
               last_error = NULL
           WHERE id = $1`,
          [row.id]
        );
      } else {
        await db.query(
          `UPDATE delayed_notifications
           SET status = 'failed',
               attempts = attempts + 1,
               last_error = $2
           WHERE id = $1`,
          [row.id, result.reason || "delivery_failed"]
        );
      }
    } catch (error) {
      await db.query(
        `UPDATE delayed_notifications
         SET status = 'failed',
             attempts = attempts + 1,
             last_error = $2
         WHERE id = $1`,
        [row.id, error.message || "unexpected_error"]
      );
    }
  }

  return due.rows.length;
}

function startReviewNotificationWorker() {
  const tick = async () => {
    try {
      await processDueReviewNotifications(20);
    } catch {
      // Keep worker resilient; errors are persisted per row.
    }
  };
  const interval = setInterval(tick, 60 * 1000);
  tick().catch(() => null);
  return () => clearInterval(interval);
}

module.exports = {
  REVIEW_NOTIFICATION_TYPE,
  scheduleFirstVisitReviewNotification,
  processDueReviewNotifications,
  startReviewNotificationWorker
};

