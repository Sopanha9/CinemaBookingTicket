class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

function notFoundHandler(req, res, next) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? "Internal server error" : error.message;

  if (statusCode >= 500) {
    console.error(
      JSON.stringify({
        level: "error",
        requestId: req.requestId || null,
        message: error.message,
        stack: error.stack,
      }),
    );
  }

  res.status(statusCode).json({
    error: message,
    requestId: req.requestId || null,
  });
}

module.exports = {
  HttpError,
  notFoundHandler,
  errorHandler,
};
