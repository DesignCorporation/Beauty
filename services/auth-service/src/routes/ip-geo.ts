import express, { type Router } from 'express'

const router: Router = express.Router()

const IP_GEO_ENDPOINT = process.env.IP_GEO_ENDPOINT || 'https://ipapi.co/json/'
const IP_GEO_DISABLED = process.env.IP_GEO_DISABLED === 'true'

type IpGeoResponse = {
  success: boolean
  country: {
    code: string | null
    name: string | null
  }
  city: string | null
  currency: string | null
  raw: Record<string, unknown> | null
}

const FALLBACK_RESPONSE: IpGeoResponse = {
  success: true,
  country: { code: null, name: null },
  city: null,
  currency: 'EUR',
  raw: null
}

router.get('/ip-geo', async (_req, res) => {
  try {
    if (IP_GEO_DISABLED) {
      console.log('[Auth][IP-GEO] Disabled via IP_GEO_DISABLED flag — returning fallback response')
      res.json(FALLBACK_RESPONSE)
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)

    const response = await fetch(IP_GEO_ENDPOINT, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BeautyPlatformAuthService/1.0 (+https://beauty.designcorp.eu)'
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`IP geo request failed with status ${response.status}`)
    }

    const data = await response.json()

    res.json({
      success: true,
      country: {
        code: data.country_code ?? null,
        name: data.country_name ?? null
      },
      city: data.city ?? null,
      currency: data.currency ?? null,
      raw: data
    })
  } catch (error) {
    console.error('[Auth][IP-GEO] Failed to resolve geo info:', error)
    res.json(FALLBACK_RESPONSE)
  }
})

export default router
