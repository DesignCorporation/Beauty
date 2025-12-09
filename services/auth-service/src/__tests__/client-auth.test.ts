/// <reference types="vitest" />

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Request, Response } from 'express'
import router from '../routes/client-auth'

var tenantClient: any
var tenantPrismaMock: any
var generateTokenPairMock: any
var bcryptHashMock: any

vi.mock('@beauty-platform/database', () => {
  tenantClient = {
    clientProfile: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    refreshToken: {
      deleteMany: vi.fn()
    }
  }
  tenantPrismaMock = vi.fn(() => tenantClient)
  return {
    tenantPrisma: tenantPrismaMock,
    prisma: {}
  }
})

vi.mock('../utils/jwt', () => {
  generateTokenPairMock = vi.fn(async () => ({
    accessToken: 'client-access',
    refreshToken: 'client-refresh',
    expiresIn: 900
  }))
  return {
    generateTokenPair: generateTokenPairMock
  }
})

vi.mock('bcrypt', () => {
  bcryptHashMock = vi.fn(async () => 'hashed-password')
  return {
    default: {
      hash: bcryptHashMock
    },
    hash: bcryptHashMock
  }
})

vi.mock('pino', () => ({
  default: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  })
}))

vi.mock('../utils/client-relations', () => ({
  ensureClientSalonRelation: vi.fn()
}))

vi.mock('../middleware/rateLimiters', () => {
  const passthrough = (_req: Request, _res: Response, next: () => void) => next()
  return {
    clientLoginLimiter: passthrough,
    clientRegisterLimiter: passthrough,
    clientSmsRequestLimiter: passthrough,
    clientSmsVerifyLimiter: passthrough,
    clientJoinSalonLimiter: passthrough
  }
})

const findRouteHandler = (method: string, path: string) => {
  const layer = router.stack.find(
    (layer: any) =>
      layer.route &&
      layer.route.path === path &&
      layer.route.methods[method]
  )

  if (!layer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`)
  }

  // last handler in stack is actual controller
  return layer.route.stack[layer.route.stack.length - 1].handle
}

const registerClientHandler = findRouteHandler('post', '/register-client')

const createMockResponse = () => {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.cookie = vi.fn().mockReturnValue(res)
  res.clearCookie = vi.fn().mockReturnValue(res)
  return res as Response
}

const createRequest = (body: Record<string, unknown>) =>
  ({
    body,
    cookies: {},
    headers: {},
    query: {},
    params: {}
  } as unknown as Request)

describe('POST /auth/register-client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tenantClient.clientProfile.findUnique.mockResolvedValue(null)
    tenantClient.clientProfile.create.mockResolvedValue({
      email: 'client@example.com',
      firstName: 'Client',
      lastName: 'Example',
      phone: null,
      phoneVerified: false
    })
  })

  it('validates required fields', async () => {
    const req = createRequest({ email: 'client@example.com', password: 'secret' })
    const res = createMockResponse()

    await registerClientHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'VALIDATION_ERROR' })
    )
  })

  it('validates email format', async () => {
    const req = createRequest({
      firstName: 'Client',
      lastName: 'Example',
      email: 'invalid-email',
      password: 'secret'
    })
    const res = createMockResponse()

    await registerClientHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_EMAIL' })
    )
  })

  it('rejects duplicate client profiles', async () => {
    tenantClient.clientProfile.findUnique.mockResolvedValueOnce({ email: 'client@example.com' })

    const req = createRequest({
      firstName: 'Client',
      lastName: 'Example',
      email: 'client@example.com',
      password: 'secret123'
    })
    const res = createMockResponse()

    await registerClientHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CLIENT_EXISTS' })
    )
    expect(tenantClient.clientProfile.create).not.toHaveBeenCalled()
  })

  it('creates client profile and sets cookies', async () => {
    const req = createRequest({
      firstName: 'Client',
      lastName: 'Example',
      email: 'client@example.com',
      password: 'secret123'
    })
    const res = createMockResponse()

    await registerClientHandler(req, res)

    expect(bcryptHashMock).toHaveBeenCalledWith('secret123', 12)
    expect(tenantClient.clientProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'client@example.com'
        })
      })
    )
    expect(generateTokenPairMock).toHaveBeenCalled()
    expect(res.cookie).toHaveBeenCalledWith(
      'beauty_client_access_token',
      'client-access',
      expect.objectContaining({ httpOnly: true })
    )
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('handles unexpected errors with 500', async () => {
    tenantClient.clientProfile.create.mockRejectedValueOnce(new Error('db down'))
    const req = createRequest({
      firstName: 'Client',
      lastName: 'Example',
      email: 'client@example.com',
      password: 'secret123'
    })
    const res = createMockResponse()

    await registerClientHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INTERNAL_ERROR' })
    )
  })
})
