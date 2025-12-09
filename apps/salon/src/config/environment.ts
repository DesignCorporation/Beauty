// Environment configuration with secure fallbacks
// Based on Beauty Platform security documentation

import { debugLog } from '../utils/debug'

const isDevelopment = import.meta.env.DEV || false
const isProduction = import.meta.env.PROD || false

// Resolves an absolute API base URL (without trailing slash) using env or secure defaults.
// In development, allows relative paths like "/api"
const resolveApiBaseUrl = (): string => {
  const envApi = (import.meta.env.VITE_API_URL as string | undefined)?.trim()

  // Allow relative paths in development mode
  if (isDevelopment && envApi) {
    return envApi.replace(/\/$/, '')
  }

  // Require absolute URL in production
  if (envApi && /^https?:\/\//.test(envApi)) {
    return envApi.replace(/\/$/, '')
  }

  throw new Error('VITE_API_URL is required and must be an absolute URL (or relative path in dev)')
}

const API_BASE_URL = resolveApiBaseUrl()
const AUTH_BASE_URL =
  (import.meta.env.VITE_AUTH_URL as string | undefined)?.replace(/\/$/, '') ||
  `${API_BASE_URL}/auth`
const CRM_BASE_URL =
  (import.meta.env.VITE_CRM_URL as string | undefined)?.replace(/\/$/, '') ||
  `${API_BASE_URL}/crm`

export const ENVIRONMENT = {
  API_URL: API_BASE_URL,
  AUTH_URL: AUTH_BASE_URL,
  CRM_URL: CRM_BASE_URL,
  TURNSTILE_SITE_KEY: import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined,

  isDevelopment,
  isProduction,
  
  getApiUrl(): string {
    debugLog('Using API URL:', this.API_URL)
    return this.API_URL
  },
  
  getAuthUrl(): string {
    debugLog('Environment DEBUG:', {
      isDev: this.isDevelopment,
      isProd: this.isProduction,
      envAuthUrl: import.meta.env.VITE_AUTH_URL,
      apiUrl: this.API_URL
    })

    debugLog('Using Auth URL:', this.AUTH_URL)
    return this.AUTH_URL
  },

  getCrmUrl(): string {
    debugLog('Using CRM URL:', this.CRM_URL)
    return this.CRM_URL
  },

  getTurnstileSiteKey(): string | null {
    if (!this.isProduction) {
      return null
    }

    const siteKey = this.TURNSTILE_SITE_KEY || import.meta.env.VITE_TURNSTILE_SITE_KEY
    if (siteKey) {
      debugLog('Turnstile site key detected, bot protection enabled')
    }
    return siteKey || null
  }
}

// Валидация конфигурации при загрузке
if (ENVIRONMENT.isProduction) {
  if (!ENVIRONMENT.API_URL.startsWith('https://')) {
    console.error('❌ SECURITY ERROR: Production API URL must use HTTPS!')
  }
  
  if (!ENVIRONMENT.AUTH_URL.startsWith('https://')) {
    console.error('❌ SECURITY ERROR: Production Auth URL must use HTTPS!')
  }
  
  debugLog('Production environment configured securely')
  debugLog(`Auth URL: ${ENVIRONMENT.getAuthUrl()}`)
}

export default ENVIRONMENT
