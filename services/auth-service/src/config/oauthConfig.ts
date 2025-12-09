/**
 * OAuth Configuration with explicit domain whitelist
 * Replaces wildcard checks with explicit list of allowed domains
 */

export const ALLOWED_OAUTH_DOMAINS_PROD = new Set<string>([
  'salon.beauty.designcorp.eu',
  'client.beauty.designcorp.eu',
  'admin.beauty.designcorp.eu',
  'api.beauty.designcorp.eu',
  'dev-api.beauty.designcorp.eu',
])

export const ALLOWED_OAUTH_DOMAINS_DEV = new Set<string>([
  'localhost',
  '127.0.0.1',
  'localhost:6001',
  'localhost:6002',
  'localhost:6003',
  '127.0.0.1:6001',
  '127.0.0.1:6002',
  '127.0.0.1:6003',
  // Dev subdomains
  'dev-salon.beauty.designcorp.eu',
  'dev-client.beauty.designcorp.eu',
  'dev-admin.beauty.designcorp.eu',
  'dev-api.beauty.designcorp.eu',
])

/**
 * Get allowed OAuth domains based on environment
 */
export const getAllowedOAuthDomains = (): Set<string> => {
  const isProd = process.env.NODE_ENV === 'production'
  return isProd ? ALLOWED_OAUTH_DOMAINS_PROD : ALLOWED_OAUTH_DOMAINS_DEV
}

/**
 * Check if a host is allowed for OAuth redirect
 */
export const isAllowedOAuthDomain = (host: string): boolean => {
  if (!host) return false
  const normalizedHost = host.toLowerCase()
  const allowedDomains = getAllowedOAuthDomains()
  return allowedDomains.has(normalizedHost)
}

/**
 * Get cookie domain from environment with fallback
 * In production, COOKIE_DOMAIN is REQUIRED
 */
export const getCookieDomain = (): string => {
  const cookieDomain = process.env.COOKIE_DOMAIN

  if (process.env.NODE_ENV === 'production') {
    if (!cookieDomain) {
      throw new Error(
        'COOKIE_DOMAIN environment variable is required in production. ' +
        'Set it to a value like ".beauty.designcorp.eu" (with leading dot for subdomains)'
      )
    }
    return cookieDomain
  }

  // Development: default to localhost
  return cookieDomain || '.localhost'
}

/**
 * Get safe OAuth fallback domain for redirect
 * Used when host detection fails
 */
export const getSafeOAuthFallbackDomain = (): string => {
  const isProd = process.env.NODE_ENV === 'production'
  const cookieDomain = process.env.COOKIE_DOMAIN

  if (isProd && cookieDomain) {
    // Remove leading dot if present for use as hostname
    return cookieDomain.startsWith('.') ? cookieDomain.substring(1) : cookieDomain
  }

  // Development fallback
  return 'localhost'
}
