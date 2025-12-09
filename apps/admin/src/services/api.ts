// API Service с CSRF/tenant интеграцией через общий SDK
import { sdkClient } from './sdkClient'

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: any
  headers?: Record<string, string>
  skipCSRF?: boolean // Для GET запросов
}

export class ApiService {
  private static instance: ApiService
  private readonly AUTH_API_URL = '/auth'

  private constructor() {}

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService()
    }
    return ApiService.instance
  }

  /**
   * Выполнить HTTP запрос с автоматической CSRF защитой
   */
  async request<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const { method = 'GET', body, headers: customHeaders = {}, skipCSRF = false } = options
    // sdkClient автоматически подставит CSRF для небезопасных методов
    // Для skipCSRF оставляем GET/безопасные методы как есть
    return sdkClient.request<T>(endpoint, {
      method,
      data: body,
      headers: customHeaders,
      retry: method === 'GET' || skipCSRF ? 0 : 1
    })
  }

  /**
   * GET запрос (без CSRF)
   */
  async get<T = any>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers: headers || {}, skipCSRF: true })
  }

  /**
   * POST запрос (с CSRF)
   */
  async post<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, headers: headers || {} })
  }

  /**
   * PUT запрос (с CSRF)
   */
  async put<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, headers: headers || {} })
  }

  /**
   * DELETE запрос (с CSRF)
   */
  async delete<T = any>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers: headers || {} })
  }

  clearCsrf(): void {
    sdkClient.clearCsrfCache()
  }

  /**
   * Auth-специфичные методы
   */
  auth = {
    me: () => this.get(`${this.AUTH_API_URL}/me`),
    login: (email: string, password: string) => 
      this.post(`${this.AUTH_API_URL}/login`, { email, password }),
    logout: () => this.post(`${this.AUTH_API_URL}/logout`),
    refresh: () => this.post(`${this.AUTH_API_URL}/refresh`),
    permissions: () => this.get(`${this.AUTH_API_URL}/permissions`),
    completeMFA: (userId: string, code: string, email: string) =>
      this.post(`${this.AUTH_API_URL}/mfa/complete-login`, { userId, code, email }),
    devices: () => this.get(`${this.AUTH_API_URL}/devices`),
    revokeDevice: (deviceId: string) => this.delete(`${this.AUTH_API_URL}/devices/${deviceId}`),
    revokeAllDevices: (keepCurrent = true) => {
      const query = keepCurrent ? '?keepCurrent=true' : ''
      return this.delete(`${this.AUTH_API_URL}/devices${query}`)
    },
    getMFAStats: () => this.get(`${this.AUTH_API_URL}/mfa/stats`),
    getMFAStatus: () => this.get(`${this.AUTH_API_URL}/mfa/status`)
  }
}

// Экспорт singleton instance
export const apiService = ApiService.getInstance()
