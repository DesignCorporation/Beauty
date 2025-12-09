import type { Request } from 'express'

/**
 * Общий контекст аутентифицированного пользователя.
 * Сервисы могут расширять его дополнительными полями по необходимости.
 */
export interface AuthContext {
  userId?: string
  tenantId?: string | null
  role?: string
  email?: string
  permissions?: string[]
  tenantRole?: string
  tenants?: Array<{
    tenantId: string
    role?: string
    tenantName?: string
    slug?: string
  }>
  deviceId?: string
  phoneVerified?: boolean
  mfaVerified?: boolean
  firstName?: string
  lastName?: string
  type?: 'access' | 'refresh'
}

/**
 * Расширенный Request со свойством user.
 * Используем структурную типизацию, поэтому Express.Request совместим.
 */
export type AuthenticatedRequest<TContext extends AuthContext = AuthContext> = Request & {
  user?: TContext
}

/**
 * Проверяет наличие авторизованного пользователя в запросе.
 */
export function hasAuth<T extends AuthContext>(
  req: Request
): req is AuthenticatedRequest<T> & { user: T } {
  return (req as AuthenticatedRequest<T>).user !== undefined
}

/**
 * Безопасно возвращает контекст пользователя (undefined, если не авторизован).
 */
export function getAuth<T extends AuthContext>(req: Request): T | undefined {
  return (req as AuthenticatedRequest<T>).user
}

/**
 * Гарантирует наличие авторизованного пользователя.
 * Бросает ошибку, чтобы вызывающий код решил, как вернуть 401/403.
 */
export function assertAuth<T extends AuthContext>(
  req: Request,
  message: string = 'Authentication required'
): T {
  const user = (req as AuthenticatedRequest<T>).user
  if (!user) {
    throw new Error(message)
  }

  return user
}

declare global {
  namespace Express {
    interface Request {
      user?: User | undefined
      tenantId?: string | null
    }

    interface User extends AuthContext {}
  }
}
