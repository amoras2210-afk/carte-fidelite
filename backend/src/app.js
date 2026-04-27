const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const apiLimiter = require("./middleware/rateLimiter");
const authRoutes = require("./routes/authRoutes");
const clientRoutes = require("./routes/clientRoutes");
const walletRoutes = require("./routes/walletRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const onboardingRoutes = require("./routes/onboardingRoutes");
const errorHandler = require("./middleware/errorHandler");
const requestLogger = require("./middleware/requestLogger");
const { sendSuccess } = require("./utils/httpResponse");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use("/api", apiLimiter);

app.get("/health", (req, res) => {
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
app.use("/api/analytics", analyticsRoutes);

app.use(errorHandler);

module.exports = app;
