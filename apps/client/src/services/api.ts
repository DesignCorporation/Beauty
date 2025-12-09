
import { sdkClient } from './sdkClient'
import { io, Socket } from 'socket.io-client'

interface ApiRequestOptions extends RequestInit {
  skipCSRF?: boolean
  skipAuth?: boolean
}

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface UpdateClientProfilePayload {
  firstName?: string
  lastName?: string
  phone?: string | null
  birthdate?: string | null
  gender?: string | null
  preferredLanguage?: string
  marketingConsent?: boolean
  avatar?: string | null
}

export interface SalonService {
  id: string
  name: string
  description?: string | null
  duration: number
  price: number
  currency?: string | null
  categoryId?: string | null
  subcategoryId?: string | null
  status?: string | null
  isDefault?: boolean
  isActive?: boolean
}

export interface SalonStaffMember {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  avatar?: string | null
  avatarUrl?: string | null
  role?: string | null
  color?: string | null
  status?: string | null
  isActive?: boolean
}

export type SlotUnavailabilityReason =
  | 'APPOINTMENT_CONFLICT'
  | 'SALON_CLOSED'
  | 'STAFF_OFF'
  | 'OUTSIDE_WORKING_HOURS'

export interface AvailabilitySlot {
  time: string
  endTime?: string
  available: boolean
  unavailableReason?: SlotUnavailabilityReason
  reasonKey?: string
}

export interface CreateAppointmentRequest {
  clientEmail: string
  clientData?: {
    firstName: string
    lastName: string
    phone?: string
  }
  serviceId: string
  staffId: string
  startAt: string
  endAt: string
  notes?: string
  payment: {
    method: 'CASH' | 'CARD'
    amount: number
    currency: string
    paymentId?: string
  }
  loyaltyPointsUsed?: number
}

export interface CreatedAppointment {
  id: string
  appointmentNumber?: string
  [key: string]: unknown
}

const extractArrayFromResponse = <T>(response: ApiResponse<any>, key: string): T[] => {
  const { data } = response

  if (Array.isArray(data)) {
    return data as T[]
  }

  if (data && Array.isArray((data as Record<string, unknown>)[key] as T[])) {
    return (data as Record<string, unknown>)[key] as T[]
  }

  const topLevel = (response as unknown as Record<string, unknown>)[key]
  if (Array.isArray(topLevel)) {
    return topLevel as T[]
  }

  if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as Record<string, unknown>).items as T[])
  ) {
    return (data as Record<string, unknown>).items as T[]
  }

  return []
}

const extractFieldFromResponse = <T>(response: ApiResponse<any>, key: string): T | null => {
  const { data } = response

  if (data && typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>
    if (key in record) {
      return record[key] as T
    }
  }

  const topLevel = (response as unknown as Record<string, unknown>)[key]
  if (typeof topLevel !== 'undefined') {
    return topLevel as T
  }

  if (data && typeof data === 'object' && data !== null) {
    return data as unknown as T
  }

  return null
}

export class ClientApiService {
  private static instance: ClientApiService
  
  private readonly API_BASE_URL = (import.meta.env.VITE_AUTH_URL as string | undefined)?.replace(/\/$/, '') || '/api/auth'
  private readonly CLIENTS_BASE_URL = (import.meta.env.VITE_AUTH_CLIENT_URL as string | undefined)?.replace(/\/$/, '') || '/api/auth/client'
  private readonly GATEWAY_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api'
  
  private refreshPromise: Promise<boolean> | null = null
  private notificationSocket: Socket | null = null

  private constructor() {}

  static getInstance(): ClientApiService {
    if (!ClientApiService.instance) {
      ClientApiService.instance = new ClientApiService()
    }
    return ClientApiService.instance
  }

  getAuthBaseUrl(): string {
    return this.API_BASE_URL
  }

  getClientsBaseUrl(): string {
    return this.CLIENTS_BASE_URL
  }

  getGatewayBaseUrl(): string {
    return this.GATEWAY_BASE_URL
  }

  /**
   * Основной метод для API запросов с CSRF защитой
   */
  async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.API_BASE_URL}${endpoint}`
    return this.performRequest<T>(url, options)
  }

  // Convenience методы
  async get<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: data ? JSON.stringify(data) : undefined })
  }

  async put<T>(endpoint: string, data?: any, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: data ? JSON.stringify(data) : undefined })
  }

  async delete<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  async requestGateway<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.GATEWAY_BASE_URL}${endpoint}`
    return this.performRequest<T>(url, options)
  }

  private async performRequest<T>(
    url: string,
    options: ApiRequestOptions = {},
    attempt = 0
  ): Promise<ApiResponse<T>> {
    const { skipAuth = false, ...requestOptions } = options
    const method = (requestOptions.method || 'GET').toUpperCase()
    const needCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method)

    try {
      const response = await sdkClient.request<ApiResponse<T>>(url, {
        method,
        data: requestOptions.body ? JSON.parse(requestOptions.body as string) : undefined,
        headers: requestOptions.headers as Record<string, string> | undefined,
        retry: 1,
        skipCsrf: !needCsrf
      })
      return response
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error)

      if (!skipAuth && message.includes('401') && attempt === 0 && !url.endsWith('/refresh')) {
        const refreshed = await this.refreshSession()
        if (refreshed) {
          return this.performRequest<T>(url, { ...options, skipAuth: true }, attempt + 1)
        }
      }

      if (message.includes('403') && needCsrf && attempt === 0) {
        sdkClient.clearCsrfCache()
        return this.performRequest<T>(url, { ...options, skipAuth, skipCSRF: true }, attempt + 1)
      }

      console.error('API request failed:', error)
      throw error
    }
  }

  private async refreshSession(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    const refreshUrl = `${this.API_BASE_URL}/refresh`
    this.refreshPromise = (async () => {
      try {
        await sdkClient.request(refreshUrl, { method: 'POST', retry: 0 })
        sdkClient.clearCsrfCache()
        return true
      } catch (error) {
        console.error('Failed to refresh session:', error)
        return false
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  /**
   * Специальные методы для клиентского портала
   */

  // Регистрация клиента
  async registerClient(userData: {
    firstName: string
    lastName: string
    email: string
    password: string
    phone?: string
  }): Promise<ApiResponse> {
    return this.post('/register-client', userData)
  }

  // Вход клиента
  async loginClient(credentials: {
    email: string
    password: string
  }): Promise<ApiResponse> {
    return this.post('/login-client', credentials)
  }

  // Выход клиента
  async logoutClient(): Promise<ApiResponse> {
    const result = await this.post('/logout-client')
    sdkClient.clearCsrfCache()
    return result
  }

  // Получение информации о клиенте
  async getClientProfile(): Promise<ApiResponse> {
    return this.get('/client/profile')
  }

  async sendPhoneVerification(phone: string): Promise<ApiResponse> {
    return this.request('/client/verify-phone', { method: 'POST', body: JSON.stringify({ phone }) })
  }

  async confirmPhoneVerification(phone: string, code: string): Promise<ApiResponse> {
    return this.request('/client/confirm-phone', { method: 'POST', body: JSON.stringify({ phone, code }) })
  }

  async joinSalonByCode(code: string): Promise<ApiResponse> {
    return this.post('/client/join-salon', { code })
  }

  async getServices(tenantId: string): Promise<SalonService[]> {
    const response = await this.requestGateway<{ services?: SalonService[] }>('/crm/services', {
      headers: {
        'x-tenant-id': tenantId
      }
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to load services')
    }

    const services = extractArrayFromResponse<SalonService>(response, 'services')

    return services.map(service => {
      const serviceRecord = service as unknown as Record<string, unknown>

      const computedPrice =
        typeof service.price === 'number'
          ? service.price
          : Number(
              (serviceRecord.price as number | string | null | undefined) ??
                (serviceRecord.priceAmount as number | string | null | undefined) ??
                (serviceRecord.price_minor as number | string | null | undefined) ??
                0
            )

      const normalizedCurrency =
        typeof service.currency === 'string' && service.currency.length > 0
          ? service.currency
          : (() => {
              const code = serviceRecord.currencyCode
              if (typeof code === 'string') return code
              if (typeof code === 'number') return code.toString()
              return 'EUR'
            })()

      return {
        ...service,
        price: computedPrice,
        currency: normalizedCurrency
      }
    })
  }

  async getSalonServices(tenantId: string): Promise<SalonService[]> {
    return this.getServices(tenantId)
  }

  async getStaff(tenantId: string, serviceId?: string): Promise<SalonStaffMember[]> {
    const query = new URLSearchParams()
    if (serviceId) {
      query.set('serviceId', serviceId)
    }

    const endpoint = query.toString() ? `/crm/staff?${query.toString()}` : '/crm/staff'
    const response = await this.requestGateway<{ staff?: SalonStaffMember[] }>(endpoint, {
      headers: {
        'x-tenant-id': tenantId
      }
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to load staff')
    }

    return extractArrayFromResponse<SalonStaffMember>(response, 'staff')
  }

  async getSalonStaff(tenantId: string, serviceId?: string): Promise<SalonStaffMember[]> {
    return this.getStaff(tenantId, serviceId)
  }

  async getAvailability(params: {
    tenantId: string
    staffId: string
    date: string
    durationMinutes: number
    bufferMinutes?: number
    signal?: AbortSignal
  }): Promise<AvailabilitySlot[]> {
    const query = new URLSearchParams({
      tenantId: params.tenantId,
      date: params.date,
      serviceDurationMinutes: params.durationMinutes.toString()
    })

    if (params.staffId) {
      query.append('staffId', params.staffId)
    }
    if (typeof params.bufferMinutes === 'number') {
      query.append('bufferMinutes', params.bufferMinutes.toString())
    }

    const endpoint = `/crm/schedule/available-slots?${query.toString()}`
    const requestOptions: ApiRequestOptions = {}

    if (params.signal) {
      requestOptions.signal = params.signal
    }

    const response = await this.requestGateway<{
      slots?: Array<{
        startLocal: string
        endLocal: string
        available: boolean
        unavailableReason?: SlotUnavailabilityReason
      }>
    }>(endpoint, requestOptions)

    if (!response.success) {
      throw new Error(response.error || 'Failed to load availability')
    }

    const slots = response.data?.slots ?? []

    if (!Array.isArray(slots)) {
      return []
    }

    const mapReasonToKey = (reason?: SlotUnavailabilityReason) => {
      switch (reason) {
        case 'APPOINTMENT_CONFLICT':
          return 'schedule.unavailable.appointmentConflict'
        case 'SALON_CLOSED':
          return 'schedule.unavailable.salonClosed'
        case 'STAFF_OFF':
          return 'schedule.unavailable.staffOff'
        case 'OUTSIDE_WORKING_HOURS':
          return 'schedule.unavailable.outsideHours'
        default:
          return undefined
      }
    }

    return slots.map(slot => ({
      time: slot.startLocal,
      endTime: slot.endLocal,
      available: slot.available,
      unavailableReason: slot.unavailableReason,
      reasonKey: mapReasonToKey(slot.unavailableReason)
    }))
  }

  async createAppointment(tenantId: string, payload: CreateAppointmentRequest): Promise<CreatedAppointment> {
    const response = await this.requestGateway<{ appointment?: CreatedAppointment }>('/crm/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId
      },
      body: JSON.stringify(payload)
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to create appointment')
    }

    const appointment =
      extractFieldFromResponse<CreatedAppointment>(response, 'appointment') ??
      extractFieldFromResponse<CreatedAppointment>(response, 'data')

    if (!appointment) {
      throw new Error('Appointment data is missing in response')
    }

    return appointment
  }

  // Обновление профиля клиента
  async updateClientProfile(data: UpdateClientProfilePayload): Promise<ApiResponse> {
    return this.put('/client/profile', data)
  }

  async uploadClientAvatar(file: File, entityId: string): Promise<any> {
    if (!entityId) {
      throw new Error('Entity ID is required to upload avatar')
    }

    const sanitizedEntityId = encodeURIComponent(entityId.trim().toLowerCase())
    const uploadUrl = `${this.getGatewayBaseUrl()}/images/upload?type=client_avatar&entityId=${sanitizedEntityId}`
    const formData = new FormData()
    formData.append('images', file)

    return sdkClient.request(uploadUrl.replace(this.getGatewayBaseUrl(), ''), {
      method: 'POST',
      data: formData
    })
  }

  // Поиск салонов
  async searchSalons(query: string, location?: string): Promise<ApiResponse> {
    const params = new URLSearchParams({ q: query })
    if (location) params.append('location', location)
    return this.get(`/salons/search?${params}`)
  }

  // Получение расписания салона
  async getSalonSchedule(salonId: string, date: string): Promise<ApiResponse> {
    return this.get(`/salons/${salonId}/schedule?date=${date}`)
  }

  // Создание записи
  async createBooking(bookingData: {
    salonId: string
    serviceId: string
    staffId: string
    date: string
    time: string
    notes?: string
  }): Promise<ApiResponse> {
    return this.post('/bookings', bookingData)
  }

  // Получение записей клиента
  async getClientBookings(): Promise<ApiResponse> {
    return this.get('/client/bookings')
  }

  // Отмена записи
  async cancelBooking(bookingId: string, reason?: string): Promise<ApiResponse> {
    if (!reason) {
      return this.delete(`/bookings/${bookingId}`)
    }

    return this.delete(`/bookings/${bookingId}`, {
      body: JSON.stringify({ reason })
    })
  }

  // Получение салонов клиента
  async getMySalons(): Promise<ApiResponse> {
    return this.get('/client/salons')
  }

  // Получение dashboard stats
  async getDashboardStats(): Promise<ApiResponse> {
    return this.get('/client/dashboard')
  }
}

// Экспорт singleton instance
export const clientApi = ClientApiService.getInstance()
