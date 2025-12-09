/**
 * Schedule Management Types (Issue #73)
 * TypeScript types for salon and staff working hours management
 */

/**
 * Enum для типов исключений в расписании
 */
export enum ScheduleExceptionType {
  DAY_OFF = 'DAY_OFF',           // Выходной/отпуск
  SICK_LEAVE = 'SICK_LEAVE',     // Больничный
  CUSTOM_HOURS = 'CUSTOM_HOURS'  // Кастомные часы (работает не по графику)
}

/**
 * Салонный недельный график
 * Хранит локальное время (HH:mm), конвертация в UTC происходит при расчетах
 */
export interface WorkingHourInput {
  dayOfWeek: number        // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string        // HH:mm (local time, e.g., "09:00")
  endTime: string          // HH:mm (local time, e.g., "18:00")
  isWorkingDay: boolean    // false = выходной
}

export interface SalonWorkingHour extends WorkingHourInput {
  id: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

/**
 * Мастерский недельный график (override для салонного графика)
 * Если не задан, используется салонный график
 */
export interface StaffWorkingHour extends WorkingHourInput {
  id: string
  tenantId: string
  staffId: string
  createdAt: string
  updatedAt: string
}

/**
 * Исключение в расписании (отпуска, больничные, кастомные часы)
 */
export interface StaffScheduleException {
  id: string
  tenantId: string
  staffId?: string | null        // null = весь салон закрыт
  startDate: string
  endDate: string
  type: ScheduleExceptionType
  customStartTime?: string | null // HH:mm (only for CUSTOM_HOURS)
  customEndTime?: string | null   // HH:mm (only for CUSTOM_HOURS)
  isWorkingDay?: boolean | null   // true = работает, false = выходной (for CUSTOM_HOURS)
  reason?: string | null
  createdBy?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Enum for reasons why a slot is unavailable
 */
export enum SlotUnavailabilityReason {
  APPOINTMENT_CONFLICT = 'APPOINTMENT_CONFLICT',
  SALON_CLOSED = 'SALON_CLOSED',
  STAFF_OFF = 'STAFF_OFF',
  OUTSIDE_WORKING_HOURS = 'OUTSIDE_WORKING_HOURS'
}

/**
 * Available time slot for booking
 * Возвращается при запросе на доступные слоты
 */
export interface AvailableTimeSlot {
  startLocal: string                           // "HH:mm" in salon timezone
  endLocal: string                             // "HH:mm" in salon timezone
  startUtc: string                             // ISO 8601 datetime in UTC
  endUtc: string                               // ISO 8601 datetime in UTC
  available: boolean                           // true если слот доступен
  unavailableReason?: SlotUnavailabilityReason // Причина недоступности (if available=false)
}

/**
 * Available slots response
 * Ответ от endpoint'а GET /api/crm/schedule/available-slots
 */
export interface AvailableSlotResponse {
  success: boolean
  date: string         // ISO 8601 date (YYYY-MM-DD)
  timezone: string     // e.g., "Europe/Warsaw", "Europe/Moscow"
  slots: AvailableTimeSlot[]
}

/**
 * Staff schedule info (для UI отображения)
 */
export interface StaffScheduleInfo {
  staffId: string
  staffName: string
  staffColor?: string
  workingHours: StaffWorkingHour[]
  exceptions: StaffScheduleException[]
}

/**
 * Salon schedule configuration
 */
export interface SalonScheduleConfig {
  salonId: string
  timezone: string
  workingHours: SalonWorkingHour[]
  staffSchedules: StaffScheduleInfo[]
}

export interface StaffScheduleApiResponse {
  success: boolean
  data: {
    staffId: string
    staffName: string
    workingHours: StaffWorkingHour[]
    exceptions: StaffScheduleException[]
  }
}

/**
 * Helper function to get day name (English)
 */
export const getDayName = (dayOfWeek: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek] || 'Unknown'
}

/**
 * Helper function to get day name (Russian)
 */
export const getDayNameRu = (dayOfWeek: number): string => {
  const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
  return days[dayOfWeek] || 'Неизвестно'
}

/**
 * Helper function to get day name (Polish)
 */
export const getDayNamePl = (dayOfWeek: number): string => {
  const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']
  return days[dayOfWeek] || 'Nieznany'
}

/**
 * Helper function to check if time slot is valid (HH:mm format)
 */
export const isValidTimeFormat = (time: string): boolean => {
  const pattern = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/
  return pattern.test(time)
}

/**
 * Helper function to convert time string to minutes since midnight
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Helper function to convert minutes since midnight to time string
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * Helper function to check if time range is valid
 */
export const isValidTimeRange = (startTime: string, endTime: string): boolean => {
  if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
    return false
  }
  return timeToMinutes(startTime) < timeToMinutes(endTime)
}

/**
 * Helper function to get human-readable reason for slot unavailability
 */
export const getSlotUnavailabilityMessage = (
  reason?: SlotUnavailabilityReason
): string => {
  switch (reason) {
    case SlotUnavailabilityReason.APPOINTMENT_CONFLICT:
      return 'Занято другой записью'
    case SlotUnavailabilityReason.SALON_CLOSED:
      return 'Салон закрыт'
    case SlotUnavailabilityReason.STAFF_OFF:
      return 'Мастер недоступен'
    case SlotUnavailabilityReason.OUTSIDE_WORKING_HOURS:
      return 'За пределами рабочих часов'
    default:
      return 'Недоступно'
  }
}

/**
 * API Request/Response types
 */
export interface GetAvailableSlotsRequest {
  date: string                    // YYYY-MM-DD
  staffId?: string               // Optional: specific staff member
  serviceDurationMinutes: number  // Service duration in minutes
  bufferMinutes?: number          // Buffer between appointments (default: 0)
}

export type WorkingHoursPayload = WorkingHourInput[]

export interface SalonWorkingHoursResponse {
  success: boolean
  data: SalonWorkingHour[]
}

export interface UpdateWorkingHoursResponse extends SalonWorkingHoursResponse {
  message?: string
}

export interface StaffScheduleResponse {
  success: boolean
  data: {
    staffId: string
    staffName: string
    workingHours: StaffWorkingHour[]
    exceptions: StaffScheduleException[]
  }
}
