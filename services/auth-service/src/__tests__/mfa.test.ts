/// <reference types="vitest" />

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MFAService } from '../services/MFAService'
import crypto from 'crypto'

var generateSecretMock: any
var otpauthUrlMock: any
var totpFnMock: any
var totpVerifyMock: any
var qrCodeMock: any
var pinoLoggerMock: any

vi.mock('speakeasy', () => {
  generateSecretMock = vi.fn(() => ({ base32: 'TESTSECRETBASE32' }))
  otpauthUrlMock = vi.fn(() => 'otpauth://totp/Beauty')
  totpVerifyMock = vi.fn(() => true)
  totpFnMock = vi.fn(() => '654321')
  ;(totpFnMock as any).verify = totpVerifyMock

  return {
    generateSecret: generateSecretMock,
    otpauthURL: otpauthUrlMock,
    totp: totpFnMock
  }
})

vi.mock('qrcode', () => {
  qrCodeMock = vi.fn(async () => 'data:image/png;base64,QR')
  return {
    toDataURL: qrCodeMock
  }
})

vi.mock('pino', () => ({
  default: () => {
    pinoLoggerMock = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    }
    return pinoLoggerMock
  }
}))

const mfaService = () => new MFAService()

describe('MFAService.generateMFASetup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates secret, QR code and backup codes', async () => {
    const randomBytesSpy = vi.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('a1b2c3d4', 'hex'))
    const service = mfaService()

    const result = await service.generateMFASetup('owner@beauty.test', 'Owner')

    expect(generateSecretMock).toHaveBeenCalledWith(expect.objectContaining({ issuer: 'Beauty Platform' }))
    expect(otpauthUrlMock).toHaveBeenCalled()
    expect(qrCodeMock).toHaveBeenCalled()
    expect(result.secret).toBe('TESTSECRETBASE32')
    expect(result.qrCodeUrl).toContain('otpauth://')
    expect(result.backupCodes).toHaveLength(10)
    expect(result.manualEntryKey).toMatch(/\s/)
    randomBytesSpy.mockRestore()
  })

  it('throws when secret generation fails', async () => {
    generateSecretMock.mockReturnValueOnce({ base32: undefined })
    const service = mfaService()

    await expect(service.generateMFASetup('owner@beauty.test')).rejects.toThrow('Failed to generate MFA setup')
  })
})

describe('MFAService.verifyMFAToken', () => {
  beforeEach(() => {
    totpVerifyMock.mockReset()
    totpVerifyMock.mockReturnValue(true)
  })

  it('verifies 6-digit TOTP tokens', () => {
    const service = mfaService()
    const result = service.verifyMFAToken('TESTSECRETBASE32', '123456')

    expect(totpVerifyMock).toHaveBeenCalledWith(expect.objectContaining({ token: '123456' }))
    expect(result.verified).toBe(true)
  })

  it('rejects tokens with invalid format', () => {
    const service = mfaService()
    const result = service.verifyMFAToken('TESTSECRETBASE32', 'invalid')

    expect(result.verified).toBe(false)
    expect(totpVerifyMock).not.toHaveBeenCalled()
  })

  it('accepts unused backup codes', () => {
    const service = mfaService()
    const result = service.verifyMFAToken('TESTSECRETBASE32', 'ABC12345', [])

    expect(result).toEqual({ verified: true, usedBackupCode: true })
  })

  it('rejects already used backup codes', () => {
    const service = mfaService()
    const result = service.verifyMFAToken('TESTSECRETBASE32', 'ABC12345', ['ABC12345'])

    expect(result.verified).toBe(false)
  })
})

describe('MFAService helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates current token via speakeasy', () => {
    const service = mfaService()
    const token = service.generateCurrentToken('TESTSECRETBASE32')

    expect(totpFnMock).toHaveBeenCalledWith(expect.objectContaining({ secret: 'TESTSECRETBASE32' }))
    expect(token).toBe('654321')
  })

  it('validates base32 secrets', () => {
    const service = mfaService()
    expect(service.validateSecret('ABCDEFGHIJKLMNOP')).toBe(true)
    expect(service.validateSecret('invalid-secret')).toBe(false)
  })

  it('hashes backup codes with sha256', () => {
    const service = mfaService()
    const hashes = service.hashBackupCodes(['ABC12345'])

    expect(hashes[0]).toHaveLength(64)
    expect(hashes[0]).toMatch(/^[0-9a-f]+$/)
  })

  it('verifies hashed backup codes and detects reuse', () => {
    const service = mfaService()
    const hashes = service.hashBackupCodes(['ABC12345'])

    const firstCheck = service.verifyHashedBackupCode('ABC12345', hashes, [])
    expect(firstCheck).toEqual({ verified: true, usedBackupCode: true })

    const secondCheck = service.verifyHashedBackupCode('ABC12345', hashes, hashes)
    expect(secondCheck.verified).toBe(false)
  })

  it('calculates time until next token boundary', () => {
    const service = mfaService()
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(30_500)

    const remaining = service.getTimeUntilNextToken()
    expect(remaining).toBeGreaterThanOrEqual(0)
    expect(remaining).toBeLessThanOrEqual(30)
    nowSpy.mockRestore()
  })

  it('checks role requirement for MFA', () => {
    expect(MFAService.requiresMFA('SUPER_ADMIN')).toBe(true)
    expect(MFAService.requiresMFA('MANAGER')).toBe(false)
  })
})
