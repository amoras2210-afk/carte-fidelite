const jwt = require("jsonwebtoken");
const env = require("../config/env");
const ApiError = require("./ApiError");

const CARD_TOKEN_AUD = "public_card";
const CARD_TOKEN_TYP = "card";

function signCardToken({ merchantId, clientId, expiresIn = "365d" }) {
  return jwt.sign(
    { merchantId, clientId, typ: CARD_TOKEN_TYP, aud: CARD_TOKEN_AUD },
    env.jwtSecret,
    { expiresIn }
  );
}

function verifyCardToken(token) {
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload?.aud !== CARD_TOKEN_AUD || payload?.typ !== CARD_TOKEN_TYP) {
      throw new ApiError(401, "Invalid card token", null, "INVALID_CARD_TOKEN");
    }
    if (!payload.merchantId || !payload.clientId) {
      throw new ApiError(401, "Invalid card token", null, "INVALID_CARD_TOKEN");
    }
    return payload;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "Invalid or expired card token", null, "INVALID_CARD_TOKEN");
  }
}

module.exports = {
  signCardToken,
  verifyCardToken
};

