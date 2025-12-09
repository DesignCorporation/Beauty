// Beauty Platform Backup Service - JWT Utilities
// Утилиты для работы с JWT токенами (для тестирования и интеграции)

import jwt from 'jsonwebtoken'
import { JWTPayload } from '../types/backup'

/**
 * Создание JWT токена для тестирования
 */
export function createTestToken(payload: Partial<JWTPayload>): string {
  const jwtSecret = process.env.JWT_SECRET || 'test_secret'
  
  const defaultPayload: JWTPayload = {
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
    role: 'SUPER_ADMIN',
    permissions: ['backup.read', 'backup.write', 'backup.delete'],
    email: 'backup-service@test.local',
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 // 1 час
  }

  const finalPayload = { ...defaultPayload, ...payload }
  
  return jwt.sign(finalPayload, jwtSecret)
}

/**
 * Валидация JWT токена
 */
export function validateToken(token: string): JWTPayload | null {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'test_secret'
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload
    
    // Проверяем что токен не истек
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    
    return decoded
  } catch {
    return null
  }
}

/**
 * Создание токена Super Admin для тестирования
 */
export function createSuperAdminToken(userId: string = 'super-admin'): string {
  return createTestToken({
    userId,
    role: 'SUPER_ADMIN',
    permissions: [
      'backup.read',
      'backup.write', 
      'backup.delete',
      'backup.config',
      'system.admin'
    ]
  })
}

/**
 * Создание токена обычного пользователя (для тестирования отказа доступа)
 */
export function createUserToken(userId: string = 'regular-user'): string {
  return createTestToken({
    userId,
    role: 'SALON_OWNER',
    permissions: ['appointments.read', 'clients.read']
  })
}

/**
 * Извлечение информации из токена без валидации
 */
export function decodeTokenUnsafe(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload
    return decoded
  } catch {
    return null
  }
}

/**
 * Проверка истекания токена
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeTokenUnsafe(token)
  if (!decoded || !decoded.exp) return true
  
  return decoded.exp < Math.floor(Date.now() / 1000)
}

/**
 * Получение времени жизни токена в секундах
 */
export function getTokenTTL(token: string): number | null {
  const decoded = decodeTokenUnsafe(token)
  if (!decoded || !decoded.exp) return null
  
  const ttl = decoded.exp - Math.floor(Date.now() / 1000)
  return ttl > 0 ? ttl : 0
}
