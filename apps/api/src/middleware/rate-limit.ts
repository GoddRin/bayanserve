import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter for Citizen OTP Generation requests.
 * Capped at 5 requests per 15 minutes per IP.
 */
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: 'Masyadong maraming OTP request. Mangyaring maghintay ng 15 minuto bago sumubok muli.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * General Rate Limiter for all public endpoints.
 * Capped at 100 requests per 15 minutes per IP.
 */
export const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Masyadong maraming requests. Mangyaring subukan muli pagkatapos ng ilang sandali.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
