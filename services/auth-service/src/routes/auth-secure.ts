// Secure Authentication Routes with httpOnly Cookies
// Beauty Platform Auth Service - Enterprise Security 2024

import express from 'express'
import { tenantPrisma } from '@beauty-platform/database'
import { UserRole } from '@prisma/client'
import {
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromRequest,
  extractRefreshTokenFromRequest
} from '../utils/jwt'
import { getUserTenants, getPrimaryTenantRole, hasAccessToTenant } from '../utils/permissions'
import {
  adminLoginLimiter,
  refreshTokenLimiter
} from '../middleware/rateLimiters'
import { AuthService } from '../services/AuthService'
import { generateDeviceContext } from '../utils/device'

const router: express.Router = express.Router()
const authService = new AuthService()

/**
 * Настройки безопасных cookies
 */
type CookieSameSite = 'lax' | 'strict' | 'none'

function getCookieConfig(req: express.Request) {
  const host = (req.headers['x-forwarded-host'] as string) || req.hostname || ''
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol
  const isHttps = proto === 'https'
  const isProd = process.env.NODE_ENV === 'production'
  const isBeauty = /\.beauty\.designcorp\.eu$/i.test(host)

  const domain = isBeauty ? '.beauty.designcorp.eu' : (process.env.COOKIE_DOMAIN || undefined)

  let sameSite: CookieSameSite = 'lax'
  let secure = isProd || isHttps

  if (domain && isBeauty) {
    sameSite = 'none'
    secure = true
  }

  return {
    httpOnly: true,
    secure,
    sameSite,
    domain,
    path: '/'
  } as const
}

/**
 * POST /auth/login
 * Аутентификация с выдачей httpOnly cookies
 */
router.post('/login', adminLoginLimiter, async (req, res): Promise<void> => {
  try {
    const { email, password, tenantSlug } = req.body

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'MISSING_CREDENTIALS',
        message: 'Email and password required'
      })
      return
    }

    const deviceContext = generateDeviceContext(req)
    const result = await authService.login(
      {
        email: email.toLowerCase(),
        password,
        tenantSlug
      },
      deviceContext
    )

    if (!result.success) {
      const code = (result as any).code;
      if (code === 'MFA_REQUIRED') {
        res.status(200).json(result)
        return
      }

      const statusMap: Record<string, number> = {
        INVALID_CREDENTIALS: 401,
        ACCOUNT_INACTIVE: 403,
        TENANT_INACTIVE: 403,
        TENANT_MISMATCH: 403
      }

      const status = statusMap[code] ?? 400
      res.status(status).json(result)
      return
    }

    res.cookie('beauty_access_token', result.accessToken, {
      ...getCookieConfig(req),
      maxAge: 12 * 60 * 60 * 1000 // 12 часов
    })

    res.cookie('beauty_refresh_token', result.refreshToken, {
      ...getCookieConfig(req),
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
    })

    res.json({
      success: true,
      user: result.user,
      permissions: result.permissions,
      deviceId: result.deviceId,
      onboardingRequired: result.onboardingRequired,
      tenantSelectionRequired: result.tenantSelectionRequired
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Login failed'
    })
  }
})

/**
 * POST /auth/refresh
 * Обновление access токена через refresh токен из cookie
 */
router.post('/refresh', refreshTokenLimiter, async (req, res): Promise<void> => {
  try {
    const refreshToken = extractRefreshTokenFromRequest(req)

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: 'NO_REFRESH_TOKEN',
        message: 'Refresh token required'
      })
      return
    }

    // Генерируем новую пару токенов
    const deviceContext = generateDeviceContext(req)
    const result = await authService.refreshToken({ refreshToken }, deviceContext)

    if (!result.success) {
      res.clearCookie('beauty_access_token', { ...getCookieConfig(req), maxAge: 0 })
      res.clearCookie('beauty_refresh_token', { ...getCookieConfig(req), maxAge: 0 })
      res.status(401).json(result)
      return
    }

    const cookieConfig = getCookieConfig(req)

    res.cookie('beauty_access_token', result.accessToken, {
      ...cookieConfig,
      maxAge: 12 * 60 * 60 * 1000 // 12 часов
    })

    res.cookie('beauty_refresh_token', result.refreshToken, {
      ...cookieConfig,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
    })

    res.json({
      success: true,
      user: result.user,
      permissions: result.permissions,
      deviceId: result.deviceId,
      onboardingRequired: result.onboardingRequired,
      tenantSelectionRequired: result.tenantSelectionRequired
    })

  } catch (error) {
    console.error('Refresh error:', error)
    res.status(401).json({
      success: false,
      error: 'REFRESH_FAILED',
      message: 'Token refresh failed'
    })
  }
})

/**
 * GET /auth/force-logout
 * Принудительная очистка всех cookies (для экстренных случаев)
 */
router.get('/force-logout', async (req, res) => {
  try {
    // Очищаем все cookies связанные с аутентификацией
    res.clearCookie('beauty_access_token', {
      ...getCookieConfig(req),
      maxAge: 0
    })
    
    res.clearCookie('beauty_refresh_token', {
      ...getCookieConfig(req),
      maxAge: 0
    })
    
    res.clearCookie('beauty_mfa_verified', {
      ...getCookieConfig(req),
      maxAge: 0
    })
    
    res.clearCookie('_csrf', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0
    })
    
    res.json({
      success: true,
      message: 'All authentication cookies cleared'
    })
  } catch (error) {
    console.error('Force logout error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to clear cookies'
    })
  }
})

/**
 * POST /auth/logout
 * Выход с отзывом refresh токена
 */
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = extractRefreshTokenFromRequest(req)
    if (refreshToken) {
      let userId: string | undefined
      try {
        const payload = await verifyRefreshToken(refreshToken)
        userId = payload.userId
      } catch (error) {
        console.warn('Logout: failed to verify refresh token', error)
      }

      if (userId) {
        const deviceContext = generateDeviceContext(req)
        await authService.logout(refreshToken, userId, deviceContext)
      }
    }

    // Очищаем cookies
    res.clearCookie('beauty_access_token', {
      ...getCookieConfig(req),
      maxAge: 0
    })
    
    res.clearCookie('beauty_refresh_token', {
      ...getCookieConfig(req),
      maxAge: 0
    })

    res.json({
      success: true,
      message: 'Logged out successfully'
    })

  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      success: false,
      error: 'LOGOUT_FAILED',
      message: 'Logout failed'
    })
  }
})

/**
 * GET /auth/me
 * Получение информации о текущем пользователе
 */
router.get('/me', async (req, res): Promise<void> => {
  try {
    // Извлекаем токен
    const token = extractTokenFromRequest(req)
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'NO_TOKEN',
        message: 'Authentication token required'
      })
      return
    }

    // Валидируем токен
    let decoded
    try {
      decoded = await verifyAccessToken(token)
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      })
      return
    }

    // Проверяем наличие userId
    const userId = decoded.userId
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'NO_USER_ID',
        message: 'User ID not found in token'
      })
      return
    }

    // Получаем информацию о пользователе
    const user = await tenantPrisma(null).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        tenantId: true,
        status: true,
        password: true,
        passwordAutoGenerated: true,
        tenant: {
          select: { id: true, name: true, slug: true }
        }
      }
    })

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      })
      return
    }

    const tenantContext = await authService.getUserTenantContext({
      id: user.id,
      role: user.role,
      tenantId: user.tenantId ?? null
    })

    const tenants = tenantContext.tenants
    const activeTenantId = tenantContext.activeTenantId
    const activeTenant = tenants.find((tenant) => tenant.tenantId === activeTenantId) ?? null

    const onboardingRequired =
      user.role !== UserRole.SUPER_ADMIN && !activeTenantId
    const tenantSelectionRequired =
      user.role === UserRole.SUPER_ADMIN && !activeTenantId && tenants.length > 0

    const { password, passwordAutoGenerated, ...safeUser } = user
    const hasPassword = !!password && !passwordAutoGenerated

    res.json({
      success: true,
      user: {
        id: safeUser.id,
        email: safeUser.email,
        firstName: safeUser.firstName,
        lastName: safeUser.lastName,
        avatar: safeUser.avatar ?? null,
        role: safeUser.role,
        tenantId: activeTenantId || undefined,
        tenantSlug: activeTenant?.tenantSlug ?? (safeUser as any).tenant?.slug,
        tenantName: activeTenant?.tenantName ?? (safeUser as any).tenant?.name,
        tenant: activeTenant
          ? {
              id: activeTenant.tenantId,
              name: activeTenant.tenantName,
              slug: activeTenant.tenantSlug,
              logoUrl: activeTenant.logoUrl ?? null
            }
          : (safeUser as any).tenant,
        tenants,
        onboardingRequired,
        tenantSelectionRequired,
        hasPassword
      }
    })

  } catch (error) {
    console.error('Get user profile error:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to get user profile'
    })
  }
})

/**
 * POST /auth/switch-tenant
 * Переключение активного tenant (для multi-tenant users)
 */
router.post('/switch-tenant', async (req, res): Promise<void> => {
  try {
    const { tenantId } = req.body

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'MISSING_TENANT_ID',
        message: 'Tenant ID is required'
      })
      return
    }

    // Извлекаем текущий JWT токен
    const token = extractTokenFromRequest(req)
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'NO_TOKEN',
        message: 'Authentication token required'
      })
      return
    }

    // Валидируем токен
    let decoded
    try {
      decoded = await verifyAccessToken(token)
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      })
      return
    }

    const userId = decoded.userId
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'NO_USER_ID',
        message: 'User ID not found in token'
      })
      return
    }

    // Проверяем что user имеет доступ к target tenant
    const hasAccess = await hasAccessToTenant(userId, tenantId)
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have access to this tenant'
      })
      return
    }

    // Получаем информацию о tenant и роли user
    const tenant = await tenantPrisma(null).tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true }
    })

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: 'TENANT_NOT_FOUND',
        message: 'Tenant not found'
      })
      return
    }

    // Получаем роль user в этом tenant
    const tenantRole = await getPrimaryTenantRole(userId, tenantId)

    // Получаем список всех tenant user (для JWT payload)
    const tenants = await getUserTenants(userId)

    // Получаем user для дополнительных полей JWT
    console.log('🔍 DEBUG /switch-tenant - userId before Prisma:', userId, 'type:', typeof userId)
    const user = await tenantPrisma(null).user.update({
      where: { id: userId },
      data: {
        tenantId: tenant.id
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true
      }
    })

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      })
      return
    }

    // Проверяем наличие ClientProfile отдельно
    const clientProfile = await tenantPrisma(null).clientProfile.findUnique({
      where: { userId: user.id }
    })

    // Генерируем новые токены с обновленным tenant context
    const tokens = await generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: tenant.id,
      tenants: tenants.map(t => ({
        tenantId: t.tenantId,
        tenantName: t.tenantName,
        slug: t.slug,
        role: t.role
      })),
      isClient: !!clientProfile,
      ...(tenantRole ? { tenantRole } : {}),
      ...(user.firstName ? { firstName: user.firstName } : {}),
      ...(user.lastName ? { lastName: user.lastName } : {})
    })

    // Устанавливаем новые cookies
    const cookieConfig = getCookieConfig(req)

    res.cookie('beauty_access_token', tokens.accessToken, {
      ...cookieConfig,
      maxAge: 12 * 60 * 60 * 1000 // 12 hours
    })

    res.cookie('beauty_refresh_token', tokens.refreshToken, {
      ...cookieConfig,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    console.log(`[SWITCH-TENANT] User ${userId} switched to tenant ${tenantId} (${tenant.name})`)

    res.json({
      success: true,
      message: 'Tenant switched successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug
      },
      tenantRole,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn
    })
  } catch (error) {
    console.error('[SWITCH-TENANT] Error:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to switch tenant'
    })
  }
})

/**
 * POST /auth/revoke-all-sessions
 * Revoke all active sessions for the current user (Global Logout)
 */
router.post('/revoke-all-sessions', async (req, res): Promise<void> => {
  try {
    const token = extractTokenFromRequest(req)
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'NO_TOKEN',
        message: 'Authentication token required'
      })
      return
    }

    // Validate token
    let decoded
    try {
      decoded = await verifyAccessToken(token)
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      })
      return
    }

    const userId = decoded.userId
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'NO_USER_ID',
        message: 'User ID not found in token'
      })
      return
    }

    await authService.revokeAllSessions(userId, 'User requested global logout')

    // Clear cookies
    res.clearCookie('beauty_access_token', { ...getCookieConfig(req), maxAge: 0 })
    res.clearCookie('beauty_refresh_token', { ...getCookieConfig(req), maxAge: 0 })
    res.clearCookie('beauty_mfa_verified', { ...getCookieConfig(req), maxAge: 0 })

    res.json({
      success: true,
      message: 'All sessions revoked successfully'
    })
  } catch (error) {
    console.error('Revoke all sessions error:', error)
    res.status(500).json({
      success: false,
      error: 'REVOKE_FAILED',
      message: 'Failed to revoke sessions'
    })
  }
})

/**
 * GET /auth/health
 * Health check для auth service
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'auth-service',
    version: '1.0.0',
    features: {
      httpOnlyCookies: true,
      jwtValidation: true,
      refreshTokens: true,
      rateLimiting: true,
      securityHeaders: true,
      csrfProtection: true
    },
    timestamp: new Date().toISOString()
  })
})

export default router
