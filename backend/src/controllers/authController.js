const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const db = require("../config/db");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const { logAuditEvent } = require("../services/auditService");
const { sendSuccess } = require("../utils/httpResponse");

const registerSchema = z.object({
  businessName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

function issueToken(merchant) {
  return jwt.sign(
    {
      merchantId: merchant.id,
      email: merchant.email,
      businessName: merchant.business_name
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

async function register(req, res, next) {
  try {
    const payload = registerSchema.parse(req.body);

    const existing = await db.query("SELECT id FROM merchants WHERE email = $1", [payload.email]);
    if (existing.rowCount > 0) {
      throw new ApiError(409, "Merchant already exists with this email", null, "MERCHANT_EXISTS");
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const result = await db.query(
      `INSERT INTO merchants (business_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, business_name, email, created_at`,
      [payload.businessName, payload.email, passwordHash]
    );

    const merchant = result.rows[0];
    await db.query(
      "INSERT INTO loyalty_settings (merchant_id, reward_threshold, reward_label) VALUES ($1, $2, $3)",
      [merchant.id, 10, "1 reward"]
    );
    await logAuditEvent({
      merchantId: merchant.id,
      action: "merchant.registered",
      targetType: "merchant",
      targetId: merchant.id
    });
    const token = issueToken(merchant);

    return sendSuccess(res, { statusCode: 201, data: { token, merchant } });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const payload = loginSchema.parse(req.body);
    const result = await db.query("SELECT * FROM merchants WHERE email = $1", [payload.email]);
    if (!result.rows[0]) {
      throw new ApiError(401, "Invalid credentials", null, "INVALID_CREDENTIALS");
    }

    const merchant = result.rows[0];
    const isValid = await bcrypt.compare(payload.password, merchant.password_hash);
    if (!isValid) {
      throw new ApiError(401, "Invalid credentials", null, "INVALID_CREDENTIALS");
    }

    const token = issueToken(merchant);
    await logAuditEvent({
      merchantId: merchant.id,
      action: "merchant.logged_in",
      targetType: "merchant",
      targetId: merchant.id
    });
    return sendSuccess(res, {
      data: {
        token,
        merchant: {
          id: merchant.id,
          business_name: merchant.business_name,
          email: merchant.email,
          created_at: merchant.created_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login
};
