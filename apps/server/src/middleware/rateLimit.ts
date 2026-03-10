import rateLimit from "express-rate-limit"
export const rateLimter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 10, // limit each IP to 10 requests per windowMs
     message: {
          success: false,
          errors: "too many requests, please try again later.",
          status: 429,
     },
     standardHeaders: true,
     legacyHeaders: false,
})
