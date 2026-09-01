import rateLimit from "express-rate-limit";

const rateLimitMessage = {
  error: "Trop de tentatives. Veuillez réessayer plus tard.",
};

function createLimiter(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitMessage,
    handler: (_req, res) => {
      res.status(429).json(rateLimitMessage);
    },
  });
}

/** POST /api/auth/register — 5 per IP per hour */
export const registerLimiter = createLimiter(60 * 60 * 1000, 5);

/** POST /api/auth/login — 10 per 15 minutes */
export const loginLimiter = createLimiter(15 * 60 * 1000, 10);

/** POST /api/auth/forgot-password — 3 per hour */
export const forgotPasswordLimiter = createLimiter(60 * 60 * 1000, 3);

/** POST /api/auth/delete-account — 3 per hour */
export const deleteAccountLimiter = createLimiter(60 * 60 * 1000, 3);

/** POST /api/auth/resend-verification — 3 per hour */
export const resendVerificationLimiter = createLimiter(60 * 60 * 1000, 3);
