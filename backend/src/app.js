const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const apiLimiter = require("./middleware/rateLimiter");
const billingRoutes = require("./routes/billingRoutes");
const { handleBillingWebhook } = require("./controllers/billingWebhookController");
const authRoutes = require("./routes/authRoutes");
const clientRoutes = require("./routes/clientRoutes");
const walletRoutes = require("./routes/walletRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const onboardingRoutes = require("./routes/onboardingRoutes");
const publicRoutes = require("./routes/publicRoutes");
const errorHandler = require("./middleware/errorHandler");
const requestLogger = require("./middleware/requestLogger");
const { sendSuccess } = require("./utils/httpResponse");
const { processDueReviewNotifications } = require("./services/reviewNotificationWorker");
const { processAutomationEmails } = require("./services/automationEmailService");

let lastHealthReviewProcessMs = 0;
let lastHealthAutomationProcessMs = 0;

const app = express();

app.use(helmet());
app.use(cors());
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), handleBillingWebhook);
app.use(express.json({ limit: "5mb" }));
app.use(requestLogger);
app.use("/api", apiLimiter);

app.get("/health", (req, res) => {
  const now = Date.now();
  if (now - lastHealthReviewProcessMs > 25_000) {
    lastHealthReviewProcessMs = now;
    processDueReviewNotifications(20).catch((err) =>
      console.error("[health] review notifications:", err.message || err)
    );
  }
  if (now - lastHealthAutomationProcessMs > 55_000) {
    lastHealthAutomationProcessMs = now;
    processAutomationEmails(10).catch((err) =>
      console.error("[health] automation emails:", err.message || err)
    );
  }
  return sendSuccess(res, {
    data: { status: "ok" }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/public", publicRoutes);

app.use(errorHandler);

module.exports = app;
