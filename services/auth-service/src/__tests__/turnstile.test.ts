import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Request, Response } from 'express'
import { ensureTurnstileChallenge, isTurnstileEnabled } from '../utils/turnstile'

const createMockResponse = () => {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnThis()
  res.json = vi.fn().mockReturnThis()
  return res as Response
}

const createMockRequest = (options: {
  query?: Record<string, unknown>
  headers?: Record<string, unknown>
  ip?: string
  body?: unknown
} = {}) => {
  const req: Partial<Request> = {
    query: options.query ?? {},
    headers: options.headers ?? {},
    ip: options.ip ?? '127.0.0.1',
    body: options.body ?? undefined
  }

  return req as Request
}

describe('Turnstile helpers', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
  })

  it('returns true when turnstile is disabled', async () => {
    delete process.env.TURNSTILE_SECRET_KEY

    const req = createMockRequest()
    const res = createMockResponse()

    const result = await ensureTurnstileChallenge(req, res, { context: 'test' })

    expect(isTurnstileEnabled()).toBe(false)
    expect(result).toBe(true)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('rejects when token missing and check required', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret-key'

    const req = createMockRequest()
    const res = createMockResponse()

    const result = await ensureTurnstileChallenge(req, res, { context: 'test', required: true })

    expect(result).toBe(false)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'TURNSTILE_TOKEN_REQUIRED'
      })
    )
  })

  it('verifies token when present', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret-key'

    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    } as any)

    const req = createMockRequest({
      query: { turnstileToken: 'token-abc' },
      ip: '203.0.113.5'
    })
    const res = createMockResponse()

    const result = await ensureTurnstileChallenge(req, res, { context: 'test', required: true })

    expect(result).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
    expect((req.query as Record<string, unknown>).turnstileToken).toBeUndefined()
  })

  it('returns error when verification fails', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret-key'

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] })
    } as any)

    const req = createMockRequest({
      query: { turnstileToken: 'token-invalid' }
    })
    const res = createMockResponse()

    const result = await ensureTurnstileChallenge(req, res, { context: 'test', required: true })

    expect(result).toBe(false)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'TURNSTILE_CHALLENGE_FAILED'
      })
    )
  })
})
