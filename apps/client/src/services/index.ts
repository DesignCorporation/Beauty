// Экспорт всех сервисов Client Portal
export { clientApi, ClientApiService } from './api'
export { sdkClient } from './sdkClient'
export type {
  SalonService,
  SalonStaffMember,
  AvailabilitySlot,
  SlotUnavailabilityReason,
  CreateAppointmentRequest,
  UpdateClientProfilePayload,
  CreatedAppointment
} from './api'

// Type definitions for common API responses
export interface ClientProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  avatar?: string
  preferences?: {
    language: string
    notifications: boolean
    reminders: boolean
  }
}

export interface Salon {
  id: string
  name: string
  description?: string
  address: string
  phone: string
  email?: string
  website?: string
  rating?: number
  images?: string[]
  services: Service[]
  workingHours: WorkingHours[]
}

export interface Service {
  id: string
  name: string
  description?: string
  duration: number // в минутах
  price: number
  category: string
}

export interface WorkingHours {
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  isOpen: boolean
  startTime?: string // HH:mm
  endTime?: string // HH:mm
}

export interface Booking {
  id: string
  appointmentNumber: string
  salonId: string
  salon: {
    id: string
    name: string
    address?: string | null
    phone?: string | null
    currency: string
  }
  serviceId?: string
  service: {
    id: string
    name: string
    duration: number
    price: number
    currency: string
  } | null
  staffId?: string | null
  staff: {
    id: string
    name: string
    avatar?: string | null
  } | null
  startTime: string
  endTime: string
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  notes?: string | null
  createdAt: string
  updatedAt: string
}

// Error types
export interface ApiError {
  message: string
  code?: string
  details?: any
}
