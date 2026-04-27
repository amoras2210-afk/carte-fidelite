const jwt = require("jsonwebtoken");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token;

  if ((!authHeader || !authHeader.startsWith("Bearer ")) && !queryToken) {
    return next(new ApiError(401, "Missing or invalid authorization token", null, "AUTH_MISSING_TOKEN"));
  }

  const token = queryToken || authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.auth = payload;
    return next();
  } catch (error) {
    return next(new ApiError(401, "Token expired or invalid", null, "AUTH_INVALID_TOKEN"));
  }
}

module.exports = authMiddleware;
