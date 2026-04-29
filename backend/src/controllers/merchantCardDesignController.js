const { z } = require("zod");
const db = require("../config/db");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/httpResponse");
const { logAuditEvent } = require("../services/auditService");
const { verifyMerchantCardDesignToken } = require("../utils/cardToken");
const { DEFAULT_CARD_DESIGN } = require("../utils/cardDesign");

const cardDesignSchema = z.object({
  tagline: z.string().max(120).default(DEFAULT_CARD_DESIGN.tagline),
  theme: z.enum(["gold", "night", "forest", "rose", "slate", "ocean", "custom"]).default(DEFAULT_CARD_DESIGN.theme),
  style: z.enum(["modern", "minimal", "bold"]).default(DEFAULT_CARD_DESIGN.style),
  bgColor: z.string().min(4).max(32).default(DEFAULT_CARD_DESIGN.bgColor),
  bg2Color: z.string().min(4).max(32).default(DEFAULT_CARD_DESIGN.bg2Color),
  accentColor: z.string().min(4).max(32).default(DEFAULT_CARD_DESIGN.accentColor),
  accent2Color: z.string().min(4).max(32).default(DEFAULT_CARD_DESIGN.accent2Color),
  textColor: z.string().min(4).max(32).default(DEFAULT_CARD_DESIGN.textColor),
  textMutedColor: z.string().max(40).default(DEFAULT_CARD_DESIGN.textMutedColor),
  stampColor: z.string().max(40).default(DEFAULT_CARD_DESIGN.stampColor),
  logoUrl: z.string().max(20000).default(DEFAULT_CARD_DESIGN.logoUrl)
});

const updateMerchantCardDesignSchema = z.object({
  businessName: z.string().min(2).max(120),
  cardDesign: cardDesignSchema
});

async function updateMerchantCardDesignFromToken(req, res, next) {
  try {
    const token = String(req.query.token || "").trim();
    if (!token) throw new ApiError(400, "Missing token", null, "MISSING_DESIGN_TOKEN");

    const { merchantId } = verifyMerchantCardDesignToken(token);

    const payload = updateMerchantCardDesignSchema.parse(req.body || {});

    await db.query(
      `UPDATE merchants
       SET business_name = $1,
           card_tagline = $2,
           card_theme = $3,
           card_style = $4,
           card_bg_color = $5,
           card_bg2_color = $6,
           card_accent_color = $7,
           card_accent2_color = $8,
           card_text_color = $9,
           card_text_muted_color = $10,
           card_stamp_color = $11,
           card_logo_url = $12
       WHERE id = $13`,
      [
        payload.businessName,
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

    await logAuditEvent({
      merchantId,
      action: "merchant.card_design.updated_from_generator",
      targetType: "merchant",
      targetId: merchantId,
      metadata: {
        businessName: payload.businessName,
        cardTheme: payload.cardDesign.theme,
        cardStyle: payload.cardDesign.style
      }
    });

    return sendSuccess(res, { data: { updated: true } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  updateMerchantCardDesignFromToken
};

