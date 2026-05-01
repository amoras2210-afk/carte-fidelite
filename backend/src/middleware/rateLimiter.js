const rateLimit = require("express-rate-limit");
const env = require("../config/env");

const apiLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMaxRequests,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, try again later." },
  skip: (req) => req.method === "POST" && req.originalUrl?.replace(/\/$/, "").endsWith("/api/billing/webhook")
});

module.exports = apiLimiter;
