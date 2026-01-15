const { path } = require("../app");
const logger = require("../utils/logger");

module.exports = (err, req, res, next) => {
  logger.error("Unhandled error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
};
