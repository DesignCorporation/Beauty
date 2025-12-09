import express, { type Router } from 'express'
import passport from 'passport'
import crypto from 'node:crypto'
import { oauthInitiateLimiter } from '../middleware/rateLimiters'
import { ensureTurnstileChallenge } from '../utils/turnstile'
import { getCookieDomain, getSafeOAuthFallbackDomain, isAllowedOAuthDomain } from '../config/oauthConfig'

const router: Router = express.Router()

const OWNER_STATE_COOKIE = 'beauty_oauth_owner_state'
const OWNER_REDIRECT_COOKIE = 'beauty_oauth_owner_redirect'
const OWNER_MODE_COOKIE = 'beauty_oauth_owner_mode'
const STATE_COOKIE_NAME = 'beauty_oauth_state'
const REDIRECT_COOKIE_NAME = 'beauty_oauth_redirect'

const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:6021/api/auth/google/callback'
const isHttpsDomain = callbackUrl.startsWith('https://') || process.env.NODE_ENV === 'production'
const cookieDomain = getCookieDomain()

const cookieOptions: express.CookieOptions = {
  httpOnly: true,
  secure: isHttpsDomain,
  sameSite: isHttpsDomain ? 'none' : 'lax',
  maxAge: 10 * 60 * 1000,
  path: '/',
  domain: cookieDomain
}

// ✅ ДИНАМИЧЕСКОЕ определение базового URL на основе текущего запроса (НЕ жестко кодировано!)
// Это гарантирует что перенаправление происходит на тот же домен где был сделан запрос
const getBaseUrlFromRequest = (req: express.Request, portalType: 'crm' | 'client'): string => {
  const forwardedHost = req.headers['x-forwarded-host'] as string | undefined
  const host = req.headers['host'] as string | undefined
  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim()
  const protocol = forwardedProto || (req.protocol ?? 'https')

  const currentHost = (forwardedHost || host || getSafeOAuthFallbackDomain()).toLowerCase()

  if (!isAllowedOAuthDomain(currentHost)) {
    const fallback = getSafeOAuthFallbackDomain()
    console.warn(`[Auth][Google OAuth Owner] Redirect to ${currentHost} blocked, using fallback ${fallback}`)
    return `${protocol}://${fallback}`
  }

  return `${protocol}://${currentHost}`
}

const isAllowedRedirectHost = (host: string): boolean => {
  if (!host) return false
  const normalized = host.toLowerCase()

  const allowed = isAllowedOAuthDomain(normalized)
  if (!allowed && process.env.NODE_ENV === 'production') {
    console.warn('[Auth][Google OAuth Owner] Rejected redirect host', normalized)
  }

  return allowed
}

const sanitizeRedirectUrl = (raw?: string | null): string | null => {
  if (!raw) return null
  try {
    const parsed = new URL(raw)
    const normalizedHost = parsed.host.toLowerCase()
    if (!isAllowedRedirectHost(normalizedHost)) {
      return null
    }
    return parsed.toString()
  } catch (error) {
    console.warn('[Auth][Google OAuth Owner] Invalid redirectUrl provided', { raw, error })
    return null
  }
}

router.get('/google-owner', oauthInitiateLimiter, async (req, res, next) => {
  // Временный лог для диагностики некорректных редиректов
  console.log('[Auth][Google OAuth Owner] incoming', {
    host: req.headers.host,
    xForwardedHost: req.headers['x-forwarded-host'],
    xForwardedProto: req.headers['x-forwarded-proto'],
    originalUrl: req.originalUrl,
    nodeEnv: process.env.NODE_ENV
  })

  const turnstileOk = await ensureTurnstileChallenge(req, res, { context: 'google-owner', required: true })
  if (!turnstileOk) {
    return
  }

  const state = crypto.randomUUID()
  const redirectCandidate = sanitizeRedirectUrl(req.query.redirectUrl as string | undefined)
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://salon.beauty.designcorp.eu'
    : getBaseUrlFromRequest(req, 'crm')
  const targetRedirect = redirectCandidate ?? `${baseUrl}/dashboard`
  // Для нерегистрированных пользователей: redirect на /auth/register?signup=1 (чтобы показать форму регистрации)
  const registrationRedirect = `${baseUrl}/auth/register?signup=1`

  console.log('[Auth][Google OAuth Owner] Initiating owner OAuth', {
    baseUrl,
    requestedRedirect: req.query.redirectUrl,
    targetRedirect,
    registrationRedirect
  })

  res.cookie(STATE_COOKIE_NAME, state, cookieOptions)
  res.cookie(OWNER_STATE_COOKIE, state, cookieOptions)
  res.cookie(OWNER_MODE_COOKIE, '1', cookieOptions)

  res.cookie(REDIRECT_COOKIE_NAME, targetRedirect, cookieOptions)
  res.cookie(OWNER_REDIRECT_COOKIE, targetRedirect, cookieOptions)
  // Сохраняем redirect для нерегистрированных пользователей в отдельную переменную
  res.cookie('beauty_oauth_registration_redirect', registrationRedirect, cookieOptions)

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    session: false,
    state
  })(req, res, next)
})

export default router
