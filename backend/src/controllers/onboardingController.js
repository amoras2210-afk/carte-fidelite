const { z } = require("zod");
const db = require("../config/db");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/httpResponse");
const { logAuditEvent } = require("../services/auditService");

const trackSchema = z.object({
  sessionId: z.string().uuid().optional(),
  step: z.number().int().min(1).max(4),
  action: z.enum(["view", "next", "back", "complete"]),
  meta: z.any().optional()
});

const linkSchema = z.object({
  sessionId: z.string().uuid()
});

/**
 * Public funnel tracking (pre-auth). Client stores session UUID in localStorage.
 */
async function trackEvent(req, res, next) {
  try {
    const payload = trackSchema.parse(req.body);
    let sessionId = payload.sessionId;

    if (!sessionId) {
      const created = await db.query(
        `INSERT INTO onboarding_sessions (last_step, completed)
         VALUES ($1, FALSE)
         RETURNING id`,
        [payload.step]
      );
      sessionId = created.rows[0].id;
    } else {
      const existing = await db.query("SELECT id FROM onboarding_sessions WHERE id = $1", [sessionId]);
      if (!existing.rows[0]) {
        throw new ApiError(400, "Invalid onboarding session", null, "INVALID_SESSION");
      }
      await db.query(
        `UPDATE onboarding_sessions SET last_step = GREATEST(last_step, $2), updated_at = NOW()
         WHERE id = $1`,
        [sessionId, payload.step]
      );
      if (payload.action === "complete") {
        await db.query(
          `UPDATE onboarding_sessions SET completed = TRUE, last_step = 4, updated_at = NOW() WHERE id = $1`,
          [sessionId]
        );
      }
    }

    await db.query(
      `INSERT INTO onboarding_events (session_id, step, action, meta)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, payload.step, payload.action, payload.meta ?? null]
    );

    return sendSuccess(res, {
      data: { sessionId }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Link anonymous onboarding session to merchant after login/register.
 */
async function linkSession(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;
    const payload = linkSchema.parse(req.body);

    const result = await db.query(
      `UPDATE onboarding_sessions SET merchant_id = $2, updated_at = NOW()
       WHERE id = $1 AND (merchant_id IS NULL OR merchant_id = $2)
       RETURNING id`,
      [payload.sessionId, merchantId]
    );
    if (!result.rows[0]) {
      throw new ApiError(404, "Session not found or already linked", null, "SESSION_LINK_FAILED");
    }

    await logAuditEvent({
      merchantId,
      action: "onboarding.session_linked",
      targetType: "onboarding_session",
      targetId: payload.sessionId
    });

    return sendSuccess(res, { data: { linked: true } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  trackEvent,
  linkSession
};
