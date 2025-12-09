import express, { type Router } from 'express'
import passport, { GoogleAuthPayload } from '../config/passport'
import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import fs from 'node:fs'
import path from 'node:path'
import { tenantPrisma, prisma } from '@beauty-platform/database'
import { generateTokenPair, getTokenExpiration, hashToken } from '../utils/jwt'
import { UserRole, EntityStatus } from '@prisma/client'
import { oauthInitiateLimiter } from '../middleware/rateLimiters'
import { ensureTurnstileChallenge } from '../utils/turnstile'
import { getCookieDomain, getSafeOAuthFallbackDomain, isAllowedOAuthDomain } from '../config/oauthConfig'

const router: Router = express.Router()

const STATE_COOKIE_NAME = 'beauty_oauth_state'
const REDIRECT_COOKIE_NAME = 'beauty_oauth_redirect'
const OWNER_STATE_COOKIE = 'beauty_oauth_owner_state'
const OWNER_REDIRECT_COOKIE = 'beauty_oauth_owner_redirect'
const OWNER_MODE_COOKIE = 'beauty_oauth_owner_mode'
// Определяем среду по домену CALLBACK_URL, а не NODE_ENV
const callbackUrl = process.env.GOOGLE_CALLBACK_URL || ''
const isHttpsDomain = callbackUrl.startsWith('https://') || process.env.NODE_ENV === 'production'
const cookieDomain = getCookieDomain()

const stateCookieOptions: express.CookieOptions = {
  httpOnly: true,
  secure: isHttpsDomain,
  sameSite: isHttpsDomain ? 'none' : 'lax',
  maxAge: 10 * 60 * 1000,
  path: '/',
  domain: cookieDomain
}

const CLIENT_COOKIE_BASE: express.CookieOptions = {
  httpOnly: true,
  secure: isHttpsDomain, // secure если HTTPS
  sameSite: isHttpsDomain ? 'none' : 'lax', // none для HTTPS cross-origin
  domain: cookieDomain,
  path: '/'
}

// Cookie configuration dynamically set in AUTH_COOKIE_BASE (template not used)

// ✅ ДИНАМИЧЕСКОЕ определение базового URL на основе текущего запроса (НЕ жестко кодировано!)
// Это гарантирует что перенаправление происходит на тот же домен где был сделан запрос
const getBaseUrlFromRequest = (req: express.Request, portalType: 'crm' | 'client'): string => {
  // Получаем текущий хост из заголовков (x-forwarded-host приходит через API Gateway)
  const forwardedHost = req.headers['x-forwarded-host'] as string | undefined
  const host = req.headers['host'] as string | undefined
  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim()
  const protocol = forwardedProto || req.protocol || 'https'

  const currentHost = (forwardedHost || host || getSafeOAuthFallbackDomain()).toLowerCase()

  if (!isAllowedOAuthDomain(currentHost)) {
    const fallback = getSafeOAuthFallbackDomain()
    console.warn(`[OAuth] Redirect to ${currentHost} blocked, using fallback ${fallback}`)
    return `${protocol}://${fallback}`
  }

  return `${protocol}://${currentHost}`
}

// DEPRECATED: Жестко кодированные URL - больше НЕ используются!
// const CLIENT_PORTAL_BASE_URL =
//   process.env.CLIENT_PORTAL_URL ||
//   (callbackUrl.includes('dev-api') ? 'https://dev-client.beauty.designcorp.eu' : 'https://client.beauty.designcorp.eu')
// const CRM_BASE_URL =
//   process.env.CRM_URL ||
//   (callbackUrl.includes('dev-api') ? 'https://dev-salon.beauty.designcorp.eu' : 'https://salon.beauty.designcorp.eu')

const debugLogDir = path.resolve(process.cwd(), '../../logs/auth-service')
const debugLogFile = path.join(debugLogDir, 'oauth-callback-debug.log')

const appendDebugLog = (entry: Record<string, unknown>) => {
  try {
    fs.mkdirSync(debugLogDir, { recursive: true })
    const timestamp = new Date().toISOString()
    fs.appendFileSync(debugLogFile, JSON.stringify({ timestamp, ...entry }) + '\n', { encoding: 'utf8' })
  } catch (error) {
    console.error('[Auth][Google OAuth] Failed to write debug log:', error)
  }
}

const sanitizeRedirectUrl = (raw?: string | null): string | null => {
  if (!raw) return null
  try {
    const parsed = new URL(raw)
    const normalizedHost = parsed.host.toLowerCase()
    if (!isAllowedOAuthDomain(normalizedHost)) {
      return null
    }
    return parsed.toString()
  } catch (error) {
    console.warn('[Auth][Google OAuth] Invalid redirectUrl provided', { raw, error })
    return null
  }
}

router.get('/google', oauthInitiateLimiter, async (req, res, next) => {
  // Временный лог для диагностики некорректных редиректов
  console.log('[Auth][Google OAuth] incoming', {
    host: req.headers.host,
    xForwardedHost: req.headers['x-forwarded-host'],
    xForwardedProto: req.headers['x-forwarded-proto'],
    originalUrl: req.originalUrl,
    nodeEnv: process.env.NODE_ENV
  })

  const turnstileOk = await ensureTurnstileChallenge(req, res, { context: 'google-client', required: false })
  if (!turnstileOk) {
    // ensureTurnstileChallenge уже отправила res.status(400/502).json()
    // Просто возвращаемся, не отправляем еще один ответ
    return
  }

  const state = crypto.randomUUID()
  res.cookie(STATE_COOKIE_NAME, state, stateCookieOptions)

  const redirectCandidate = sanitizeRedirectUrl(req.query.redirectUrl as string | undefined)
  console.log('[Auth][Google OAuth] /google request:', {
    redirectUrl: req.query.redirectUrl,
    redirectCandidate,
    willSetCookie: !!redirectCandidate
  })

  if (redirectCandidate) {
    res.cookie(REDIRECT_COOKIE_NAME, redirectCandidate, stateCookieOptions)
    console.log('[Auth][Google OAuth] Set redirect cookie:', redirectCandidate)
  } else {
    res.clearCookie(REDIRECT_COOKIE_NAME, stateCookieOptions)
    console.log('[Auth][Google OAuth] Cleared redirect cookie (invalid URL)')
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    session: false,
    state
  })(req, res, next)
})

router.get('/google/callback', (req, res, next) => {
  const storedState = (req.cookies?.[STATE_COOKIE_NAME] as string | undefined) ??
    (req.cookies?.[OWNER_STATE_COOKIE] as string | undefined)
  const incomingState = req.query.state as string | undefined
  const redirectOverride = sanitizeRedirectUrl(req.cookies?.[REDIRECT_COOKIE_NAME])
  const ownerRedirectOverride = sanitizeRedirectUrl(req.cookies?.[OWNER_REDIRECT_COOKIE])
  const ownerMode = req.cookies?.[OWNER_MODE_COOKIE] === '1'
  const isProd = process.env.NODE_ENV === 'production'

  appendDebugLog({
    event: 'callback_received',
    hasStoredState: Boolean(storedState),
    hasIncomingState: Boolean(incomingState),
    ownerMode,
    redirectOverride,
    ownerRedirectOverride
  })

  if (!storedState || !incomingState || storedState !== incomingState) {
    res.clearCookie(STATE_COOKIE_NAME, stateCookieOptions)
    res.clearCookie(REDIRECT_COOKIE_NAME, stateCookieOptions)
    res.clearCookie(OWNER_STATE_COOKIE, stateCookieOptions)
    res.clearCookie(OWNER_REDIRECT_COOKIE, stateCookieOptions)
    res.clearCookie(OWNER_MODE_COOKIE, stateCookieOptions)

    // ✅ Динамическое определение baseURL
    const baseUrl = isProd
      ? ownerMode
        ? 'https://salon.beauty.designcorp.eu'
        : 'https://client.beauty.designcorp.eu'
      : getBaseUrlFromRequest(req, ownerMode ? 'crm' : 'client')
    const failureRedirect = `${baseUrl}/login?error=oauth_state_mismatch`

    appendDebugLog({
      event: 'state_mismatch',
      ownerMode,
      baseUrl,
      storedStatePresent: Boolean(storedState),
      incomingStatePresent: Boolean(incomingState)
    })
    return res.redirect(failureRedirect)
  }

  passport.authenticate('google', { session: false }, async (err, payload: GoogleAuthPayload | undefined) => {
    res.clearCookie(STATE_COOKIE_NAME, stateCookieOptions)
    res.clearCookie(REDIRECT_COOKIE_NAME, stateCookieOptions)
    res.clearCookie(OWNER_STATE_COOKIE, stateCookieOptions)
    res.clearCookie(OWNER_REDIRECT_COOKIE, stateCookieOptions)
    res.clearCookie(OWNER_MODE_COOKIE, stateCookieOptions)

    if (err || !payload) {
      // ✅ Динамическое определение baseURL (НЕ жестко кодировано!)
      const baseUrl = isProd
        ? ownerMode
          ? 'https://salon.beauty.designcorp.eu'
          : 'https://client.beauty.designcorp.eu'
        : getBaseUrlFromRequest(req, ownerMode ? 'crm' : 'client')
      const target = ownerMode
        ? (ownerRedirectOverride ?? `${baseUrl}/login`)
        : (redirectOverride ?? `${baseUrl}/login`)
      const failureRedirect = `${target}${target.includes('?') ? '&' : '?'}error=oauth_failed`
      return res.redirect(failureRedirect)
    }

    try {
      if (ownerMode) {
        const userRepo = tenantPrisma(null).user

        let user = await userRepo.findUnique({
          where: { email: payload.email },
          include: {
            ownedTenants: true,
            clientProfile: true
          }
        })

        if (!user) {
          const derivedFirstName = payload.firstName || payload.email.split('@')[0]
          const derivedLastName = payload.lastName || ''
          const randomPassword = crypto.randomBytes(24).toString('hex')
          const hashedPassword = await bcrypt.hash(randomPassword, 12)

          user = await userRepo.create({
            data: {
              email: payload.email,
              password: hashedPassword,
              firstName: derivedFirstName,
              lastName: derivedLastName,
              role: UserRole.CLIENT,
              status: EntityStatus.ACTIVE,
              emailVerified: true,
              passwordAutoGenerated: true
            },
            include: {
              ownedTenants: true,
              clientProfile: true
            }
          })

          appendDebugLog({
            event: 'owner_autoprovisioned',
            emailHash: crypto.createHash('sha256').update(user.email).digest('hex'),
            createdAt: new Date().toISOString()
          })
        }

        if (user.role === UserRole.CLIENT) {
          // Клиент может быть обновлен до SALON_OWNER через явную регистрацию
          user = await userRepo.update({
            where: { id: user.id },
            data: {
              role: UserRole.SALON_OWNER
            },
            include: {
              ownedTenants: true,
              clientProfile: true
            }
          })
          console.log('[Auth][Google OAuth Owner] Upgraded CLIENT to SALON_OWNER:', user.email)
        }

        const tenantMemberships = await prisma.userTenantRole.findMany({
          where: {
            userId: user.id,
            isActive: true
          },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true
              }
            }
          }
        })

        const tokenTenants = tenantMemberships.map((membership) => ({
          tenantId: membership.tenantId,
          tenantName: membership.tenant.name,
          slug: membership.tenant.slug,
          role: membership.role
        }))

        const activeTenantId = user.tenantId ?? tenantMemberships[0]?.tenantId
        const activeTenantRole = tenantMemberships.find((membership) => membership.tenantId === activeTenantId)?.role

        const roleRecord = await prisma.role.findUnique({
          where: { name: user.role },
          include: {
            permissions: {
              select: { name: true }
            }
          }
        })

        const permissions = roleRecord?.permissions.map((permission) => permission.name) ?? []

        const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim()
        const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim()
        const protocol = forwardedProto || (req.protocol ?? 'https')
        const host = forwardedHost || req.headers.host || 'localhost'
        const isSecure = protocol === 'https'
        const isBeautyDomain = host.endsWith('.beauty.designcorp.eu')

        const cookieOptions: express.CookieOptions = {
          httpOnly: true,
          secure: isSecure,
          sameSite: isSecure ? 'none' : 'lax',
          domain: isBeautyDomain ? '.beauty.designcorp.eu' : undefined,
          path: '/'
        }

        const deviceFingerprintSource = `${user.id}:${req.headers['user-agent'] ?? 'unknown'}`
        const deviceId = crypto.createHash('sha256').update(deviceFingerprintSource).digest('hex')
        const ipAddress =
          (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
          req.socket.remoteAddress ??
          null

        const deviceRecord = await prisma.device.upsert({
          where: {
            userId_deviceId: {
              userId: user.id,
              deviceId
            }
          },
          update: {
            lastUsedAt: new Date(),
            isActive: true,
            userAgent: req.headers['user-agent']?.toString() ?? null,
            ipAddress
          },
          create: {
            userId: user.id,
            deviceId,
            userAgent: req.headers['user-agent']?.toString() ?? null,
            ipAddress,
            deviceName: 'Web Browser',
            lastUsedAt: new Date(),
            isActive: true
          }
        })

        const tokens = await generateTokenPair({
          userId: user.id,
          role: user.role,
          email: user.email,
          tenants: tokenTenants,
          permissions,
          deviceId,
          ...(activeTenantId != null ? { tenantId: activeTenantId } : {}),
          ...(activeTenantRole ? { tenantRole: activeTenantRole } : {}),
          ...(user.firstName ? { firstName: user.firstName } : {}),
          ...(user.lastName ? { lastName: user.lastName } : {})
        })

        const refreshExpiry =
          getTokenExpiration(tokens.refreshToken) ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

        await tenantPrisma(null).refreshToken.create({
          data: {
            token: hashToken(tokens.refreshToken),
            userId: user.id,
            deviceId: deviceRecord.id,
            expiresAt: refreshExpiry,
            isUsed: false
          }
        })

        res.cookie('beauty_access_token', tokens.accessToken, {
          ...cookieOptions,
          maxAge: 15 * 60 * 1000
        })

        res.cookie('beauty_refresh_token', tokens.refreshToken, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000
        })

        const baseUrl = getBaseUrlFromRequest(req, 'crm')
        const hasActiveTenant = Boolean(activeTenantId)

        res.cookie('beauty_onboarding_required', hasActiveTenant ? '0' : '1', {
          ...cookieOptions,
          maxAge: 10 * 60 * 1000
        })

        const redirectTarget =
          ownerRedirectOverride ??
          `${baseUrl}${hasActiveTenant ? '/dashboard' : '/onboarding/create-salon'}`

        console.log('[Auth][Google OAuth Owner] Successful owner login', {
          email: user.email,
          redirectTarget
        })

        const ownedTenantsCount = Array.isArray((user as any)?.ownedTenants)
          ? ((user as any).ownedTenants as unknown[]).length
          : 0

        appendDebugLog({
          event: 'owner_success',
          emailHash: crypto.createHash('sha256').update(user.email).digest('hex'),
          redirectTarget,
          hasTenant: Boolean(user.tenantId),
          ownedTenants: ownedTenantsCount
        })

        return res.redirect(redirectTarget)
      }

      // ✅ SECURITY FIX: Google OAuth требует предварительной регистрации!
      const clientProfileRepo = tenantPrisma(null).clientProfile
      const googleId = payload.googleId || null

      // Ищем существующий ClientProfile по email
      let clientProfile = await clientProfileRepo.findUnique({
        where: { email: payload.email }
      })

      if (!clientProfile) {
        // ❌ КРИТИЧЕСКИ: Клиент НЕ зарегистрирован!
        // Требуем явную регистрацию перед Google OAuth
        console.error('[Auth][Google OAuth] Google OAuth attempted without registration:', payload.email)

        const baseUrl = getBaseUrlFromRequest(req, 'client')
        const failureRedirect = `${baseUrl}/auth/register?email=${encodeURIComponent(payload.email)}&error=must_register_first`

        console.log('[Auth][Google OAuth] Redirect unregistered client', {
          baseUrl,
          email: payload.email,
          failureRedirect
        })

        appendDebugLog({
          event: 'unregistered_oauth_attempt',
          email: payload.email,
          baseUrl,
          failureRedirect,
          timestamp: new Date().toISOString()
        })

        return res.redirect(failureRedirect)
      }



      // Существующий клиент - обновляем googleId если его еще нет
      if (!clientProfile.googleId && googleId) {
        clientProfile = await clientProfileRepo.update({
          where: { email: payload.email },
          data: { googleId }
        })
        console.log('[Auth][Google OAuth] Linked Google account to existing profile:', clientProfile.email)
      } else if (clientProfile.googleId && clientProfile.googleId !== googleId) {
        // Email уже привязан к другому Google аккаунту
        console.error('[Auth][Google OAuth] Email already linked to different Google account')
        const baseUrl = getBaseUrlFromRequest(req, 'client')
        const failureRedirect = `${baseUrl}/login?error=email_conflict`
        return res.redirect(failureRedirect)
      }

      // ✅ ИСПРАВЛЕНО: Google OAuth для Client Portal создаёт ТОЛЬКО ClientProfile (НЕ User)
      // Это обеспечивает независимую аутентификацию Client Portal от CRM

      // Генерируем JWT токены для CLIENT (БЕЗ userId - OAuth клиенты не имеют User record)
      const tokens = await generateTokenPair({
        email: clientProfile.email,
        firstName: clientProfile.firstName,
        lastName: clientProfile.lastName,
        phoneVerified: clientProfile.phoneVerified,
        role: 'CLIENT' // Всегда CLIENT для Client Portal
      })

      console.log('[Auth][Google OAuth] Client Portal OAuth login', {
        email: clientProfile.email,
        phoneVerified: clientProfile.phoneVerified,
        source: 'GOOGLE_OAUTH'
      })

      // Устанавливаем tokens как httpOnly cookies (консистентные с login-client)
      res.cookie('beauty_client_access_token', tokens.accessToken, {
        ...CLIENT_COOKIE_BASE,
        maxAge: 15 * 60 * 1000 // 15 minutes
      })
      res.cookie('beauty_access_token', tokens.accessToken, {
        ...CLIENT_COOKIE_BASE,
        maxAge: 15 * 60 * 1000 // 15 minutes
      })

      res.cookie('beauty_client_refresh_token', tokens.refreshToken, {
        ...CLIENT_COOKIE_BASE,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      })
      res.cookie('beauty_refresh_token', tokens.refreshToken, {
        ...CLIENT_COOKIE_BASE,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      })

      // Редирект в зависимости от phone verification статуса
      const redirectPath = clientProfile.phoneVerified ? '/dashboard' : '/complete-profile'
      const baseUrl = getBaseUrlFromRequest(req, 'client')
      console.log('[Auth][Google OAuth] Successful login', {
        email: clientProfile.email,
        redirectPath,
        phoneVerified: clientProfile.phoneVerified
      })

      appendDebugLog({
        event: 'client_success',
        emailHash: crypto.createHash('sha256').update(clientProfile.email).digest('hex'),
        redirectPath,
        tenantId: null, // Client Portal клиенты не привязаны к tenant
        phoneVerified: clientProfile.phoneVerified
      })

      if (redirectOverride) {
        return res.redirect(redirectOverride)
      }
      return res.redirect(`${baseUrl}${redirectPath}`)
      } catch (error) {
      console.error('[Auth][Google OAuth] Callback error:', error)
      appendDebugLog({
        event: 'callback_error',
        ownerMode,
        error: error instanceof Error
          ? { message: error.message, stack: error.stack }
          : { message: String(error) }
      })
      const baseUrl = getBaseUrlFromRequest(req, ownerMode ? 'crm' : 'client')
      const target = ownerMode
        ? (ownerRedirectOverride ?? `${baseUrl}/login`)
        : (redirectOverride ?? `${baseUrl}/login`)
      const failureRedirect = `${target}${target.includes('?') ? '&' : '?'}error=oauth_internal`
      return res.redirect(failureRedirect)
    }
  })(req, res, next)
})

export default router
