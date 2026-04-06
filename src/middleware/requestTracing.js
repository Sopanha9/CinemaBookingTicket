const crypto = require("crypto");

function createRequestId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function requestTracing(req, res, next) {
  const requestId = req.headers["x-request-id"] || createRequestId();
  const startedAt = Date.now();

  req.requestId = String(requestId);
  req.startedAt = startedAt;
  res.setHeader("x-request-id", req.requestId);

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const logEntry = {
      level: "info",
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      timestamp: new Date().toISOString(),
    };

    console.log(JSON.stringify(logEntry));
  });

  next();
}

module.exports = requestTracing;
