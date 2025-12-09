/**
 * @fileoverview Global Express type augmentation
 * @description Переопределение типов Express.Request для JWT аутентификации
 *
 * Этот файл решает конфликт между @types/passport и нашей JWT типизацией.
 * Переопределяет Express.Request чтобы использовать JWTPayload вместо User.
 */

import 'express';

// JWT Payload типы
export interface JWTPayload {
  sub: string;           // User ID
  email?: string;        // Email (для Client Portal)
  userId?: string;       // Опционально (для OAuth клиентов)
  tenantId?: string;     // Tenant ID для мультитенантности
  firstName?: string;    // First name (Client Portal)
  lastName?: string;     // Last name (Client Portal)
  phoneVerified?: boolean; // Phone verification status
  roles?: string[];      // User roles
  permissions?: string[]; // User permissions
  role?: 'ADMIN' | 'SALON_OWNER' | 'STAFF' | 'CLIENT';
  iat?: number;          // Issued at
  exp?: number;          // Expiration time
}

// Переопределяем Express типы глобально
// Делаем User type алиасом JWTPayload для совместимости с @types/passport
declare global {
  namespace Express {
    interface User extends JWTPayload {}
    // Request.user объявлен в @types/passport как User | undefined,
    // благодаря расширению выше, теперь он соответствует JWTPayload.
  }
}
