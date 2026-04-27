function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const log = {
      level: "info",
      type: "http_request",
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      merchantId: req.auth?.merchantId || null
    };
    console.log(JSON.stringify(log));
  });
  next();
}

module.exports = requestLogger;
