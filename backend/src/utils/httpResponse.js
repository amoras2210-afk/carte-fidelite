function sendSuccess(res, { statusCode = 200, data = null, meta = null } = {}) {
  return res.status(statusCode).json({
    ok: true,
    data,
    meta
  });
}

function sendError(res, { statusCode = 500, code = "INTERNAL_ERROR", message = "Unexpected error", details = null }) {
  return res.status(statusCode).json({
    ok: false,
    error: {
      code,
      message,
      details
    }
  });
}

module.exports = {
  sendSuccess,
  sendError
};
