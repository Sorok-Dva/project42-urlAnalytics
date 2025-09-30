import rateLimit from 'express-rate-limit'
import { env } from '../config/env'

export const apiRateLimit = rateLimit({
  windowMs: env.rateLimit.window * 1000,
  max: env.rateLimit.apiMax,
  standardHeaders: true,
  legacyHeaders: false
})
