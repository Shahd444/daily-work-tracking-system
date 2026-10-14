const rateLimit = require('express-rate-limit');

// Brute-force protection for the login endpoint: only failed attempts count,
// so normal users are never locked out by logging in repeatedly.
const loginLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ message: 'Too many failed login attempts. Please try again later.' });
  }
});

module.exports = { loginLimiter };
