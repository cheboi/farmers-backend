const expressWinston = require("express-winston");
const logger = require("../utils/logger");

module.exports = expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}}",
  expressFormat: true,
  colorize: false,
  ignoreRoute: (req) => req.url === "/health",
});
