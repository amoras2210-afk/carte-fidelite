const { z } = require("zod");
const db = require("../config/db");
const { logAuditEvent } = require("../services/auditService");
const { sendCampaignEmail } = require("../services/notificationService");
const { sendSuccess } = require("../utils/httpResponse");
const { parsePagination } = require("../utils/pagination");
const ApiError = require("../utils/ApiError");

const campaignSchema = z.object({
  title: z.string().min(3).max(100),
  message: z.string().min(5).max(500),
  channel: z.enum(["email", "sms"]).default("email")
});

async function listCampaigns(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;
    const { page, limit, offset } = parsePagination(req.query);
    const countResult = await db.query("SELECT COUNT(*)::int AS total FROM marketing_campaigns WHERE merchant_id = $1", [
      merchantId
    ]);
    const result = await db.query(
      "SELECT * FROM marketing_campaigns WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [merchantId, limit, offset]
    );
    return sendSuccess(res, {
      data: result.rows,
      meta: {
        page,
        limit,
        total: countResult.rows[0].total
      }
    });
  } catch (error) {
    next(error);
  }
}

async function createCampaign(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;
    const payload = campaignSchema.parse(req.body);
    const result = await db.query(
      `INSERT INTO marketing_campaigns (merchant_id, title, message, channel)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [merchantId, payload.title, payload.message, payload.channel]
    );
    await logAuditEvent({
      merchantId,
      action: "campaign.created",
      targetType: "campaign",
      targetId: result.rows[0].id
    });
    return sendSuccess(res, { statusCode: 201, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function sendCampaign(req, res, next) {
  try {
    const merchantId = req.auth.merchantId;
    const campaignId = req.params.campaignId;
    const [merchantResult, campaignResult, clientsResult] = await Promise.all([
      db.query("SELECT business_name FROM merchants WHERE id = $1", [merchantId]),
      db.query("SELECT * FROM marketing_campaigns WHERE id = $1 AND merchant_id = $2", [campaignId, merchantId]),
      db.query(
        "SELECT * FROM clients WHERE merchant_id = $1 AND consent_marketing = TRUE AND email IS NOT NULL",
        [merchantId]
      )
    ]);

    const campaign = campaignResult.rows[0];
    if (!campaign) {
      throw new ApiError(404, "Campaign not found", null, "CAMPAIGN_NOT_FOUND");
    }

    const merchantName = merchantResult.rows[0]?.business_name || "Votre commerce";
    let delivered = 0;

    for (const client of clientsResult.rows) {
      const result = await sendCampaignEmail({
        merchantName,
        clientEmail: client.email,
        clientName: client.full_name,
        title: campaign.title,
        message: campaign.message
      });
      if (result.delivered) delivered += 1;
    }

    await logAuditEvent({
      merchantId,
      action: "campaign.sent",
      targetType: "campaign",
      targetId: campaignId,
      metadata: { recipients: clientsResult.rowCount, delivered }
    });

    return sendSuccess(res, {
      data: {
        campaignId,
        recipients: clientsResult.rowCount,
        delivered
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCampaigns,
  createCampaign,
  sendCampaign
};
