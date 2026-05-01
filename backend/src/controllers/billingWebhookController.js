const db = require("../config/db");
const env = require("../config/env");
const { getStripe } = require("../services/billingStripe");

function toDate(timestampSec) {
  if (typeof timestampSec !== "number") return null;
  return new Date(timestampSec * 1000);
}

async function updateSubscriptionFromStripe(subscription, fallbackMerchantId) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id || null;
  const merchantId = subscription.metadata?.merchant_id || fallbackMerchantId || null;

  let resolvedMerchantId = merchantId;
  if (!resolvedMerchantId && customerId) {
    const fromCustomer = await db.query("SELECT id FROM merchants WHERE stripe_customer_id = $1", [customerId]);
    resolvedMerchantId = fromCustomer.rows[0]?.id || null;
  }
  if (!resolvedMerchantId) return;

  await db.query(
    `UPDATE merchants
     SET stripe_subscription_id = $1,
         stripe_customer_id = COALESCE($2, stripe_customer_id),
         subscription_status = $3,
         subscription_current_period_end = $4
     WHERE id = $5`,
    [subscription.id || null, customerId, subscription.status || "inactive", toDate(subscription.current_period_end), resolvedMerchantId]
  );
}

async function handleBillingWebhook(req, res) {
  const stripe = getStripe();
  if (!stripe || !env.stripeWebhookSecret) {
    res.status(503).send("Stripe webhook not configured");
    return;
  }

  const signature = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.stripeWebhookSecret);
  } catch (error) {
    res.status(400).send(`Webhook Error: ${error.message}`);
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await updateSubscriptionFromStripe(subscription, session.client_reference_id || null);
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      await updateSubscriptionFromStripe(event.data.object, null);
    }
  } catch (error) {
    console.error("[billing webhook]", error.message || error);
    res.status(500).send("Webhook handler failed");
    return;
  }

  res.json({ received: true });
}

module.exports = { handleBillingWebhook };
