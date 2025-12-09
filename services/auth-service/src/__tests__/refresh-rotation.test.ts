/// <reference types="vitest" />

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthService } from '../services/AuthService'
import { tenantPrisma } from '@beauty-platform/database'
import { hashToken } from '../utils/jwt'

// Mocks defined similarly to login.test.ts
var tenantClient: any
var prismaClient: any

vi.mock('@beauty-platform/database', () => {
  tenantClient = {
    refreshToken: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    },
    device: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn()
    },
    userTenantRole: { findMany: vi.fn() },
    auditLog: { create: vi.fn() },
    role: { findUnique: vi.fn() }
  }
  
  prismaClient = {
     device: { updateMany: vi.fn() },
     userTenantRole: { findMany: vi.fn() }
  }

  return {
    tenantPrisma: vi.fn(() => tenantClient),
    prisma: prismaClient
  }
})

// Mock JWT utils
vi.mock('../utils/jwt', async (importOriginal) => {
    const actual = await importOriginal() as any
    return {
        ...actual,
        verifyRefreshToken: vi.fn(),
        getTokenExpiration: vi.fn().mockReturnValue(new Date(Date.now() + 10000)),
        generateTokenPair: vi.fn().mockResolvedValue({
            accessToken: 'new_access_token',
            refreshToken: 'new_refresh_token',
            expiresIn: 3600
        })
    }
})

// Mock SecurityLogger
vi.mock('../security/SecurityLogger', () => ({
  securityLogger: {
    logSecurityEvent: vi.fn()
  },
  SecurityEventType: {
    TOKEN_REUSED: 'TOKEN_REUSED'
  }
}))

describe('Refresh Token Rotation', () => {
  let authService: AuthService

  beforeEach(() => {
    vi.clearAllMocks()
    authService = new AuthService()
  })

  it('should detect token reuse and revoke all device sessions', async () => {
    const stolenToken = 'stolen_refresh_token'
    const hashedStolenToken = hashToken(stolenToken)
    
    // Mock verifyRefreshToken success
    const { verifyRefreshToken } = await import('../utils/jwt')
    vi.mocked(verifyRefreshToken).mockResolvedValue({ userId: 'user1' } as any)

    // Mock DB finding a USED token
    tenantClient.refreshToken.findUnique.mockResolvedValue({
      id: 'token_id_1',
      token: hashedStolenToken,
      userId: 'user1',
      deviceId: 'device1',
      isUsed: true, // ALERT: Token already used!
      expiresAt: new Date(Date.now() + 10000),
      user: {
         id: 'user1',
         email: 'victim@example.com',
         role: 'CLIENT',
         tenantId: 'tenant1'
      },
      device: {
         deviceId: 'device1'
      }
    })

    const result = await authService.refreshToken({ refreshToken: stolenToken })

    // Check Reuse Detection triggered
    expect(result.success).toBe(false)
    if ('code' in result) {
        expect(result.code).toBe('REFRESH_TOKEN_REUSED')
    }

    // Verify revocation called
    expect(tenantClient.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user1',
        deviceId: 'device1',
        isUsed: false
      },
      data: {
        isUsed: true,
        usedAt: expect.any(Date),
        expiresAt: expect.any(Date)
      }
    })
  })
})
