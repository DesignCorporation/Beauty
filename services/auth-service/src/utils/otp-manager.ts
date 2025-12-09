import crypto from 'node:crypto'
import { createClient, RedisClientType } from 'redis'

const redisUrl = process.env.REDIS_URL

const OTP_LENGTH = Number.parseInt(process.env.SMS_OTP_LENGTH || '6', 10)
const OTP_EXPIRY_SECONDS = Number.parseInt(process.env.SMS_OTP_EXPIRY_MINUTES || '5', 10) * 60
const MAX_ATTEMPTS = Number.parseInt(process.env.SMS_MAX_ATTEMPTS_PER_HOUR || '3', 10)
const REQUEST_WINDOW = 60 * 60 // 1 hour for sending rate limit

const OTP_KEY_PREFIX = 'otp:code:'
const ATTEMPT_KEY_PREFIX = 'otp:attempts:'
const REQUEST_KEY_PREFIX = 'otp:requests:'

let redisClient: RedisClientType | null = null

async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({ url: redisUrl })
    redisClient.on('error', (err) => console.error('[OTP] Redis error', err))
  }

  if (!redisClient.isOpen) {
    await redisClient.connect()
  }

  return redisClient
}

const otpKey = (phone: string) => `${OTP_KEY_PREFIX}${phone}`
const attemptKey = (phone: string) => `${ATTEMPT_KEY_PREFIX}${phone}`
const requestKey = (phone: string) => `${REQUEST_KEY_PREFIX}${phone}`

export function generateOtp(length: number = OTP_LENGTH): string {
  const digits = '0123456789'
  let otp = ''

  for (let i = 0; i < length; i += 1) {
    const random = crypto.randomInt(0, digits.length)
    otp += digits.charAt(random)
  }

  return otp
}

export async function storeOtp(phone: string, code: string): Promise<void> {
  const client = await getRedisClient()
  await client.setEx(otpKey(phone), OTP_EXPIRY_SECONDS, code)
  await client.del(attemptKey(phone))
}

export async function getStoredOtp(phone: string): Promise<string | null> {
  const client = await getRedisClient()
  return client.get(otpKey(phone))
}

export async function clearOtp(phone: string): Promise<void> {
  const client = await getRedisClient()
  await client.del(otpKey(phone))
  await client.del(attemptKey(phone))
}

export async function incrementSendRequest(phone: string): Promise<{ allowed: boolean; remaining: number }> {
  const client = await getRedisClient()
  const key = requestKey(phone)
  const requests = await client.incr(key)

  if (requests === 1) {
    await client.expire(key, REQUEST_WINDOW)
  }

  const remaining = Math.max(MAX_ATTEMPTS - requests, 0)
  const allowed = requests <= MAX_ATTEMPTS

  if (!allowed) {
    if (requests === MAX_ATTEMPTS + 1) {
      const ttl = await client.ttl(key)
      console.warn(`[OTP] Rate limit exceeded for ${phone}, ttl ${ttl}s`)
    }
  }

  return { allowed, remaining }
}

export async function recordFailedAttempt(phone: string): Promise<{ remaining: number }> {
  const client = await getRedisClient()
  const key = attemptKey(phone)
  const attempts = await client.incr(key)

  if (attempts === 1) {
    await client.expire(key, REQUEST_WINDOW)
  }

  const remaining = Math.max(MAX_ATTEMPTS - attempts, 0)
  return { remaining }
}

export async function resetAttempts(phone: string): Promise<void> {
  const client = await getRedisClient()
  await client.del(attemptKey(phone))
}

export function getOtpExpirySeconds(): number {
  return OTP_EXPIRY_SECONDS
}

export function getMaxAttempts(): number {
  return MAX_ATTEMPTS
}
