import rateLimit from "express-rate-limit"
export const rateLimter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 50, // limit each IP to 10 requests per windowMs
     message: {
          success: false,
          error: "too_many_requests",
          message: "Too many requests — please try again later.",
          retryAfter: "15 minutes",
     },
     standardHeaders: true,
     legacyHeaders: false,
     skip: () => process.env.NODE_ENV === "test",
})
