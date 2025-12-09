/// <reference types="vitest" />

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { setupAuth, AuthMiddleware } from '../src'

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn()
}))

type MutableRequest = Partial<Request> & {
  cookies?: Record<string, string>
  headers: Record<string, string>
  path: string
  method: string
  params: Record<string, string>
  query: Record<string, string>
  body: Record<string, unknown>
}

const createRequest = (): MutableRequest => ({
  cookies: {},
  headers: {},
  path: '/test',
  method: 'GET',
  params: {},
  query: {},
  body: {}
})

const createResponse = () => {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.setHeader = vi.fn()
  return res as Response
}

const payload = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  role: 'MANAGER',
  email: 'owner@beauty.test',
  type: 'access' as const
}

describe('AuthMiddleware', () => {
  let middleware: AuthMiddleware
  let authenticate: AuthMiddleware['authenticate']
  let optionalAuth: AuthMiddleware['optionalAuth']
  let requireTenant: AuthMiddleware['requireTenant']
  let validateTenantAccess: AuthMiddleware['validateTenantAccess']
  let strictTenantAuth: [
    AuthMiddleware['authenticate'],
    AuthMiddleware['requireTenant'],
    AuthMiddleware['validateTenantAccess']
  ]

  beforeEach(() => {
    middleware = new AuthMiddleware({
      jwtSecret: 'test-secret',
      enableLogging: false,
      serviceName: 'unit-tests'
    })
    authenticate = middleware.authenticate
    optionalAuth = middleware.optionalAuth
    requireTenant = middleware.requireTenant
    validateTenantAccess = middleware.validateTenantAccess
    strictTenantAuth = [
      middleware.authenticate,
      middleware.requireTenant,
      middleware.validateTenantAccess
    ]
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mockVerifySuccess = (overrides: Partial<typeof payload> = {}) => {
    vi.spyOn(jwt, 'verify').mockReturnValue({
      ...payload,
      ...overrides
    } as any)
  }

  const mockVerifyError = (error: Error) => {
    vi.spyOn(jwt, 'verify').mockImplementation(() => {
      throw error
    })
  }

  describe('authenticate', () => {
    it('rejects requests without token', () => {
      const req = createRequest()
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      ;(authenticate as unknown as Function)(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'MISSING_TOKEN' })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('accepts valid JWT from cookie and sets tenant info', () => {
      const req = createRequest()
      req.cookies!.beauty_access_token = 'valid-cookie-token'
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      mockVerifySuccess()

      ;(authenticate as unknown as Function)(req, res, next)

      expect(jwt.verify).toHaveBeenCalledWith('valid-cookie-token', 'test-secret')
      expect(next).toHaveBeenCalledOnce()
      expect(req.user).toMatchObject(payload)
      expect(req.tenant).toEqual({ id: payload.tenantId!, slug: '' })
      expect(res.status).not.toHaveBeenCalled()
    })

    it('prefers cookie token over authorization header', () => {
      const req = createRequest()
      req.cookies!.beauty_access_token = 'cookie-token'
      req.headers.authorization = 'Bearer header-token'
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      mockVerifySuccess()

      ;(authenticate as unknown as Function)(req, res, next)

      expect(jwt.verify).toHaveBeenCalledWith('cookie-token', 'test-secret')
      expect(jwt.verify).not.toHaveBeenCalledWith('header-token', 'test-secret')
      expect(next).toHaveBeenCalledOnce()
    })

    it('accepts token from Authorization header when cookie missing', () => {
      const req = createRequest()
      req.headers.authorization = 'Bearer header-token'
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      mockVerifySuccess()

      ;(authenticate as unknown as Function)(req, res, next)

      expect(jwt.verify).toHaveBeenCalledWith('header-token', 'test-secret')
      expect(next).toHaveBeenCalledOnce()
    })

    it('rejects expired token with specific error code', () => {
      const req = createRequest()
      req.cookies!.beauty_access_token = 'expired-token'
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      mockVerifyError(new jwt.TokenExpiredError('jwt expired', new Date()))

      ;(authenticate as unknown as Function)(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'TOKEN_EXPIRED' })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('rejects invalid token signature', () => {
      const req = createRequest()
      req.cookies!.beauty_access_token = 'invalid-token'
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      mockVerifyError(new jwt.JsonWebTokenError('invalid signature'))

      ;(authenticate as unknown as Function)(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'INVALID_TOKEN' })
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('handles unexpected verification errors gracefully', () => {
      const req = createRequest()
      req.cookies!.beauty_access_token = 'broken-token'
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      mockVerifyError(new Error('Something went wrong'))

      ;(authenticate as unknown as Function)(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'AUTH_FAILED' })
      )
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('optionalAuth', () => {
    it('continues when no token provided', () => {
      const req = createRequest()
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      optionalAuth(req as Request, res, next)

      expect(next).toHaveBeenCalledOnce()
      expect(req.user).toBeUndefined()
    })

    it('enriches request context when token valid', () => {
      const req = createRequest()
      req.headers.authorization = 'Bearer optional-token'
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      mockVerifySuccess()

      optionalAuth(req as Request, res, next)

      expect(req.user).toMatchObject(payload)
      expect(req.tenant).toEqual({ id: payload.tenantId!, slug: '' })
      expect(next).toHaveBeenCalledOnce()
    })

    it('ignores errors during token verification', () => {
      const req = createRequest()
      req.cookies!.beauty_access_token = 'bad-optional-token'
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      mockVerifyError(new Error('Corrupted'))

      optionalAuth(req as Request, res, next)

      expect(next).toHaveBeenCalledOnce()
      expect(req.user).toBeUndefined()
      expect(res.status).not.toHaveBeenCalled()
    })
  })

  describe('requireTenant', () => {
    it('rejects unauthenticated requests', () => {
      const req = createRequest()
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      requireTenant(req as Request, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'AUTH_REQUIRED' })
      )
    })

    it('allows SUPER_ADMIN without tenantId', () => {
      const req = createRequest()
      req.user = {
        ...payload,
        role: 'SUPER_ADMIN',
        tenantId: undefined
      }
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      requireTenant(req as Request, res, next)

      expect(next).toHaveBeenCalledOnce()
    })

    it('rejects user without tenantId', () => {
      const req = createRequest()
      req.user = {
        ...payload,
        tenantId: undefined
      }
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      requireTenant(req as Request, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'TENANT_REQUIRED' })
      )
    })

    it('allows tenant-scoped user', () => {
      const req = createRequest()
      req.user = { ...payload }
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      requireTenant(req as Request, res, next)

      expect(next).toHaveBeenCalledOnce()
    })
  })

  describe('validateTenantAccess', () => {
    it('rejects unauthenticated requests', () => {
      const req = createRequest()
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      validateTenantAccess(req as Request, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'AUTH_REQUIRED' })
      )
    })

    it('allows SUPER_ADMIN for any tenant', () => {
      const req = createRequest()
      req.user = { ...payload, role: 'SUPER_ADMIN' }
      req.params.tenantId = 'other-tenant'
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      validateTenantAccess(req as Request, res, next)

      expect(next).toHaveBeenCalledOnce()
    })

    it('allows matching tenant in params', () => {
      const req = createRequest()
      req.user = { ...payload }
      req.params.tenantId = payload.tenantId!
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      validateTenantAccess(req as Request, res, next)

      expect(next).toHaveBeenCalledOnce()
    })

    it('allows requests without explicit tenant context', () => {
      const req = createRequest()
      req.user = { ...payload }
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      validateTenantAccess(req as Request, res, next)

      expect(next).toHaveBeenCalledOnce()
    })

    it('rejects mismatched tenant in query', () => {
      const req = createRequest()
      req.user = { ...payload }
      req.query.tenantId = 'other-tenant'
      const res = createResponse()
      const next = vi.fn<[], void>() as NextFunction

      validateTenantAccess(req as Request, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'TENANT_ACCESS_DENIED' })
      )
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('setupAuth helpers', () => {
    it('exposes strictTenantAuth pipeline with authenticate + tenant checks', () => {
      expect(strictTenantAuth).toHaveLength(3)
      expect(strictTenantAuth[0]).toBeInstanceOf(Function)
      expect(strictTenantAuth[1]).toBeInstanceOf(Function)
      expect(strictTenantAuth[2]).toBeInstanceOf(Function)
    })

    it('uses consistent middleware instances across helpers', () => {
      const helpers = setupAuth('unit-tests')
      expect(helpers.strictTenantAuth).toHaveLength(3)
      expect(helpers.strictTenantAuth[0]).toBeInstanceOf(Function)
      expect(helpers.strictTenantAuth[1]).toBeInstanceOf(Function)
      expect(helpers.strictTenantAuth[2]).toBeInstanceOf(Function)
    })

    it('shares middleware instance methods in strictTenantAuth array', () => {
      expect(strictTenantAuth[0]).toBe(middleware.authenticate)
      expect(strictTenantAuth[1]).toBe(middleware.requireTenant)
      expect(strictTenantAuth[2]).toBe(middleware.validateTenantAccess)
    })
  })
})
