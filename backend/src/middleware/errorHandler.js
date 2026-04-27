const { sendError } = require("../utils/httpResponse");

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Unexpected server error";
  const code = err.code || "INTERNAL_ERROR";

  if (process.env.NODE_ENV !== "production") {
    // Keep useful debug data in development only.
    return sendError(res, {
      statusCode,
      code,
      message,
      details: {
        context: err.details || null,
        stack: err.stack
      }
    });
  }

  return sendError(res, {
    statusCode,
    code,
    message,
    details: err.details || null
  });
}

module.exports = errorHandler;
