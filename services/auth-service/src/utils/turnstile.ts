import type { Request, Response } from 'express'

interface TurnstileVerifyResponse {
  success: boolean
  challenge_ts?: string
  hostname?: string
  'error-codes'?: string[]
  action?: string
  cdata?: string
}

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

const isBypassEnabled = () => {
  if (process.env.TURNSTILE_BYPASS === '1') {
    return true
  }

  const nodeEnv = process.env.NODE_ENV
  // По умолчанию отключаем Turnstile вне production, но сохраняем поведение для тестов
  if (nodeEnv && nodeEnv !== 'production' && nodeEnv !== 'test') {
    return true
  }

  return false
}
export const getTurnstileSecretKey = () => process.env.TURNSTILE_SECRET_KEY || ''
export const isTurnstileEnabled = () => Boolean(getTurnstileSecretKey()) && !isBypassEnabled()

const extractTokenFromRequest = (req: Request): string | null => {
  const fromQuery = typeof req.query.turnstileToken === 'string' ? req.query.turnstileToken : null
  if (fromQuery) {
    return fromQuery
  }

  const headerToken = req.headers['cf-turnstile-response']
  if (typeof headerToken === 'string') {
    return headerToken
  }

  const fromBody = (req.body as any)?.turnstileToken
  if (typeof fromBody === 'string') {
    return fromBody
  }

  return null
}

export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<TurnstileVerifyResponse> {
  const secret = getTurnstileSecretKey()
  if (!secret || isBypassEnabled()) {
    return { success: true }
  }

  const params = new URLSearchParams()
  params.set('secret', secret)
  params.set('response', token)
  if (remoteIp) {
    params.set('remoteip', remoteIp)
  }

  const response = await fetch(VERIFY_URL, {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })

  if (!response.ok) {
    throw new Error(`Turnstile verification failed with status ${response.status}`)
  }

  return (await response.json()) as TurnstileVerifyResponse
}

interface EnsureOptions {
  required?: boolean
  context?: string
}

export async function ensureTurnstileChallenge(
  req: Request,
  res: Response,
  { required = true, context = 'oauth' }: EnsureOptions = {}
): Promise<boolean> {
  if (!isTurnstileEnabled()) {
    return true
  }

  const token = extractTokenFromRequest(req)

  if (!token) {
    if (!required) {
      return true
    }
    res.status(400).json({
      success: false,
      error: 'TURNSTILE_TOKEN_REQUIRED',
      message: 'Подтвердите, что вы не робот, прежде чем продолжить.'
    })
    return false
  }

  const remoteIp = (req.headers['cf-connecting-ip'] as string) ?? req.ip

  try {
    const verification = await verifyTurnstileToken(token, remoteIp)

    if (!verification.success) {
      console.warn('[Auth][Turnstile] Verification failed', {
        context,
        errorCodes: verification['error-codes'],
        remoteIp
      })

      res.status(400).json({
        success: false,
        error: 'TURNSTILE_CHALLENGE_FAILED',
        message: 'Проверка защиты от ботов не пройдена. Обновите страницу и попробуйте ещё раз.',
        details: verification['error-codes']
      })
      return false
    }
  } catch (error) {
    console.error('[Auth][Turnstile] Verification error', {
      context,
      error
    })

    res.status(502).json({
      success: false,
      error: 'TURNSTILE_UNAVAILABLE',
      message: 'Сервис проверки недоступен. Попробуйте позже.'
    })
    return false
  }

  if (typeof req.query.turnstileToken !== 'undefined') {
    delete (req.query as Record<string, unknown>).turnstileToken
  }

  return true
}
