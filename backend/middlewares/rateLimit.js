const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  max: 30,
  message: {
    error: "Too many login attempts. Please try again after 5 minutes.",
  },
});

module.exports = loginLimiter;
