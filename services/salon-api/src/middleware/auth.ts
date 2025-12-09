import { Response, NextFunction, type RequestHandler } from 'express'
import jwt, { JwtHeader, JwtPayload } from 'jsonwebtoken'
import fs from 'fs'
import { prisma } from '@beauty-platform/database'
import type { AuthenticatedRequest } from '@beauty/shared'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-beauty-platform-2025';
const JWT_ISSUER = process.env.JWT_ISSUER || 'beauty-platform-auth';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'beauty-platform';
const SUPPORT_HS256 = process.env.SUPPORT_HS256 ? process.env.SUPPORT_HS256 === 'true' : true;
const CACHE_TTL = parseInt(process.env.RSA_KEY_CACHE_TTL || '300000', 10);

type CachedKey = {
  publicKey: string;
  fetchedAt: number;
};

const PUBLIC_KEY_CACHE = new Map<string, CachedKey>();
let ACTIVE_KEY_CACHE: CachedKey | null = null;
const AUTH_LOG_PATH = process.env.CRM_AUTH_LOG_PATH || '/root/beauty-platform/logs/crm-api-auth.log';

interface CRMAuthContext extends JwtPayload {
  userId?: string
  tenantId?: string | null
  role: string
  email: string
  permissions?: string[]
  tenants?: Array<{
    tenantId: string
    role: string
    tenantName: string
    slug: string
  }>
  tenantRole?: string
  isClient?: boolean
  phoneVerified?: boolean
  firstName?: string
  lastName?: string
  deviceId?: string
  type: 'access' | 'refresh'
}

export type CRMAuthenticatedRequest = AuthenticatedRequest<CRMAuthContext>

type ExpressRequestUser = NonNullable<Express.Request['user']>

const writeAuthLog = (data: Record<string, unknown>) => {
  try {
    const logLine = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...data
    });

    fs.appendFileSync(AUTH_LOG_PATH, `${logLine}\n`);
  } catch (logError) {
    console.error('Failed to write auth log:', logError instanceof Error ? logError.message : logError);
  }
};

const isCacheValid = (entry: CachedKey | null | undefined): entry is CachedKey =>
  !!entry && Date.now() - entry.fetchedAt < CACHE_TTL;

const loadActiveKey = async (): Promise<CachedKey> => {
  // TODO: Fix rSAKey model missing from Prisma (pre-existing bug)
  // const active = await prisma.rSAKey.findFirst({
  //   where: { status: 'ACTIVE' },
  //   orderBy: { createdAt: 'desc' }
  // });

  // if (!active?.publicKey) {
  //   throw new Error('[CRM Auth] Active RSA public key not found');
  // }

  // For now, return cached value or throw
  if (ACTIVE_KEY_CACHE) {
    return ACTIVE_KEY_CACHE;
  }

  throw new Error('[CRM Auth] RSA key cache is empty - TODO: implement proper key loading');
};

const getPublicKey = async (kid?: string | null): Promise<string> => {
  if (kid) {
    const cached = PUBLIC_KEY_CACHE.get(kid);
    if (isCacheValid(cached)) {
      return cached.publicKey;
    }

    // TODO: Fix rSAKey model missing from Prisma (pre-existing bug)
    // const record = await prisma.rSAKey.findUnique({
    //   where: { kid }
    // });

    // if (!record?.publicKey) {
    //   throw new Error(`[CRM Auth] RSA key not found for kid=${kid}`);
    // }

    throw new Error(`[CRM Auth] RSA key not found for kid=${kid} - TODO: implement proper key loading`);

    // const cacheEntry: CachedKey = {
    //   publicKey: record.publicKey,
    //   fetchedAt: Date.now()
    // };
    // PUBLIC_KEY_CACHE.set(kid, cacheEntry);
    // return cacheEntry.publicKey;
  }

  if (isCacheValid(ACTIVE_KEY_CACHE)) {
    return ACTIVE_KEY_CACHE.publicKey;
  }

  const active = await loadActiveKey();
  return active.publicKey;
};

const verifyToken = async (token: string): Promise<JwtPayload> => {
  const decoded = jwt.decode(token, { complete: true }) as { header?: JwtHeader } | null;
  const header = decoded?.header;

  if (header?.alg === 'HS256' && SUPPORT_HS256) {
    return jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    }) as JwtPayload;
  }

  const publicKey = await getPublicKey(header?.kid);
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  }) as JwtPayload;
};

const handleAuth = async (req: CRMAuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Проверяем httpOnly cookies (приоритет)
    // ✅ ИСПРАВЛЕНО: Поддержка обоих типов аутентификации:
    //    - Salon/Admin: beauty_token, beauty_access_token
    //    - Client Portal: beauty_client_access_token
    const cookieToken = req.cookies?.beauty_token
      || req.cookies?.beauty_access_token
      || req.cookies?.beauty_client_access_token;

    // Fallback на Authorization header
    const authHeader = req.headers.authorization;
    const headerToken = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No access token provided'
      });
    }

    const decoded = await verifyToken(token) as JwtPayload | string;
    if (typeof decoded === 'string') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload'
      });
    }

    const decodedPayload = decoded as JwtPayload & Partial<CRMAuthContext>
    const {
      userId,
      tenantId: tokenTenantId,
      role,
      email,
      permissions,
      tenants,
      tenantRole,
      isClient,
      phoneVerified,
      firstName,
      lastName,
      deviceId,
      type,
      iat,
      exp
    } = decodedPayload

    const headerTenantId = (req.headers['x-tenant-id'] as string | undefined)?.trim();
    const resolvedTenantId = tokenTenantId || headerTenantId;

    // ✅ ИСПРАВЛЕНО: Для client portal userId может быть не определен (OAuth)
    // Требуем: role, email (tenantId и userId опциональные для CLIENT)
    if (!role || !email) {
      return res.status(403).json({
        success: false,
        error: 'Authentication failed',
        message: 'Token missing required fields (role or email)'
      });
    }

    // Для ролей кроме CLIENT требуем tenantId
    if (role !== 'CLIENT' && !resolvedTenantId) {
      return res.status(403).json({
        success: false,
        error: 'Tenant access denied',
        message: 'Token missing tenantId (required for staff/admin)'
      });
    }

    const authLogPayload = {
      userId,
      tenantId: resolvedTenantId,
      role,
      email,
      path: req.path,
      method: req.method,
      source: cookieToken ? 'cookie' : 'header'
    };

    console.log('🔐 [AUTH] Verified JWT:', authLogPayload);
    writeAuthLog(authLogPayload);

    // Build user context: only include userId if present
    const userContext: CRMAuthContext = {
      role,
      email,
      type: type ?? 'access',
      iat: iat ?? Math.floor(Date.now() / 1000),
      exp: exp ?? Math.floor(Date.now() / 1000) + 60 * 60
    }

    if (resolvedTenantId) {
      userContext.tenantId = resolvedTenantId
    }

    if (userId) {
      userContext.userId = userId
    }
    if (permissions) {
      userContext.permissions = permissions
    }
    if (tenants) {
      userContext.tenants = tenants
    }
    if (tenantRole) {
      userContext.tenantRole = tenantRole
    }
    if (isClient !== undefined) {
      userContext.isClient = isClient
    }
    if (phoneVerified !== undefined) {
      userContext.phoneVerified = phoneVerified
    }
    if (firstName) {
      userContext.firstName = firstName
    }
    if (lastName) {
      userContext.lastName = lastName
    }
    if (deviceId) {
      userContext.deviceId = deviceId
    }

    req.user = userContext as CRMAuthContext & ExpressRequestUser

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    writeAuthLog({
      error: error instanceof Error ? error.message : 'Unknown auth middleware error',
      path: req.path,
      method: req.method
    });
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Please refresh your session'
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Token verification failed'
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
  return undefined;
};

export const authMiddleware: RequestHandler = (req, res, next) => {
  void handleAuth(req as CRMAuthenticatedRequest, res, next)
}
