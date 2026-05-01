const db = require("../config/db");
const ApiError = require("../utils/ApiError");

/** Bloque l’usage métier tant que l’abonnement Stripe n’est pas actif ou en essai. */
async function subscriptionGuard(req, res, next) {
  try {
    const result = await db.query(`SELECT subscription_status FROM merchants WHERE id = $1`, [req.auth.merchantId]);
    const status = result.rows[0]?.subscription_status || "inactive";
    if (status === "active" || status === "trialing") {
      return next();
    }
    return next(new ApiError(403, "Abonnement actif requis pour utiliser cette fonctionnalité.", null, "SUBSCRIPTION_REQUIRED"));
  } catch (error) {
    next(error);
  }
}

module.exports = subscriptionGuard;
