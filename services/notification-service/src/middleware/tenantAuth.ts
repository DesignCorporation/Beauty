import { Request, Response, NextFunction } from 'express';
import jwt, { JwtHeader, JwtPayload } from 'jsonwebtoken';
import { JWTPayload, RequestContext } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_ISSUER = process.env.JWT_ISSUER || 'beauty-platform-auth';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'beauty-platform';
const SUPPORT_HS256 = process.env.SUPPORT_HS256 ? process.env.SUPPORT_HS256 === 'true' : true;
const RSA_KEY_CACHE_TTL = parseInt(process.env.RSA_KEY_CACHE_TTL || '300000', 10);

type CachedKey = {
  publicKey: string;
  fetchedAt: number;
};

const PUBLIC_KEY_CACHE = new Map<string, CachedKey>();

const isCacheValid = (entry: CachedKey | null | undefined): entry is CachedKey =>
  !!entry && Date.now() - entry.fetchedAt < RSA_KEY_CACHE_TTL;

const loadActiveKey = async (): Promise<CachedKey> => {
  // TODO: Fix rSAKey model missing from Prisma (pre-existing bug)
  // const active = await prisma.rSAKey.findFirst({
  //   where: { status: 'ACTIVE' },
  //   orderBy: { createdAt: 'desc' }
  // });

  throw new Error('[NotificationAuth] Active RSA public key not found - TODO: implement proper key loading');
};

const getPublicKey = async (kid?: string | null): Promise<string> => {
  if (kid) {
    const cached = PUBLIC_KEY_CACHE.get(kid);
    if (isCacheValid(cached)) {
      return cached.publicKey;
    }

    // TODO: Fix rSAKey model missing from Prisma
    // const keyRecord = await prisma.rSAKey.findUnique({
    //   where: { kid }
    // });

    // if (!keyRecord?.publicKey) {
    //   throw new Error(`[NotificationAuth] RSA key not found for kid=${kid}`);
    // }

    // const cacheEntry: CachedKey = {
    //   publicKey: keyRecord.publicKey,
    //   fetchedAt: Date.now()
    // };

    // PUBLIC_KEY_CACHE.set(kid, cacheEntry);
    // return cacheEntry.publicKey;

    throw new Error(`[NotificationAuth] RSA key not found for kid=${kid} - TODO: implement proper key loading`);
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

/**
 * Базовый middleware для JWT аутентификации и tenant isolation
 * TODO: В будущем заменить на shared-middleware пакет
 */
export const tenantAuth = (req: Request, res: Response, next: NextFunction): void => {
  const run = async () => {
    console.log('[DEBUG] Notification Auth - Headers:', req.headers.cookie ? 'cookies present' : 'no cookies');
    console.log('[DEBUG] JWT_SECRET loaded:', JWT_SECRET.substring(0, 10) + '...');

    // Попытка получить токен из различных источников
    let token: string | undefined;

    // 1. httpOnly cookies (приоритет)
    token = req.cookies?.beauty_access_token ||
            req.cookies?.beauty_client_access_token ||
            req.cookies?.beauty_token;

    // 2. Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No valid token provided'
      });
      return;
    }

    // Верификация токена
    const decoded = await verifyToken(token) as JwtPayload & Partial<JWTPayload>;
    const {
      userId: decodedUserId,
      tenantId: tokenTenantId,
      role,
      email,
      type,
      tenants,
      tenantRole,
      permissions,
      isClient,
      phoneVerified,
      firstName,
      lastName,
      deviceId,
      iat,
      exp
    } = decoded;

    const headerTenantId = (req.headers['x-tenant-id'] as string | undefined)?.trim();
    const resolvedTenantId = tokenTenantId || headerTenantId || null;

    // ✅ Поддержка оба типов JWT:
    // - Staff/Admin: обязательно наличие userId
    // - Client Portal: может быть email без userId (для ClientProfile auth)
    // const _hasValidUserId = !!decoded.userId;  // For documentation purposes
    // const _hasValidEmail = !!decoded.email && decoded.email.includes('@');  // For documentation purposes

    // ✅ Для CLIENT role tenantId опциональный (клиенты глобальные)
    if (!resolvedTenantId && role !== 'CLIENT') {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Token missing tenantId (required for staff/admin)'
      });
      return;
    }

    if (!role || !email) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Token missing role or email'
      });
      return;
    }

    // Если нет userId, используем email как идентификатор (Client Portal)
    const effectiveUserId = decodedUserId || email || null;

    if (!effectiveUserId) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Token missing userId or email'
      });
      return;
    }

    // Установка контекста запроса с полной изоляцией
    const payloadType: JWTPayload['type'] = type === 'refresh' ? 'refresh' : 'access';
    const contextPayload: JWTPayload = {
      userId: effectiveUserId,
      tenantId: resolvedTenantId ?? null,
      role,
      email,
      type: payloadType,
      iat: typeof iat === 'number' ? iat : Math.floor(Date.now() / 1000),
      exp: typeof exp === 'number' ? exp : Math.floor(Date.now() / 1000)
    };

    if (tenants) contextPayload.tenants = tenants;
    if (tenantRole) contextPayload.tenantRole = tenantRole;
    if (permissions) contextPayload.permissions = permissions;
    if (typeof isClient === 'boolean') contextPayload.isClient = isClient;
    if (typeof phoneVerified === 'boolean') contextPayload.phoneVerified = phoneVerified;
    if (firstName) contextPayload.firstName = firstName;
    if (lastName) contextPayload.lastName = lastName;
    if (deviceId) contextPayload.deviceId = deviceId;

    req.context = {
      user: contextPayload,
      tenantId: resolvedTenantId, // null для CLIENT without tenant
      userId: effectiveUserId  // Может быть как userId, так и email для Client Portal
    };

    next();
  };

  run().catch((error) => {
    console.error('[AUTH] Token verification failed:', error);
    res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid or expired token'
    });
  });
};

/**
 * Optional auth - устанавливает контекст если токен есть, но не требует его
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const run = async () => {
    let token: string | undefined;

    token = req.cookies?.beauty_access_token ||
            req.cookies?.beauty_client_access_token ||
            req.cookies?.beauty_token;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (token) {
      const decoded = await verifyToken(token) as JwtPayload & Partial<JWTPayload>;
      if (decoded.userId && decoded.tenantId && decoded.role && decoded.email) {
        const tokenType: JWTPayload['type'] = decoded.type === 'refresh' ? 'refresh' : 'access';
        const ctx: RequestContext = {
          user: {
            userId: decoded.userId,
            tenantId: decoded.tenantId ?? null,
            role: decoded.role,
            email: decoded.email,
            type: tokenType
          },
          tenantId: decoded.tenantId ?? null,
          userId: decoded.userId
        };
        req.context = ctx;
      }
    }

    next();
  };

  run().catch(() => {
    // Игнорируем ошибки в optional auth
    next();
  });
};
