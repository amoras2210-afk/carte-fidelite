const db = require("../config/db");
const ApiError = require("../utils/ApiError");

const ACTIVE_STATES = new Set(["active", "trialing"]);

async function subscriptionGuard(req, _res, next) {
  try {
    const result = await db.query("SELECT subscription_status FROM merchants WHERE id = $1", [req.auth.merchantId]);
    const status = result.rows[0]?.subscription_status || "inactive";
    if (!ACTIVE_STATES.has(status)) {
      throw new ApiError(402, "Subscription required", { subscriptionStatus: status }, "SUBSCRIPTION_REQUIRED");
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = subscriptionGuard;
