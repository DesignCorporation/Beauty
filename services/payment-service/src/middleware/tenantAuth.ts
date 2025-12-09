import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JWTPayload } from '../../../auth-service/src/types/auth';

// 🔐 Расширяем Request interface для tenantId
declare global {
  namespace Express {
    interface Request {
      tenantId?: string | null;
    }
  }
}

// 🔐 КРИТИЧНО: Tenant Auth Middleware (следует архитектуре проекта)
export const tenantAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Получаем токен из httpOnly cookie (приоритет #1)
    // ✅ Поддержка CLIENT токенов (beauty_client_access_token)
    let token = req.cookies?.beauty_access_token || req.cookies?.beauty_client_access_token;

    // 2. Fallback: Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No valid token provided'
      });
    }

    // 3. Валидируем JWT токен
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('SECURITY ERROR: JWT_SECRET not configured');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Authentication system misconfigured'
      });
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // 4. Проверяем обязательные поля (role и email всегда нужны)
    if (!decoded.role || !decoded.email) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token missing required fields (role or email)'
      });
    }

    // ✅ Для CLIENT role tenantId опциональный (клиенты глобальные)
    const isSuperAdmin = decoded.role === 'SUPER_ADMIN'
    if (!isSuperAdmin && decoded.role !== 'CLIENT' && !decoded.tenantId) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token missing tenantId (required for staff/admin)'
      });
    }

    // 5. Проверяем тип токена (должен быть access)
    if (decoded.type !== 'access') {
      return res.status(401).json({
        error: 'Invalid token type',
        message: 'Access token required'
      });
    }

    // 6. Добавляем данные в request
    req.user = decoded;
    if (decoded.tenantId) {
      req.tenantId = decoded.tenantId;
    } else if ('tenantId' in req) {
      req.tenantId = null;
    }

    // 7. Логирование для отладки (как в других сервисах)
    console.log(`🔐 Payment Service Auth: ${decoded.email} (tenant: ${decoded.tenantId}, role: ${decoded.role})`);

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token verification failed'
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please refresh your session'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Internal authentication error'
    });
  }
  return undefined;
};

// 🔐 Middleware для проверки роли (опционально)
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    const { role } = req.user
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Role ${role ?? 'unknown'} not authorized for this action`
      });
    }

    next();
    return undefined;
  };
};
