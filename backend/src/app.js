const express = require("express");
const routes = require("./routes");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const requestTracing = require("./middleware/requestTracing");

function createApp() {
  const app = express();

  app.use(requestTracing);
  app.use(express.json());
  app.use(routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
