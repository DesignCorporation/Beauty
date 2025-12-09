import express, { type Router, type Request, type Response } from 'express'
import { prisma } from '@beauty-platform/database'
import { publicKeyToJWK } from '../utils/rsa-keys'
import type { JWKSKey } from '../utils/rsa-keys'
import { authenticate } from '../middleware/auth'
import { getAuthContext } from '../utils/get-auth-context'

const router: Router = express.Router()

const JWKS_CACHE_TTL = parseInt(process.env.JWKS_CACHE_TTL || '300000', 10) // 5 минут
const issuerFromEnv = (process.env.OIDC_ISSUER || 'https://auth.beauty.designcorp.eu').replace(/\/$/, '')
const jwksUrlFromEnv = (process.env.JWKS_URL || `${issuerFromEnv}/.well-known/jwks.json`).replace(/\/$/, '')

type JWKSResponse = { keys: JWKSKey[] }

type JWKSCacheEntry = {
  value: JWKSResponse
  expiresAt: number
}

let jwksCache: JWKSCacheEntry | null = null

const ALLOWED_KEY_STATUSES = [
  'ACTIVE',
  'ROTATING',
  'INACTIVE'
]

async function fetchJwks(): Promise<JWKSResponse> {
  // RSA Key management disabled (model not in database)
  // OIDC/JWKS functionality requires RSA keys for signing
  // Return empty array - endpoints are disabled
  console.warn('[OIDC] JWKS endpoint disabled - RSA key management not available')
  return { keys: [] }
}

async function getJwks(forceRefresh = false): Promise<JWKSResponse> {
  if (!forceRefresh && jwksCache && jwksCache.expiresAt > Date.now()) {
    return jwksCache.value
  }

  const jwks = await fetchJwks()
  jwksCache = {
    value: jwks,
    expiresAt: Date.now() + JWKS_CACHE_TTL
  }
  return jwks
}

router.get('/.well-known/jwks.json', async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query?.refresh === '1'
    const jwks = await getJwks(forceRefresh)

    res.setHeader('Cache-Control', `public, max-age=${Math.floor(JWKS_CACHE_TTL / 1000)}`)
    res.json(jwks)
  } catch (error) {
    console.error('[OIDC] Failed to build JWKS response:', error)
    res.status(500).json({
      success: false,
      error: 'JWKS_GENERATION_FAILED',
      message: 'Unable to generate JWKS keys'
    })
  }
})

router.get('/.well-known/openid-configuration', (_req: Request, res: Response) => {
  const issuer = issuerFromEnv
  const authorizationEndpoint = `${issuer}/auth/login`
  const tokenEndpoint = `${issuer}/auth/refresh`
  const userInfoEndpoint = `${issuer}/auth/userinfo`

  res.setHeader('Cache-Control', `public, max-age=${Math.floor(JWKS_CACHE_TTL / 1000)}`)
  res.json({
    issuer,
    authorization_endpoint: authorizationEndpoint,
    token_endpoint: tokenEndpoint,
    userinfo_endpoint: userInfoEndpoint,
    jwks_uri: jwksUrlFromEnv,
    response_types_supported: ['code', 'token', 'id_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
    grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    claims_supported: [
      'sub',
      'email',
      'email_verified',
      'name',
      'given_name',
      'family_name',
      'role',
      'tenantId',
      'tenants',
      'permissions',
      'deviceId'
    ],
    end_session_endpoint: `${issuer}/auth/logout`
  })
})

router.get('/auth/userinfo', authenticate, (req: Request, res: Response) => {
  let auth
  try {
    auth = getAuthContext(req)
  } catch {
    res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Authentication required'
    })
    return
  }

  const {
    userId,
    email,
    firstName,
    lastName,
    role,
    tenantId,
    tenantRole,
    tenants,
    permissions,
    deviceId,
    phoneVerified
  } = auth

  res.json({
    sub: userId ?? email,
    email,
    email_verified: Boolean(phoneVerified ?? true),
    name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
    given_name: firstName,
    family_name: lastName,
    role,
    tenantId: tenantId ?? null,
    tenantRole: tenantRole ?? null,
    tenants: tenants ?? [],
    permissions: permissions ?? [],
    deviceId: deviceId ?? null
  })
})

export default router
