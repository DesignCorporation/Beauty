// Типизированные Express handler helpers
// Beauty Platform - Shared Types

import type { Request, Response, NextFunction } from 'express'

/**
 * Типизированный async route handler для Express
 * Гарантирует правильный return type для TypeScript strict mode
 */
export type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>

/**
 * Синхронный route handler
 */
export type SyncRouteHandler = (
  req: Request,
  res: Response,
  next?: NextFunction
) => void

/**
 * Middleware handler (может быть sync или async)
 */
export type MiddlewareHandler = AsyncRouteHandler | SyncRouteHandler

/**
 * Helper для создания type-safe async handlers
 * Автоматически добавляет return в catch блоки
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): AsyncRouteHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next)
    } catch (error) {
      // Передаем ошибку в Express error handler
      next(error)
    }
  }
}

/**
 * Helper для создания type-safe route handlers без next
 */
export const routeHandler = (
  fn: (req: Request, res: Response) => Promise<void>
): AsyncRouteHandler => {
  return async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      await fn(req, res)
    } catch (error) {
      // Логируем и возвращаем 500
      console.error('Route handler error:', error)
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        })
      }
    }
  }
}
