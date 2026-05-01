const app = require("./app");
const env = require("./config/env");
const { isStripeConfigured } = require("./services/billingStripe");
const { startReviewNotificationWorker } = require("./services/reviewNotificationWorker");
const { startAutomationEmailWorker } = require("./services/automationEmailService");

app.listen(env.port, () => {
  console.log(`Backend running on port ${env.port}`);
  const pf = env.publicFrontendUrl || "";
  if (env.nodeEnv === "production" && /localhost|127\.0\.0\.1/.test(pf)) {
    console.warn(
      "[Stripe] PUBLIC_FRONTEND_URL pointe vers localhost — configurez l’URL HTTPS réelle du frontend pour les redirections après paiement."
    );
  }
  if (!isStripeConfigured()) {
    console.warn("[Stripe] Paiement désactivé : renseignez STRIPE_SECRET_KEY et STRIPE_PRICE_ID.");
  } else if (!env.stripeWebhookSecret) {
    console.warn(
      "[Stripe] STRIPE_WEBHOOK_SECRET manquant — sans webhook, l’abonnement peut rester « inactif » après paiement jusqu’à synchro manuelle."
    );
  }
});

const stopReviewWorker = startReviewNotificationWorker();
const stopAutomationWorker = startAutomationEmailWorker();

process.on("SIGTERM", () => {
  stopReviewWorker();
  stopAutomationWorker();
});
process.on("SIGINT", () => {
  stopReviewWorker();
  stopAutomationWorker();
});
