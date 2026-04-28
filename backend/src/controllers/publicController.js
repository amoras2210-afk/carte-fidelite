const db = require("../config/db");
const { sendSuccess } = require("../utils/httpResponse");
const { verifyCardToken } = require("../utils/cardToken");
const ApiError = require("../utils/ApiError");

async function getPublicCard(req, res, next) {
  try {
    const token = String(req.query.token || "").trim();
    if (!token) {
      throw new ApiError(400, "Missing token", null, "MISSING_TOKEN");
    }

    const { merchantId, clientId } = verifyCardToken(token);
    const result = await db.query(
      `SELECT 
         m.id AS merchant_id,
         m.business_name,
         m.brand_color,
         ls.reward_threshold,
         ls.reward_label,
         c.id AS client_id,
         c.full_name,
         c.points,
         c.visits,
         c.created_at
       FROM merchants m
       JOIN loyalty_settings ls ON ls.merchant_id = m.id
       JOIN clients c ON c.merchant_id = m.id
       WHERE m.id = $1 AND c.id = $2`,
      [merchantId, clientId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new ApiError(404, "Card not found", null, "CARD_NOT_FOUND");
    }

    const qrPayload = `${row.merchant_id}:${row.client_id}:${row.points}`;

    return sendSuccess(res, {
      data: {
        merchant: {
          id: row.merchant_id,
          businessName: row.business_name,
          brandColor: row.brand_color,
          rewardThreshold: row.reward_threshold,
          rewardLabel: row.reward_label
        },
        client: {
          id: row.client_id,
          fullName: row.full_name,
          points: row.points,
          visits: row.visits,
          createdAt: row.created_at
        },
        qrPayload
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPublicCard
};

