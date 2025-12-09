// JWT Utilities - Token generation and validation
// Beauty Platform Auth Service

import crypto from 'crypto'
import jwt, { JwtHeader, type Secret, type SignOptions } from 'jsonwebtoken'
import { UserRole, TenantRole } from '@prisma/client'
import { JWTPayload } from '../types/auth'
import { prisma } from '@beauty-platform/database'

// JWT Configuration from environment
export const JWT_CONFIG = {
  accessSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-beauty-platform-2025',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production-beauty-platform-2025',
  accessExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  issuer: process.env.JWT_ISSUER || 'beauty-platform-auth',
  audience: process.env.JWT_AUDIENCE || 'beauty-platform',
  rsaCacheTtl: parseInt(process.env.RSA_KEY_CACHE_TTL || '300000', 10),
  supportHS256: process.env.SUPPORT_HS256 ? process.env.SUPPORT_HS256 === 'true' : true
}

// Validate JWT configuration (in development we allow default secrets)
if (!JWT_CONFIG.accessSecret || !JWT_CONFIG.refreshSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables for production')
  }
  // В развработке используем fallback значения
  console.warn('Using default JWT secrets in development mode')
}

// RSA Key management is disabled (model not in database)
// Using HMAC-based JWT signing instead

function ensureTokenType(payload: JWTPayload, expected: JWTPayload['type']) {
  if (payload.type !== expected) {
    throw new Error('Invalid token type')
  }
}

function shouldUseHS256(header: JwtHeader | undefined): boolean {
  if (!JWT_CONFIG.supportHS256) return false
  if (!header) return false
  return header.alg === 'HS256'
}

/**
 * Generate access token (short-lived)
 * ✅ РАСШИРЕНО: Multi-tenant support с ролями и списком салонов
 * ✅ Using HMAC-based signing (HS256) only
 */
export async function generateAccessToken(payload: {
  userId?: string  // Optional для OAuth клиентов
  tenantId?: string
  role: UserRole
  email: string
  // Multi-Tenant Support (NEW)
  tenantRole?: TenantRole  // Роль в текущем tenant
  tenants?: Array<{
    tenantId: string
    role: TenantRole
    tenantName: string
    slug: string
  }>  // Список всех tenant где user имеет роли
  // Client Profile (NEW)
  isClient?: boolean      // User имеет ClientProfile
  phoneVerified?: boolean
  // Дополнительные поля для клиентов (Client Portal)
  firstName?: string
  lastName?: string
  // Permissions & device context
  permissions?: string[]
  deviceId?: string
}): Promise<string> {
  const tokenPayload = {
    userId: payload.userId,
    tenantId: payload.tenantId,
    role: payload.role,
    email: payload.email,
    tenantRole: payload.tenantRole,
    tenants: payload.tenants,
    isClient: payload.isClient,
    firstName: payload.firstName,
    lastName: payload.lastName,
    phoneVerified: payload.phoneVerified,
    permissions: payload.permissions,
    deviceId: payload.deviceId,
    type: 'access' as const
  }

  const accessExpiresIn = JWT_CONFIG.accessExpiresIn as unknown as SignOptions['expiresIn'] | undefined
  const options: SignOptions = {
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience,
    ...(accessExpiresIn ? { expiresIn: accessExpiresIn } : {})
  }

  return jwt.sign(tokenPayload, JWT_CONFIG.accessSecret as Secret, options)
}

/**
 * Generate refresh token (long-lived)
 * ✅ РАСШИРЕНО: Multi-tenant support с ролями и списком салонов
 * ✅ Using HMAC-based signing (HS256) only
 */
export async function generateRefreshToken(payload: {
  userId?: string  // Optional для OAuth клиентов
  tenantId?: string
  role: UserRole
  email: string
  // Multi-Tenant Support (NEW)
  tenantRole?: TenantRole  // Роль в текущем tenant
  tenants?: Array<{
    tenantId: string
    role: TenantRole
    tenantName: string
    slug: string
  }>  // Список всех tenant где user имеет роли
  // Client Profile (NEW)
  isClient?: boolean      // User имеет ClientProfile
  phoneVerified?: boolean
  // Дополнительные поля для клиентов
  firstName?: string
  lastName?: string
  // Permissions & device context
  permissions?: string[]
  deviceId?: string
}): Promise<string> {
  const tokenPayload = {
    userId: payload.userId,
    tenantId: payload.tenantId,
    role: payload.role,
    email: payload.email,
    tenantRole: payload.tenantRole,
    tenants: payload.tenants,
    isClient: payload.isClient,
    firstName: payload.firstName,
    lastName: payload.lastName,
    phoneVerified: payload.phoneVerified,
    permissions: payload.permissions,
    deviceId: payload.deviceId,
    type: 'refresh' as const
  }

  const refreshExpiresIn = JWT_CONFIG.refreshExpiresIn as unknown as SignOptions['expiresIn'] | undefined
  const options: SignOptions = {
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience,
    ...(refreshExpiresIn ? { expiresIn: refreshExpiresIn } : {})
  }

  return jwt.sign(tokenPayload, JWT_CONFIG.refreshSecret as Secret, options)
}

// RSA Token verification disabled - using HMAC-only approach
async function verifyRSAToken(
  token: string,
  expectedType: JWTPayload['type']
): Promise<JWTPayload> {
  // RSA key management is disabled (model not in database)
  // All tokens must use HS256 only
  throw new Error('RSA token verification not available - use HS256 tokens only')
}

function verifyHSToken(
  token: string,
  expectedType: JWTPayload['type'],
  secret: string
): JWTPayload {
  const payload = jwt.verify(token, secret, {
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience
  }) as JWTPayload

  ensureTokenType(payload, expectedType)
  return payload
}

/**
 * Verify access token
 * ✅ Using HMAC-based verification (HS256) only
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  try {
    // All tokens use HS256 (RSA disabled)
    return verifyHSToken(token, 'access', JWT_CONFIG.accessSecret)
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token expired')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token')
    }
    throw error
  }
}

/**
 * Verify refresh token
 * ✅ Using HMAC-based verification (HS256) only
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  try {
    // All tokens use HS256 (RSA disabled)
    return verifyHSToken(token, 'refresh', JWT_CONFIG.refreshSecret)
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token')
    }
    throw error
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload
  } catch {
    return null
  }
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  const decoded = decodeToken(token)
  if (!decoded?.exp) return null
  
  return new Date(decoded.exp * 1000)
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token)
  if (!expiration) return true
  
  return expiration < new Date()
}

/**
 * Extract token from request (cookies or Authorization header)
 */
export function extractTokenFromRequest(req: any): string | null {
  // Из httpOnly cookie (приоритет)
  if (req.cookies?.beauty_access_token) {
    return req.cookies.beauty_access_token
  }
  
  // Из Authorization header (fallback)
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  return null
}

/**
 * Extract refresh token from request cookies
 */
export function extractRefreshTokenFromRequest(req: any): string | null {
  return (
    req.cookies?.beauty_refresh_token ||
    req.cookies?.beauty_client_refresh_token ||
    null
  )
}

/**
 * Generate token pair (access + refresh)
 * ✅ РАСШИРЕНО: Multi-tenant support с ролями и списком салонов
 */
export async function generateTokenPair(payload: {
  userId?: string  // Optional для OAuth клиентов
  tenantId?: string
  role: UserRole
  email: string
  // Multi-Tenant Support (NEW)
  tenantRole?: TenantRole  // Роль в текущем tenant
  tenants?: Array<{
    tenantId: string
    role: TenantRole
    tenantName: string
    slug: string
  }>  // Список всех tenant где user имеет роли
  // Client Profile (NEW)
  isClient?: boolean      // User имеет ClientProfile
  phoneVerified?: boolean
  // Дополнительные поля
  firstName?: string
  lastName?: string
  permissions?: string[]
  deviceId?: string
}) {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken(payload)
  ])

  return {
    accessToken,
    refreshToken,
    expiresIn: getExpiresInSeconds(JWT_CONFIG.accessExpiresIn || '15m')
  }
}

/**
 * Convert time string to seconds
 */
function getExpiresInSeconds(timeString: string): number {
  const match = timeString.match(/^(\d+)([smhd])$/)
  if (!match || !match[1] || !match[2]) return 900 // Default 15 minutes
  
  const amountStr = match[1]
  const unit = match[2]
  const amount = parseInt(amountStr, 10)
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 }
  
  return amount * (multipliers[unit as keyof typeof multipliers] || 60)
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
