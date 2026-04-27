const path = require("path");
const dotenv = require("dotenv");

// Always load backend/.env (npm may start the process from repo root via `npm run dev`)
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "unsafe-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:4000",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 150),
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: String(process.env.SMTP_SECURE || "false") === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "no-reply@loyalty.local",
  appleWalletPassphrase: process.env.APPLE_WALLET_PASSPHRASE || "",
  appleWalletWWDRPath: process.env.APPLE_WALLET_WWDR_PATH || "",
  appleWalletSignerCertPath: process.env.APPLE_WALLET_SIGNER_CERT_PATH || "",
  appleWalletSignerKeyPath: process.env.APPLE_WALLET_SIGNER_KEY_PATH || "",
  appleWalletPassTypeIdentifier: process.env.APPLE_WALLET_PASS_TYPE_IDENTIFIER || "pass.com.yourcompany.loyalty",
  appleWalletTeamIdentifier: process.env.APPLE_WALLET_TEAM_IDENTIFIER || "YOUR_TEAM_IDENTIFIER",
  googleWalletIssuerId: process.env.GOOGLE_WALLET_ISSUER_ID || "",
  googleWalletClassSuffix: process.env.GOOGLE_WALLET_CLASS_SUFFIX || "loyalty_class"
};

module.exports = env;
