/// <reference types="vitest" />

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AuthService } from '../services/AuthService'
import { tenantPrisma, prisma } from '@beauty-platform/database'
import bcrypt from 'bcrypt'
import { generateTokenPair, verifyRefreshToken, hashToken, getTokenExpiration } from '../utils/jwt'

var tenantClient: any
var prismaClient: any
var tenantPrismaMock: any
var bcryptCompareMock: any

vi.mock('@beauty-platform/database', () => {
  tenantClient = {
    user: { findUnique: vi.fn() },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn()
    },
    device: {
      upsert: vi.fn(),
      update: vi.fn()
    },
    role: {
      findUnique: vi.fn()
    },
    tenant: {
      findFirst: vi.fn(),
      findUnique: vi.fn()
    },
    auditLog: { create: vi.fn() }
  }

  prismaClient = {
    userTenantRole: { findMany: vi.fn() },
    device: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    refreshToken: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn()
    },
    role: {
      findUnique: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    }
  }

  tenantPrismaMock = vi.fn(() => tenantClient)

  return {
    tenantPrisma: tenantPrismaMock,
    prisma: prismaClient
  }
})

vi.mock('bcrypt', () => {
  bcryptCompareMock = vi.fn()
  return {
    default: {
      compare: bcryptCompareMock
    },
    compare: bcryptCompareMock
  }
})

vi.mock('../utils/jwt', () => ({
  generateTokenPair: vi.fn(),
  verifyRefreshToken: vi.fn(),
  hashToken: vi.fn((value: string) => value),
  getTokenExpiration: vi.fn(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
}))


type MockUser = ReturnType<typeof createUser>

function createUser(overrides: Partial<MockUser> = {}): any {
  return {
    id: 'user-1',
    email: 'owner@beauty.test',
    firstName: 'Owner',
    lastName: 'Beauty',
    password: 'hashed-password',
    role: 'MANAGER',
    tenantId: 'tenant-1',
    status: 'ACTIVE',
    isActive: true,
    mfaEnabled: false,
    mfaSecret: null,
    tenant: {
      id: 'tenant-1',
      slug: 'beauty-salon',
      name: 'Beauty Salon',
      status: 'ACTIVE',
      isActive: true,
      logoUrl: null
    },
    ...overrides
  }
}

const authService = () => new AuthService()
const mockedTenantPrisma = tenantPrisma as unknown as vi.Mock
const mockedGenerateTokenPair = generateTokenPair as unknown as vi.Mock
const mockedBcryptCompare = bcrypt.compare as unknown as vi.Mock
const mockedVerifyRefreshToken = verifyRefreshToken as unknown as vi.Mock
const mockedHashToken = hashToken as unknown as vi.Mock
const mockedGetTokenExpiration = getTokenExpiration as unknown as vi.Mock

const baseTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  deviceId: 'fingerprint-1',
  expiresIn: 900
}

describe('AuthService.login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedTenantPrisma.mockReturnValue(tenantClient)
    tenantClient.user.findUnique.mockReset()
    tenantClient.refreshToken.create.mockReset()
    tenantClient.refreshToken.findUnique.mockReset()
    tenantClient.refreshToken.findFirst.mockReset()
    tenantClient.refreshToken.update.mockReset()
    tenantClient.refreshToken.count.mockReset()
    tenantClient.auditLog.create.mockReset()
    tenantClient.device.upsert.mockReset()
    tenantClient.device.update.mockReset()
    tenantClient.role.findUnique.mockReset()
    prismaClient.userTenantRole.findMany.mockReset()
    prismaClient.device.upsert.mockReset()
    prismaClient.device.findFirst.mockReset()
    prismaClient.device.create.mockReset()
    prismaClient.device.update.mockReset()
    prismaClient.refreshToken.create.mockReset()
    prismaClient.refreshToken.update.mockReset()
    prismaClient.refreshToken.findUnique.mockReset()
    prismaClient.role.findUnique.mockReset()
    prismaClient.user.findUnique.mockReset()
    mockedGenerateTokenPair.mockReturnValue({ ...baseTokens })
    mockedBcryptCompare.mockResolvedValue(true)
    mockedVerifyRefreshToken.mockImplementation(() => undefined)
    mockedHashToken.mockImplementation((value: string) => value)
    mockedGetTokenExpiration.mockReturnValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    tenantClient.refreshToken.count.mockResolvedValue(0)
    tenantClient.refreshToken.create.mockResolvedValue({
      id: 'rt-1',
      token: baseTokens.refreshToken,
      tokenHash: baseTokens.refreshToken,
      userId: 'user-1',
      deviceId: 'fingerprint-1',
      isUsed: false,
      usedAt: null,
      expiresAt: baseTokens.expiresAt,
      createdAt: new Date()
    })
    tenantClient.refreshToken.findFirst.mockResolvedValue({
      id: 'rt-1',
      token: baseTokens.refreshToken,
      tokenHash: baseTokens.refreshToken,
      userId: 'user-1',
      deviceId: 'fingerprint-1',
      isUsed: false,
      usedAt: null,
      expiresAt: baseTokens.expiresAt,
      createdAt: new Date()
    })
    tenantClient.device.upsert.mockResolvedValue({
      id: 'device-1',
      userId: 'user-1',
      deviceId: 'fingerprint-1',
      userAgent: 'jest',
      ipAddress: '127.0.0.1',
      deviceName: 'Test Device',
      isActive: true,
      lastUsedAt: new Date(),
      createdAt: new Date()
    })
    tenantClient.role.findUnique.mockResolvedValue(null)
    prismaClient.userTenantRole.findMany.mockResolvedValue([])
    // Mock prisma device for upsertDevice
    prismaClient.device.upsert.mockResolvedValue({
      id: 'device-1',
      userId: 'user-1',
      deviceId: 'fingerprint-1',
      userAgent: 'jest',
      ipAddress: '127.0.0.1',
      deviceName: 'Test Device',
      isActive: true,
      lastUsedAt: new Date(),
      createdAt: new Date()
    })
    prismaClient.device.findFirst.mockResolvedValue(null)
    prismaClient.device.create.mockResolvedValue({
      id: 'device-1',
      userId: 'user-1',
      deviceId: 'fingerprint-1',
      userAgent: 'jest',
      ipAddress: '127.0.0.1',
      deviceName: 'Test Device',
      isActive: true,
      lastUsedAt: new Date(),
      createdAt: new Date()
    })
    // Mock prisma refreshToken
    prismaClient.refreshToken.create.mockResolvedValue({
      id: 'rt-1',
      token: 'refresh-token',
      tokenHash: 'refresh-token',
      userId: 'user-1',
      deviceId: 'device-1',
      isUsed: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date()
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns tokens for valid credentials', async () => {
    tenantClient.user.findUnique.mockResolvedValue(createUser())
    prismaClient.userTenantRole.findMany.mockResolvedValue([
      {
        tenantId: 'tenant-1',
        role: 'MANAGER',
        isActive: true,
        tenant: { name: 'Beauty Salon', slug: 'beauty-salon', logoUrl: null, status: 'ACTIVE', isActive: true }
      }
    ])

    const service = authService()
    const result = await service.login({ email: 'owner@beauty.test', password: 'secret' })

    expect(result.success).toBe(true)
    expect(result).toMatchObject({
      accessToken: baseTokens.accessToken,
      refreshToken: baseTokens.refreshToken,
      user: {
        email: 'owner@beauty.test',
        tenants: [
          {
            tenantId: 'tenant-1',
            tenantName: 'Beauty Salon',
            tenantSlug: 'beauty-salon',
            role: 'MANAGER',
            logoUrl: null
          }
        ]
      }
    })
    expect(tenantClient.refreshToken.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        token: baseTokens.refreshToken,
        userId: 'user-1',
        deviceId: 'device-1',
        isUsed: false,
        expiresAt: expect.any(Date)
      })
    }))
    expect(mockedGenerateTokenPair).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      role: 'MANAGER'
    }))
  })

  it('returns error when user not found', async () => {
    tenantClient.user.findUnique.mockResolvedValue(null)

    const service = authService()
    const result = await service.login({ email: 'missing@beauty.test', password: 'secret' })

    expect(result.success).toBe(false)
    expect(result.code).toBe('INVALID_CREDENTIALS')
    expect(tenantClient.refreshToken.create).not.toHaveBeenCalled()
  })

  it('returns error when password invalid', async () => {
    tenantClient.user.findUnique.mockResolvedValue(createUser())
    mockedBcryptCompare.mockResolvedValue(false)
    const logSpy = vi.spyOn(AuthService.prototype as any, 'logLoginAttempt').mockResolvedValue(undefined)

    const service = authService()
    const result = await service.login({ email: 'owner@beauty.test', password: 'wrong' })

    expect(result.success).toBe(false)
    expect(result.code).toBe('INVALID_CREDENTIALS')
    expect(tenantClient.refreshToken.create).not.toHaveBeenCalled()
    expect(logSpy).toHaveBeenCalledWith('owner@beauty.test', false)
  })

  it('rejects inactive user accounts', async () => {
    tenantClient.user.findUnique.mockResolvedValue(createUser({ isActive: false }))

    const service = authService()
    const result = await service.login({ email: 'owner@beauty.test', password: 'secret' })

    expect(result.success).toBe(false)
    expect(result.code).toBe('ACCOUNT_INACTIVE')
    expect(tenantClient.refreshToken.create).not.toHaveBeenCalled()
  })

  it('rejects when tenant is inactive', async () => {
    tenantClient.user.findUnique.mockResolvedValue(
      createUser({
        tenant: {
          id: 'tenant-1',
          slug: 'beauty-salon',
          name: 'Beauty Salon',
          status: 'INACTIVE',
          isActive: false
        }
      })
    )

    const service = authService()
    const result = await service.login({ email: 'owner@beauty.test', password: 'secret' })

    expect(result.success).toBe(false)
    expect(result.code).toBe('TENANT_INACTIVE')
  })

  it('rejects when tenant slug mismatches request', async () => {
    tenantClient.user.findUnique.mockResolvedValue(createUser())

    const service = authService()
    const result = await service.login({
      email: 'owner@beauty.test',
      password: 'secret',
      tenantSlug: 'other-salon'
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe('TENANT_MISMATCH')
  })

  it('requires MFA for super admin with enabled MFA', async () => {
    tenantClient.user.findUnique.mockResolvedValue(
      createUser({
        role: 'SUPER_ADMIN',
        mfaEnabled: true
      })
    )

    const service = authService()
    const result = await service.login({ email: 'owner@beauty.test', password: 'secret' })

    expect(result.success).toBe(false)
    expect(result.code).toBe('MFA_REQUIRED')
    expect(result).toMatchObject({
      mfaRequired: true,
      userId: 'user-1'
    })
    expect(tenantClient.refreshToken.create).not.toHaveBeenCalled()
  })

  it('issues limited tokens for super admin without MFA', async () => {
    tenantClient.user.findUnique.mockResolvedValue(
      createUser({
        role: 'SUPER_ADMIN',
        mfaEnabled: false
      })
    )
    prismaClient.userTenantRole.findMany.mockResolvedValue([
      {
        tenantId: 'tenant-1',
        role: 'OWNER',
        tenant: { name: 'Beauty Salon', slug: 'beauty-salon', logoUrl: null }
      }
    ])

    const service = authService()
    const result = await service.login({ email: 'owner@beauty.test', password: 'secret' })

    expect(result.success).toBe(true)
    expect(result.mfaSetupRequired).toBe(true)
    expect(result.accessToken).toBe(baseTokens.accessToken)
    expect(result.refreshToken).toBe(baseTokens.refreshToken)
    expect(prismaClient.userTenantRole.findMany).toHaveBeenCalled()
  })

  it('stores refresh token and creates audit log on success', async () => {
    tenantClient.user.findUnique.mockResolvedValue(createUser())
    tenantClient.auditLog.create.mockResolvedValue(undefined)

    const service = authService()
    await service.login({ email: 'owner@beauty.test', password: 'secret' })

    expect(tenantClient.refreshToken.create).toHaveBeenCalled()
    expect(tenantClient.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'LOGIN',
          userId: 'user-1'
        })
      })
    )
  })

  it('propagates internal error if refresh token persistence fails', async () => {
    tenantClient.user.findUnique.mockResolvedValue(createUser())
    tenantClient.refreshToken.create.mockRejectedValueOnce(new Error('db down'))

    const service = authService()
    const result = await service.login({ email: 'owner@beauty.test', password: 'secret' })

    expect(result.success).toBe(false)
    expect(result.code).toBe('INTERNAL_ERROR')
  })

  it('maps multiple tenant memberships in response', async () => {
    tenantClient.user.findUnique.mockResolvedValue(createUser())
    prismaClient.userTenantRole.findMany.mockResolvedValue([
      {
        tenantId: 'tenant-1',
        role: 'OWNER',
        isActive: true,
        tenant: { name: 'Salon One', slug: 'salon-one', logoUrl: 'logo-1', status: 'ACTIVE', isActive: true }
      },
      {
        tenantId: 'tenant-2',
        role: 'MANAGER',
        isActive: true,
        tenant: { name: 'Salon Two', slug: 'salon-two', logoUrl: null, status: 'ACTIVE', isActive: true }
      }
    ])

    const service = authService()
    const result = await service.login({ email: 'owner@beauty.test', password: 'secret' })

    expect(result.success).toBe(true)
    expect(result.user?.tenants).toEqual([
      {
        tenantId: 'tenant-1',
        tenantName: 'Salon One',
        tenantSlug: 'salon-one',
        role: 'OWNER',
        logoUrl: 'logo-1'
      },
      {
        tenantId: 'tenant-2',
        tenantName: 'Salon Two',
        tenantSlug: 'salon-two',
        role: 'MANAGER',
        logoUrl: null
      }
    ])
  })

  it('logs successful login attempts', async () => {
    tenantClient.user.findUnique.mockResolvedValue(createUser())
    const logSpy = vi.spyOn(AuthService.prototype as any, 'logLoginAttempt').mockResolvedValue(undefined)

    const service = authService()
    await service.login({ email: 'owner@beauty.test', password: 'secret' })

    expect(logSpy).toHaveBeenCalledWith('owner@beauty.test', true, 'user-1')
  })
})

describe('AuthService.refreshToken', () => {
  beforeEach(() => {
    tenantClient.refreshToken.findUnique.mockResolvedValue({
      id: 'token-1',
      token: 'old-token',
      tokenHash: 'old-token',
      deviceId: 'device-1',
      isUsed: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      user: {
        id: 'user-1',
        email: 'owner@beauty.test',
        firstName: 'Owner',
        lastName: 'Beauty',
        role: 'MANAGER',
        tenantId: 'tenant-1',
        status: 'ACTIVE',
        isActive: true,
        tenant: {
          id: 'tenant-1',
          slug: 'beauty-salon',
          name: 'Beauty Salon',
          status: 'ACTIVE',
          isActive: true
        }
      },
      device: {
        id: 'device-1',
        userId: 'user-1',
        deviceId: 'fingerprint-1',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
        deviceName: 'Test Device',
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date()
      }
    })
  })

  it('returns new tokens for valid refresh token', async () => {
    const service = authService()
    const result = await service.refreshToken({ refreshToken: 'stored-token' })

    expect(mockedVerifyRefreshToken).toHaveBeenCalledWith('stored-token')
    expect(result.success).toBe(true)
    expect(result.accessToken).toBe(baseTokens.accessToken)
    expect(tenantClient.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'token-1' },
        data: expect.objectContaining({ isUsed: true, usedAt: expect.any(Date) })
      })
    )
  })

  it('rejects when refresh token verification fails', async () => {
    mockedVerifyRefreshToken.mockImplementationOnce(() => {
      throw new Error('bad token')
    })
    const service = authService()
    const result = await service.refreshToken({ refreshToken: 'invalid' })

    expect(result.success).toBe(false)
    expect(result.code).toBe('INVALID_REFRESH_TOKEN')
  })

  it('rejects expired refresh tokens', async () => {
    tenantClient.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'token-1',
      token: 'expired-token',
      tokenHash: 'expired-token',
      deviceId: 'fingerprint-1',
      isUsed: false,
      usedAt: null,
      expiresAt: new Date(Date.now() - 60_000)
    })

    const service = authService()
    const result = await service.refreshToken({ refreshToken: 'expired' })

    expect(result.code).toBe('REFRESH_TOKEN_EXPIRED')
  })

  it('rejects when stored user inactive', async () => {
    tenantClient.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'token-1',
      token: 'stored-token',
      tokenHash: 'stored-token',
      deviceId: 'fingerprint-1',
      isUsed: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: 'user-1',
        email: 'inactive@beauty.test',
        firstName: 'Inactive',
        lastName: 'User',
        role: 'MANAGER',
        tenantId: 'tenant-1',
        status: 'INACTIVE',
        isActive: false,
        tenant: {
          status: 'ACTIVE',
          isActive: true
        }
      }
    })

    const service = authService()
    const result = await service.refreshToken({ refreshToken: 'token' })

    expect(result.code).toBe('ACCOUNT_INACTIVE')
  })
})

describe('AuthService.logout', () => {
  beforeEach(() => {
    tenantClient.refreshToken.findFirst.mockResolvedValue({
      id: 'rt-1',
      token: 'stored-token',
      tokenHash: 'stored-token',
      userId: 'user-1',
      deviceId: 'device-1',
      isUsed: false,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      device: {
        id: 'device-1',
        userId: 'user-1',
        deviceId: 'fingerprint-1',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
        deviceName: 'Test Device',
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date()
      }
    })
    tenantClient.refreshToken.update.mockResolvedValue({})
    tenantClient.user.findUnique.mockResolvedValue(createUser())
  })

  it('revokes refresh token and logs audit event', async () => {
    const deactivateSpy = vi.spyOn(AuthService.prototype as any, 'deactivateDeviceIfNoActiveTokens').mockResolvedValue(undefined)
    const auditSpy = vi.spyOn(AuthService.prototype as any, 'logAuditEvent').mockResolvedValue(undefined)
    const service = authService()
    const result = await service.logout('refresh', 'user-1')

    expect(result.success).toBe(true)
    expect(tenantClient.refreshToken.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: expect.any(String), userId: 'user-1' }
      })
    )
    expect(tenantClient.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rt-1' },
        data: expect.objectContaining({ isUsed: true, usedAt: expect.any(Date) })
      })
    )
    expect(auditSpy).toHaveBeenCalledWith('LOGOUT', 'user-1', 'tenant-1', 'MANAGER')
    deactivateSpy.mockRestore()
    auditSpy.mockRestore()
  })

  it('handles logout errors gracefully', async () => {
    tenantClient.refreshToken.findFirst.mockRejectedValueOnce(new Error('db down'))
    const service = authService()
    const result = await service.logout('refresh', 'user-1')

    expect(result.success).toBe(false)
  })
})

describe('AuthService permission helpers', () => {
  it('hasPermission validates scoped access', () => {
    const service = authService()
    expect(service.hasPermission('MANAGER', 'appointments', 'create')).toBe(true)
    expect(service.hasPermission('STAFF_MEMBER', 'appointments', 'update', 'tenant')).toBe(false)
  })

  it('getUserPermissions returns role permissions', () => {
    const service = authService()
    const permissions = service.getUserPermissions('RECEPTIONIST')
    expect(Array.isArray(permissions)).toBe(true)
    expect(permissions.some(p => p.resource === 'appointments')).toBe(true)
  })
})
