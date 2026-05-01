const db = require("../config/db");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/httpResponse");
const { getStripe, isStripeConfigured } = require("../services/billingStripe");

async function getBillingStatus(req, res, next) {
  try {
    const result = await db.query(
      `SELECT subscription_status, subscription_current_period_end, stripe_customer_id
       FROM merchants WHERE id = $1`,
      [req.auth.merchantId]
    );
    const row = result.rows[0];
    if (!row) throw new ApiError(404, "Merchant not found", null, "NOT_FOUND");

    return sendSuccess(res, {
      data: {
        stripeConfigured: isStripeConfigured(),
        subscriptionStatus: row.subscription_status || "inactive",
        currentPeriodEnd: row.subscription_current_period_end,
        portalAvailable: Boolean(row.stripe_customer_id && isStripeConfigured())
      }
    });
  } catch (error) {
    next(error);
  }
}

async function createCheckoutSession(req, res, next) {
  try {
    const stripe = getStripe();
    if (!stripe || !env.stripePriceId) {
      throw new ApiError(503, "Paiement Stripe non configuré.", null, "BILLING_UNAVAILABLE");
    }

    const merchantResult = await db.query(
      "SELECT id, email, business_name, stripe_customer_id FROM merchants WHERE id = $1",
      [req.auth.merchantId]
    );
    const merchant = merchantResult.rows[0];
    if (!merchant) throw new ApiError(404, "Merchant not found", null, "NOT_FOUND");

    let customerId = merchant.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: merchant.email || undefined,
        name: merchant.business_name || undefined,
        metadata: { merchant_id: merchant.id }
      });
      customerId = customer.id;
      await db.query("UPDATE merchants SET stripe_customer_id = $1 WHERE id = $2", [customerId, merchant.id]);
    }

    const frontBase = env.publicFrontendUrl.replace(/\/$/, "");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: env.stripePriceId, quantity: 1 }],
      success_url: `${frontBase}/tableau?paiement=reussi`,
      cancel_url: `${frontBase}/?paiement=annule`,
      client_reference_id: merchant.id,
      metadata: { merchant_id: merchant.id },
      subscription_data: {
        metadata: { merchant_id: merchant.id }
      },
      allow_promotion_codes: true
    });

    return sendSuccess(res, { data: { url: session.url } });
  } catch (error) {
    if (error?.type && String(error.type).startsWith("Stripe")) {
      const message =
        typeof error.message === "string" && error.message.trim()
          ? error.message
          : "Erreur Stripe lors de la création du paiement.";
      return next(new ApiError(502, message, { stripeType: error.type }, "STRIPE_ERROR"));
    }
    next(error);
  }
}

module.exports = {
  getBillingStatus,
  createCheckoutSession
};
