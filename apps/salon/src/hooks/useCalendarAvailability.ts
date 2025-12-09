import { useCallback, useMemo } from 'react'
import { useAvailableSlots } from './useAvailableSlots'
import type { SlotUnavailabilityReason } from '../types/schedule'
import { debugLog } from '../utils/debug'

export interface CalendarSlotAvailability {
  isAvailable: boolean
  unavailabilityReason?: SlotUnavailabilityReason
  message?: string
  messageKey?: string
}

export interface UseCalendarAvailabilityParams {
  date?: string // YYYY-MM-DD
  serviceDurationMinutes?: number
  staffId?: string
  bufferMinutes?: number
}

/**
 * Hook для интеграции available-slots API с календарной сеткой.
 * Возвращает информацию о доступности каждого временного слота.
 */
export const useCalendarAvailability = (params?: Partial<UseCalendarAvailabilityParams>): {
  slots: ReturnType<typeof useAvailableSlots>['slots'];
  timezone: string;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  checkSlotAvailability: (dateStr: string, hour: number, minute: number) => CalendarSlotAvailability;
  getAvailableSlots: () => ReturnType<typeof useAvailableSlots>['slots'];
  getUnavailabilityReasons: SlotUnavailabilityReason[];
} => {
  // Используем hook для загрузки реальных доступных слотов
  const { slots, timezone, loading, error, refetch } = useAvailableSlots(params)

  /**
   * Проверяет доступность конкретного временного слота
   * @param date Дата в формате YYYY-MM-DD
   * @param hour Час (0-23)
   * @param minute Минута (0-59)
   * @returns Информация о доступности слота
   */
  const checkSlotAvailability = useCallback(
    (dateStr: string, hour: number, minute: number): CalendarSlotAvailability => {
      if (!params?.date || params.date !== dateStr) {
        // Если запрашиваем для другой даты, не можем проверить
        return {
          isAvailable: false,
          messageKey: 'schedule.availability.dateMismatch'
        }
      }

      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

      // Ищем слот в ответе от API
      const matchingSlot = slots.find(slot => slot.startLocal === timeStr)

      if (!matchingSlot) {
        // Слот не в списке доступных - значит недоступен
        debugLog('[useCalendarAvailability] Slot not found in available slots', { dateStr, timeStr })
        return {
          isAvailable: false,
          messageKey: 'schedule.availability.slotNotFound'
        }
      }

      if (matchingSlot.available) {
        return {
          isAvailable: true
        }
      }

      // Слот недоступен - возвращаем причину
      const reason = matchingSlot.unavailableReason as SlotUnavailabilityReason | undefined
      return {
        isAvailable: false,
        unavailabilityReason: reason,
        message: reason || 'Unavailable',
        messageKey: getSlotUnavailabilityTranslationKey(reason)
      }
    },
    [slots, params?.date]
  )

  /**
   * Получает все доступные слоты для календаря
   */
  const getAvailableSlots = useCallback(() => {
    return slots
  }, [slots])

  /**
   * Получает причины недоступности для визуализации
   */
  const getUnavailabilityReasons = useMemo(() => {
    const reasons = new Set<SlotUnavailabilityReason>()

    slots.forEach(slot => {
      if (!slot.available && slot.unavailableReason) {
        reasons.add(slot.unavailableReason as SlotUnavailabilityReason)
      }
    })

    return Array.from(reasons)
  }, [slots])

  return {
    slots,
    timezone,
    loading,
    error,
    refetch,
    checkSlotAvailability,
    getAvailableSlots,
    getUnavailabilityReasons
  }
}

/**
 * Helper функция для визуализации причины недоступности
 */
export const getSlotUnavailabilityColor = (reason?: SlotUnavailabilityReason): string => {
  switch (reason) {
    case 'APPOINTMENT_CONFLICT':
      return 'bg-orange-100 border-orange-300 text-orange-900' // Оранжевый - конфликт
    case 'SALON_CLOSED':
      return 'bg-red-100 border-red-300 text-red-900' // Красный - салон закрыт
    case 'STAFF_OFF':
      return 'bg-yellow-100 border-yellow-300 text-yellow-900' // Желтый - мастер недоступен
    case 'OUTSIDE_WORKING_HOURS':
      return 'bg-gray-100 border-gray-300 text-gray-900' // Серый - вне часов
    default:
      return 'bg-gray-50 border-gray-200 text-gray-700'
  }
}

/**
 * Helper функция для иконки причины недоступности
 */
export const getSlotUnavailabilityIcon = (reason?: SlotUnavailabilityReason): string => {
  switch (reason) {
    case 'APPOINTMENT_CONFLICT':
      return '📋' // Записей
    case 'SALON_CLOSED':
      return '🚫' // Закрыто
    case 'STAFF_OFF':
      return '🏖️' // Отпуск/больничный
    case 'OUTSIDE_WORKING_HOURS':
      return '⏰' // Время
    default:
      return '❌'
  }
}

/**
 * Перевод причин недоступности (используется с i18n)
 */
export const getSlotUnavailabilityTranslationKey = (reason?: SlotUnavailabilityReason): string => {
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
      return 'schedule.unavailable.default'
  }
}
