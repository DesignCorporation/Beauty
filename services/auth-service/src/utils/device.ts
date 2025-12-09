import crypto from 'crypto'
import type { Request } from 'express'
import { AuthDeviceContext } from '../types/auth'

const SIGNATURE_HEADERS = [
  'user-agent',
  'sec-ch-ua',
  'sec-ch-ua-platform',
  'sec-ch-ua-mobile',
  'accept-language'
]

export function getClientIp(req: Request): string | null {
  const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
  if (forwarded) {
    return forwarded
  }

  if (req.ip) {
    return req.ip
  }

  const remoteAddress = (req.connection.remoteAddress || req.socket.remoteAddress) ?? null
  return remoteAddress
}

export function getDeviceName(userAgent?: string | null): string {
  if (!userAgent) {
    return 'Unknown device'
  }

  const ua = userAgent.toLowerCase()

  const isMobile = /iphone|android|ipad|mobile/.test(ua)
  const isWindows = ua.includes('windows')
  const isMac = ua.includes('mac os x') || ua.includes('macintosh')
  const isLinux = ua.includes('linux')

  const browser = ua.includes('chrome')
    ? 'Chrome'
    : ua.includes('safari') && !ua.includes('chrome')
      ? 'Safari'
      : ua.includes('firefox')
        ? 'Firefox'
        : ua.includes('edge')
          ? 'Edge'
          : 'Browser'

  if (isMobile) {
    if (ua.includes('iphone')) {
      return `${browser} on iPhone`
    }
    if (ua.includes('ipad')) {
      return `${browser} on iPad`
    }
    if (ua.includes('android')) {
      return `${browser} on Android`
    }
    return `${browser} on Mobile`
  }

  if (isWindows) {
    return `${browser} on Windows`
  }
  if (isMac) {
    return `${browser} on macOS`
  }
  if (isLinux) {
    return `${browser} on Linux`
  }

  return `${browser} device`
}

export function generateDeviceContext(req: Request): AuthDeviceContext {
  const userAgent = (req.headers['user-agent'] as string | undefined) || null
  const ipAddress = getClientIp(req)

  const signatureSource = SIGNATURE_HEADERS
    .map(header => {
      const value = req.headers[header] as string | undefined
      return value ? value.trim() : ''
    })
    .join('|')

  const signature = signatureSource || `${userAgent || 'unknown'}|${ipAddress || 'unknown'}`

  const deviceId = crypto.createHash('sha256').update(signature).digest('hex')

  return {
    deviceId,
    userAgent,
    ipAddress,
    deviceName: getDeviceName(userAgent)
  }
}
