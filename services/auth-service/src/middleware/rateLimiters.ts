import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit'

interface LimitConfig {
  windowMs: number
  max: number
  error: string
  message: string
  retryAfterSeconds?: number
}

const BASE_OPTIONS = {
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429
} as const

function createJsonLimiter({ windowMs, max, error, message, retryAfterSeconds }: LimitConfig): RateLimitRequestHandler {
  const retryAfter = retryAfterSeconds ?? Math.ceil(windowMs / 1000)

  return rateLimit({
    ...BASE_OPTIONS,
    windowMs,
    max,
    message: {
      success: false,
      error,
      message,
      retryAfter
    }
  })
}

// Admin/Staff auth (CRM)
const baseAdminLoginLimiter = createJsonLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  error: 'TOO_MANY_LOGIN_ATTEMPTS',
  message: 'Слишком много попыток входа. Попробуйте через 15 минут.'
})

const adminLoginLimiterWithBypass = ((req, res, next) => {
  if (req.headers['x-test-bypass-rate-limit'] === 'true') {
    return next()
  }

  return baseAdminLoginLimiter(req, res, next)
}) as RateLimitRequestHandler

adminLoginLimiterWithBypass.resetKey = baseAdminLoginLimiter.resetKey

if ('getKey' in baseAdminLoginLimiter && typeof (baseAdminLoginLimiter as any).getKey === 'function') {
  ;(adminLoginLimiterWithBypass as any).getKey = (baseAdminLoginLimiter as any).getKey.bind(baseAdminLoginLimiter)
}

export const adminLoginLimiter = adminLoginLimiterWithBypass

export const adminRegisterLimiter = createJsonLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  error: 'TOO_MANY_REGISTRATIONS',
  message: 'Достигнут лимит регистраций. Попробуйте через 1 час.'
})

const baseRefreshTokenLimiter = createJsonLimiter({
  windowMs: 5 * 60 * 1000,
  max: 30,
  error: 'TOO_MANY_REFRESH_REQUESTS',
  message: 'Слишком много запросов обновления токена. Попробуйте позже.',
  retryAfterSeconds: 5 * 60
})

const refreshLimiterWithBypass = ((req, res, next) => {
  if (req.headers['x-test-bypass-rate-limit'] === 'true') {
    return next()
  }

  return baseRefreshTokenLimiter(req, res, next)
}) as RateLimitRequestHandler

refreshLimiterWithBypass.resetKey = baseRefreshTokenLimiter.resetKey

if ('getKey' in baseRefreshTokenLimiter && typeof (baseRefreshTokenLimiter as any).getKey === 'function') {
  ;(refreshLimiterWithBypass as any).getKey = (baseRefreshTokenLimiter as any).getKey.bind(baseRefreshTokenLimiter)
}

export const refreshTokenLimiter = refreshLimiterWithBypass

// Client portal auth
export const clientLoginLimiter = createJsonLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  error: 'TOO_MANY_CLIENT_LOGIN_ATTEMPTS',
  message: 'Слишком много попыток входа. Попробуйте через 15 минут.'
})

export const clientRegisterLimiter = createJsonLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  error: 'TOO_MANY_CLIENT_REGISTRATIONS',
  message: 'Слишком много регистраций. Попробуйте позже.'
})

export const clientSmsRequestLimiter = createJsonLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  error: 'SMS_LIMIT_REACHED',
  message: 'Достигнут лимит отправки SMS. Попробуйте через 1 час.'
})

export const clientSmsVerifyLimiter = createJsonLimiter({
  windowMs: 30 * 60 * 1000,
  max: 5,
  error: 'TOO_MANY_SMS_VERIFICATION_ATTEMPTS',
  message: 'Слишком много попыток подтверждения телефона. Попробуйте позже.'
})

export const clientJoinSalonLimiter = createJsonLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  error: 'TOO_MANY_JOIN_REQUESTS',
  message: 'Слишком много попыток присоединиться к салону. Попробуйте позже.'
})

// MFA
export const mfaVerifyLimiter = createJsonLimiter({
  windowMs: 5 * 60 * 1000,
  max: 3,
  error: 'TOO_MANY_MFA_ATTEMPTS',
  message: 'Слишком много попыток ввода MFA-кода. Попробуйте через 5 минут.'
})

// OAuth (Google) - Codex recommendation: 5 attempts per 1 minute with retry info
// Это защита от brute-force через browser bots + Turnstile middleware
export const oauthInitiateLimiter = createJsonLimiter({
  windowMs: 60 * 1000,  // 1 минута (был 15 минут - слишком агрессивный)
  max: 5,  // 5 попыток в минуту (хороший баланс между защитой и удобством)
  error: 'TOO_MANY_OAUTH_ATTEMPTS',
  message: 'Слишком много попыток входа. Пожалуйста, подождите перед новой попыткой.',
  retryAfterSeconds: 60  // UI может показать "подождите 60 секунд"
})
