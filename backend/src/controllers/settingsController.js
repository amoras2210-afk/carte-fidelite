const { z } = require("zod");
const db = require("../config/db");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/httpResponse");
const { logAuditEvent } = require("../services/auditService");

const updateSettingsSchema = z.object({
  businessName: z.string().min(2).max(120),
  brandColor: z.string().min(4).max(32),
  rewardThreshold: z.number().int().min(1).max(1000),
  rewardLabel: z.string().min(2).max(80),
  planMrrEur: z.number().min(0).max(99999).optional()
});

async function getSettings(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;
    const result = await db.query(
      `SELECT m.id, m.business_name, m.email, m.brand_color, m.plan_mrr_eur, ls.reward_threshold, ls.reward_label
       FROM merchants m
       JOIN loyalty_settings ls ON ls.merchant_id = m.id
       WHERE m.id = $1`,
      [merchantId]
    );
    const row = result.rows[0];
    if (!row) {
      throw new ApiError(404, "Settings not found", null, "SETTINGS_NOT_FOUND");
    }

    return sendSuccess(res, {
      data: {
        merchantId: row.id,
        businessName: row.business_name,
        email: row.email,
        brandColor: row.brand_color,
        rewardThreshold: row.reward_threshold,
        rewardLabel: row.reward_label,
        planMrrEur: Number(row.plan_mrr_eur ?? 49)
      }
    });
  } catch (error) {
    next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;
    const payload = updateSettingsSchema.parse(req.body);

    await db.query("UPDATE merchants SET business_name = $1, brand_color = $2 WHERE id = $3", [
      payload.businessName,
      payload.brandColor,
      merchantId
    ]);
    if (payload.planMrrEur !== undefined) {
      await db.query("UPDATE merchants SET plan_mrr_eur = $1 WHERE id = $2", [payload.planMrrEur, merchantId]);
    }
    await db.query("UPDATE loyalty_settings SET reward_threshold = $1, reward_label = $2 WHERE merchant_id = $3", [
      payload.rewardThreshold,
      payload.rewardLabel,
      merchantId
    ]);

    await logAuditEvent({
      merchantId,
      action: "settings.updated",
      targetType: "merchant",
      targetId: merchantId
    });

    return sendSuccess(res, {
      data: {
        businessName: payload.businessName,
        brandColor: payload.brandColor,
        rewardThreshold: payload.rewardThreshold,
        rewardLabel: payload.rewardLabel,
        planMrrEur: payload.planMrrEur
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSettings,
  updateSettings
};
