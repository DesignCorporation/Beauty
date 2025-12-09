// Beauty Platform Backup Service - Authentication & Authorization Middleware
// Интеграция с Auth Service для JWT валидации

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import pino from 'pino'
import { assertAuth } from '@beauty/shared'
import type { BackupAuthenticatedRequest, JWTPayload } from '../types/backup'
import { UnauthorizedError } from '../types/backup'

const logger = pino({ name: 'backup-auth' })
const AUTH_REQUIRED_MESSAGE = 'Authentication required'

export type AuthenticatedRequest = BackupAuthenticatedRequest

/**
 * Middleware для проверки JWT токена
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log(`🔍 AUTH CHECK: ${req.method} ${req.path}`)
  console.log(`🍪 COOKIES:`, Object.keys(req.cookies || {}))
  console.log(`📋 HEADERS:`, req.headers.authorization ? 'Auth header present' : 'No auth header')
  
  try {
    let token: string | undefined
    
    // Пытаемся получить токен из Authorization header (Bearer)
    const rawAuthHeader = req.headers?.authorization
    const authHeader = Array.isArray(rawAuthHeader) ? rawAuthHeader[0] : rawAuthHeader

    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7) // Убираем "Bearer "
    }
    
    // Если нет Bearer токена, пытаемся получить из cookie
    if (!token && req.cookies && req.cookies.beauty_access_token) {
      token = req.cookies.beauty_access_token
      logger.debug({ path: req.path }, 'Using JWT token from cookie')
    }
    
    if (!token) {
      logger.warn({ 
        path: req.path, 
        cookies: Object.keys(req.cookies || {}),
        authHeader: authHeader ? 'present' : 'missing'
      }, 'Missing JWT token in header or cookie')
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'MISSING_TOKEN',
        debug: {
          cookies: Object.keys(req.cookies || {}),
          authHeader: authHeader ? 'present' : 'missing'
        }
      })
      return
    }

    // Валидируем JWT токен
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured')
      res.status(500).json({
        success: false,
        error: 'Server configuration error',
        code: 'CONFIG_ERROR'
      })
      return
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload
      
      // Проверяем что токен не истек
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        logger.warn({ userId: decoded.userId }, 'Token expired')
        res.status(401).json({
          success: false,
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        })
        return
      }

      // Добавляем пользователя в request
      req.user = decoded
      
      logger.debug({ 
        userId: decoded.userId, 
        role: decoded.role, 
        path: req.path 
      }, 'Authentication successful')
      
      next()
      
    } catch (jwtError) {
      logger.warn({ error: jwtError, path: req.path }, 'Invalid JWT token')
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      })
      return
    }

  } catch (error) {
    logger.error({ error, path: req.path }, 'Authentication error')
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    })
  }
}

/**
 * Middleware для проверки роли Super Admin
 * Только Super Admin имеет доступ к системе backup
 */
export const requireSuperAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { role, userId } = assertAuth(req, AUTH_REQUIRED_MESSAGE)

    if (role !== 'SUPER_ADMIN') {
      logger.warn({ 
        userId, 
        role, 
        path: req.path 
      }, 'Insufficient permissions for backup access')
      
      res.status(403).json({
        success: false,
        error: 'Access denied. Super Admin privileges required.',
        code: 'INSUFFICIENT_PERMISSIONS'
      })
      return
    }

    logger.debug({ userId, path: req.path }, 'Super Admin access granted')
    next()

  } catch (error) {
    if (error instanceof Error && error.message === AUTH_REQUIRED_MESSAGE) {
      logger.error('User not authenticated in requireSuperAdmin')
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      })
      return
    }

    logger.error({ error, path: req.path }, 'Authorization error')
    res.status(500).json({
      success: false,
      error: 'Authorization error',
      code: 'AUTHZ_ERROR'
    })
  }
}

/**
 * Middleware для проверки конкретных разрешений (если потребуется в будущем)
 */
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const { permissions, userId } = assertAuth(req, AUTH_REQUIRED_MESSAGE)

      if (!permissions || !permissions.includes(permission)) {
        logger.warn({ 
          userId, 
          requiredPermission: permission,
          userPermissions: permissions,
          path: req.path 
        }, 'Insufficient permissions')
        
        res.status(403).json({
          success: false,
          error: `Permission required: ${permission}`,
          code: 'INSUFFICIENT_PERMISSIONS'
        })
        return
      }

      logger.debug({ 
        userId, 
        permission, 
        path: req.path 
      }, 'Permission check passed')
      
      next()

    } catch (error) {
      if (error instanceof Error && error.message === AUTH_REQUIRED_MESSAGE) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        })
        return
      }

      logger.error({ error, path: req.path }, 'Permission check error')
      res.status(500).json({
        success: false,
        error: 'Permission check error',
        code: 'PERMISSION_ERROR'
      })
    }
  }
}

/**
 * Middleware для логирования всех backup операций
 */
export const auditLog = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now()
  
  // Логируем запрос
  logger.info({
    method: req.method,
    path: req.path,
    userId: req.user?.userId,
    userRole: req.user?.role,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  }, 'Backup API request')

  // Перехватываем ответ для логирования
  const originalSend = res.send
  res.send = function(body) {
    const duration = Date.now() - startTime
    
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.userId,
      timestamp: new Date().toISOString()
    }, 'Backup API response')

    return originalSend.call(this, body)
  }

  next()
}

/**
 * Обработчик ошибок аутентификации
 */
export const handleAuthError = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error instanceof UnauthorizedError) {
    logger.warn({ error: error.message, path: req.path }, 'Unauthorized access attempt')
    res.status(401).json({
      success: false,
      error: error.message,
      code: 'UNAUTHORIZED'
    })
    return
  }

  // Передаем другие ошибки дальше
  next(error)
}
