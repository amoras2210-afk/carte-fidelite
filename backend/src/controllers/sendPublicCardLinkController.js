const { z } = require("zod");
const db = require("../config/db");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/httpResponse");
const { verifyCardToken } = require("../utils/cardToken");
const { sendCardLinkToClientEmail } = require("../services/notificationService");

const bodySchema = z.object({
  cardToken: z.string().min(20)
});

async function sendPublicCardLink(req, res, next) {
  try {
    const { cardToken } = bodySchema.parse(req.body || {});
    const { merchantId, clientId } = verifyCardToken(cardToken);

    const clientResult = await db.query(
      `SELECT email, full_name FROM clients WHERE id = $1 AND merchant_id = $2`,
      [clientId, merchantId]
    );
    const client = clientResult.rows[0];
    if (!client) {
      throw new ApiError(404, "Client introuvable", null, "CLIENT_NOT_FOUND");
    }

    const merchantResult = await db.query(`SELECT business_name FROM merchants WHERE id = $1`, [merchantId]);
    const merchantName = merchantResult.rows[0]?.business_name || "Commerce";

    const base = String(env.publicFrontendUrl || "").trim().replace(/\/$/, "");
    if (!base) {
      throw new ApiError(500, "PUBLIC_FRONTEND_URL manquant dans la configuration serveur", null, "PUBLIC_FRONTEND_URL_MISSING");
    }
    const cardUrl = `${base}/card/${encodeURIComponent(cardToken)}`;

    const delivery = await sendCardLinkToClientEmail({
      merchantId,
      merchantName,
      clientEmail: client.email,
      clientName: client.full_name,
      cardUrl
    });

    return sendSuccess(res, { data: delivery });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  sendPublicCardLink
};
