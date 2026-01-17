const rateLimit = require("express-rate-limit");

const registerFarmerLimiter = rateLimit({
  windowms: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Too many registration attempts from this IP, please try again later.",
  },
});

const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  registerFarmerLimiter,
  readLimiter,
};
