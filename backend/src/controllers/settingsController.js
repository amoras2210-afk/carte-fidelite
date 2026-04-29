const { z } = require("zod");
const db = require("../config/db");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/httpResponse");
const { logAuditEvent } = require("../services/auditService");
const { DEFAULT_CARD_DESIGN, toCardDesign } = require("../utils/cardDesign");

const updateSettingsSchema = z.object({
  businessName: z.string().min(2).max(120),
  reviewUrl: z.string().url().max(500).optional().or(z.literal("")),
  brandColor: z.string().min(4).max(32),
  rewardThreshold: z.number().int().min(1).max(1000),
  rewardLabel: z.string().min(2).max(80),
  planMrrEur: z.number().min(0).max(99999).optional(),
  cardDesign: z.object({
    tagline: z.string().max(120).default(DEFAULT_CARD_DESIGN.tagline),
    theme: z.enum(["gold", "night", "forest", "rose", "slate", "ocean", "custom"]).default(DEFAULT_CARD_DESIGN.theme),
    style: z.enum(["modern", "minimal", "bold"]).default(DEFAULT_CARD_DESIGN.style),
    bgColor: z.string().min(4).max(32).default(DEFAULT_CARD_DESIGN.bgColor),
    bg2Color: z.string().min(4).max(32).default(DEFAULT_CARD_DESIGN.bg2Color),
    accentColor: z.string().min(4).max(32).default(DEFAULT_CARD_DESIGN.accentColor),
    accent2Color: z.string().min(4).max(32).default(DEFAULT_CARD_DESIGN.accent2Color),
    textColor: z.string().min(4).max(32).default(DEFAULT_CARD_DESIGN.textColor),
    textMutedColor: z.string().min(4).max(40).default(DEFAULT_CARD_DESIGN.textMutedColor),
    stampColor: z.string().min(4).max(40).default(DEFAULT_CARD_DESIGN.stampColor),
    logoUrl: z.string().max(2000000).default(DEFAULT_CARD_DESIGN.logoUrl)
  }).default(DEFAULT_CARD_DESIGN)
});

async function getSettings(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;
    const result = await db.query(
      `SELECT m.id, m.business_name, m.email, m.brand_color, m.plan_mrr_eur, m.review_url,
              m.card_tagline, m.card_theme, m.card_style, m.card_bg_color, m.card_bg2_color,
              m.card_accent_color, m.card_accent2_color, m.card_text_color, m.card_text_muted_color,
              m.card_stamp_color, m.card_logo_url,
              ls.reward_threshold, ls.reward_label
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
        reviewUrl: row.review_url || "",
        email: row.email,
        brandColor: row.brand_color,
        rewardThreshold: row.reward_threshold,
        rewardLabel: row.reward_label,
        planMrrEur: Number(row.plan_mrr_eur ?? 49),
        cardDesign: toCardDesign(row)
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

    await db.query("UPDATE merchants SET business_name = $1, brand_color = $2, review_url = $3 WHERE id = $4", [
      payload.businessName,
      payload.brandColor,
      payload.reviewUrl || null,
      merchantId
    ]);
    await db.query(
      `UPDATE merchants
       SET card_tagline = $1,
           card_theme = $2,
           card_style = $3,
           card_bg_color = $4,
           card_bg2_color = $5,
           card_accent_color = $6,
           card_accent2_color = $7,
           card_text_color = $8,
           card_text_muted_color = $9,
           card_stamp_color = $10,
           card_logo_url = $11
       WHERE id = $12`,
      [
        payload.cardDesign.tagline,
        payload.cardDesign.theme,
        payload.cardDesign.style,
        payload.cardDesign.bgColor,
        payload.cardDesign.bg2Color,
        payload.cardDesign.accentColor,
        payload.cardDesign.accent2Color,
        payload.cardDesign.textColor,
        payload.cardDesign.textMutedColor,
        payload.cardDesign.stampColor,
        payload.cardDesign.logoUrl,
        merchantId
      ]
    );
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
        reviewUrl: payload.reviewUrl || "",
        brandColor: payload.brandColor,
        rewardThreshold: payload.rewardThreshold,
        rewardLabel: payload.rewardLabel,
        planMrrEur: payload.planMrrEur,
        cardDesign: payload.cardDesign
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
