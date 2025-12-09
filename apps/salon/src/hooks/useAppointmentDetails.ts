/**
 * useAppointmentDetails
 *
 * Хук для загрузки полной информации о записи
 * Объединяет данные из нескольких API endpoints
 */

import { useState, useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  AppointmentDetails,
  AppointmentDetailsResult,
  UseAppointmentDetailsParams,
  ActivityEvent,
  CommunicationLog,
  AppointmentStatus,
  CancellationReason,
  AppointmentServiceInfo,
  PaymentInfo,
  AppointmentNote,
  AppointmentStaffInfo,
} from '../types/appointment-details'
import type { AppointmentService } from '../types/appointment'
import { CRMApiService } from '../services/crmApiNew'

/**
 * Основной хук для получения деталей записи
 */
export function useAppointmentDetails(
  appointmentIdParam?: string,
  options: Partial<UseAppointmentDetailsParams> = {}
): AppointmentDetailsResult {
  const { id: routeId } = useParams<{ id: string }>()
  const appointmentId = appointmentIdParam || routeId

  const [data, setData] = useState<AppointmentDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)

  /**
   * Функция для загрузки полной информации о записи
   */
  const fetchAppointmentDetails = useCallback(async (): Promise<void> => {
    if (!appointmentId) return

    try {
      setIsFetching(true)
      setError(null)

      // Используем прямой endpoint для получения полной информации о записи
      const response = await CRMApiService.getAppointmentById(appointmentId)

      if (!response?.success || !response.appointment) {
        throw new Error(`Failed to load appointment with ID ${appointmentId}`)
      }

      // Нормализуем формат данных
      const rawAppointment = response.appointment as Record<string, unknown>
      if (!rawAppointment || typeof rawAppointment !== 'object') {
        throw new Error('Invalid appointment data received from API')
      }
      const normalized = normalizeAppointmentData(rawAppointment)

      // Загружаем дополнительные данные параллельно (если они доступны через API)
      const [activityEvents, communicationLogs] = await Promise.all([
        fetchActivityEvents(),
        fetchCommunicationLogs(),
      ]).catch(() => [[], []])

      setData({
        ...normalized,
        activityEvents: activityEvents || [],
        communicationLogs: communicationLogs || [],
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load appointment details'
      setError(errorMessage)
    } finally {
      setIsFetching(false)
    }
  }, [appointmentId])

  /**
   * Загружаем данные при монтировании или смене ID
   */
  useEffect((): void => {
    if (!appointmentId) {
      setError('Appointment ID is required')
      setData(null)
      return
    }

    if (options.enabled !== false) {
      setIsLoading(true)
      void fetchAppointmentDetails().finally(() => setIsLoading(false))
    }
  }, [appointmentId, options.enabled, fetchAppointmentDetails])

  /**
   * Функция для ручного обновления
   */
  const refetch = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    try {
      await fetchAppointmentDetails()
    } finally {
      setIsLoading(false)
    }
  }, [fetchAppointmentDetails])

  /**
   * Функция для инвалидирования кэша (заглушка)
   */
  const invalidate = useCallback((): void => {
    setData(null)
    setError(null)
  }, [])

  return {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
    invalidate,
  }
}

/**
 * Helper функция для безопасного создания Date объектов
 */
function safeDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  try {
    const date = new Date(value as string | number | Date);
    if (isNaN(date.getTime())) {
      return undefined;
    }
    return date;
  } catch {
    return undefined;
  }
}

const toStringSafe = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value
  if (value === undefined || value === null) return fallback
  return String(value)
}

const toOptionalString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined
}

const toNumberSafe = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const normalizePaymentStatus = (value: unknown): 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED' => {
  const status = typeof value === 'string' ? value.toUpperCase() : ''
  if (status === 'PAID' || status === 'REFUNDED' || status === 'FAILED') return status
  return 'PENDING'
}

const normalizePaymentMethod = (value: unknown): PaymentInfo['method'] => {
  const method = typeof value === 'string' ? value.toUpperCase() : ''
  if (method === 'CASH' || method === 'BANK_TRANSFER') {
    return method
  }
  return 'CARD'
}

const normalizeSource = (value: unknown): AppointmentDetails['source'] => {
  const source = typeof value === 'string' ? value.toUpperCase() : ''
  const allowed: AppointmentDetails['source'][] = ['WALK_IN', 'ONLINE', 'PHONE', 'GOOGLE_CALENDAR', 'IMPORT']
  return (allowed.includes(source as AppointmentDetails['source']) ? source : undefined) as AppointmentDetails['source']
}

const normalizeDiscount = (value: unknown): AppointmentDetails['discount'] => {
  if (!value || typeof value !== 'object') return undefined
  const discount = value as Record<string, unknown>
  const type = typeof discount.type === 'string' && (discount.type === 'PERCENTAGE' || discount.type === 'FIXED')
    ? discount.type
    : undefined
  const safeValue = toOptionalNumber(discount.value)
  if (!type || safeValue === undefined) return undefined
  return {
    type,
    value: safeValue,
    reason: toOptionalString(discount.reason)
  }
}

/**
 * Нормализует данные записи из API
 */
function normalizeAppointmentData(rawData: Record<string, unknown>): AppointmentDetails {
  // Поддержка обоих форматов: от календаря (extendedProps) и от чистого API ответа
  const props = (rawData.extendedProps as Record<string, unknown>) || rawData;

  const combineDateAndTime = (dateValue: unknown, timeValue: unknown): Date | undefined => {
    if (!dateValue || !timeValue) return undefined;

    const dateStr = typeof dateValue === 'string' ? dateValue : String(dateValue);
    const timeStr = typeof timeValue === 'string' ? timeValue : String(timeValue);

    const combined = new Date(`${dateStr}T${timeStr}`);
    return isNaN(combined.getTime()) ? undefined : combined;
  };

  const resolveDate = (values: Array<unknown>): Date | undefined => {
    for (const value of values) {
      const parsed = safeDate(value);
      if (parsed) return parsed;
    }
    return undefined;
  };

  const startAt =
    resolveDate([
      rawData.startAt,
      rawData.start,
      rawData.startTime,
      props.startAt,
      props.start,
      props.startTime,
      combineDateAndTime(props.date ?? rawData.date ?? rawData.startDate, props.startTime ?? rawData.startTime ?? rawData.time)
    ]) ?? safeDate(rawData.createdAt) ?? new Date();

  const durationFromPayload = toNumberSafe(rawData.durationMinutes ?? props.durationMinutes, 0);

  const endAt =
    resolveDate([
      rawData.endAt,
      rawData.end,
      rawData.endTime,
      props.endAt,
      props.end,
      props.endTime,
      combineDateAndTime(props.date ?? rawData.date ?? rawData.startDate, props.endTime ?? rawData.endTime ?? rawData.timeEnd)
    ]) ??
    (durationFromPayload && startAt
      ? new Date(startAt.getTime() + durationFromPayload * 60 * 1000)
      : startAt);

  const appointmentId = (rawData.id as string | undefined) || '';
  const appointmentNumber = ((props.appointmentNumber || rawData.appointmentNumber) as string | undefined) || '';
  const statusStr = ((props.status || rawData.status) as string | undefined) || 'PENDING';
  const cancelledReasonStr = (rawData.cancelledReason as string | undefined) || undefined;
  const cancelledBy = (rawData.cancelledBy as string | undefined) || undefined;
  const rescheduleReason = (rawData.rescheduleReason as string | undefined) || undefined;
  const currency = toStringSafe(rawData.currency, 'PLN')

  const normalizeStatusValue = (value: string): AppointmentStatus => {
    const status = value.toUpperCase()
    switch (status) {
      case 'DRAFT':
        return AppointmentStatus.Draft
      case 'CONFIRMED':
        return AppointmentStatus.Confirmed
      case 'IN_PROGRESS':
        return AppointmentStatus.InProgress
      case 'COMPLETED':
        return AppointmentStatus.Completed
      case 'CANCELLED':
        return AppointmentStatus.Cancelled
      case 'NO_SHOW':
        return AppointmentStatus.NoShow
      default:
        return AppointmentStatus.Confirmed
    }
  }

  const normalizeService = (service: unknown): AppointmentServiceInfo => {
    const record = (service ?? {}) as Record<string, unknown>
    const serviceId = toStringSafe(record.serviceId, '') || toStringSafe(record.id, '')
    return {
      id: serviceId,
      appointmentServiceId: toOptionalString(record.id),
      serviceId,
      name: toStringSafe(record.name, ''),
      description: toOptionalString(record.description),
      durationMinutes: toNumberSafe(record.durationMinutes ?? record.duration, 0),
      price: toNumberSafe(record.price, 0),
      currency: toStringSafe(record.currency, currency),
      category: toOptionalString(record.category),
      image: toOptionalString(record.image),
    }
  }

  const normalizePayment = (payment: unknown): PaymentInfo => {
    const record = (payment ?? {}) as Record<string, unknown>
    return {
      id: toStringSafe(record.id, ''),
      status: normalizePaymentStatus(record.status),
      amount: toNumberSafe(record.amount, 0),
      currency: toStringSafe(record.currency, currency),
      method: normalizePaymentMethod(record.method),
      transactionId: toOptionalString(record.transactionId),
      paidAt: safeDate(record.paidAt),
      refundedAt: safeDate(record.refundedAt),
      notes: toOptionalString(record.notes)
    }
  }

  const normalizeNote = (note: unknown): AppointmentNote => {
    const record = (note ?? {}) as Record<string, unknown>
    const createdBy = (record.createdBy ?? {}) as Record<string, unknown>
    return {
      id: toStringSafe(record.id, ''),
      content: toStringSafe(record.content, ''),
      type: (toStringSafe(record.type, 'SALON_NOTE') as AppointmentNote['type']),
      createdBy: {
        id: toStringSafe(createdBy.id, ''),
        firstName: toStringSafe(createdBy.firstName, ''),
        lastName: toStringSafe(createdBy.lastName, ''),
        role: toStringSafe(createdBy.role, '')
      },
      createdAt: safeDate(record.createdAt) || new Date(),
      updatedAt: safeDate(record.updatedAt) || new Date(),
    }
  }

  // Type assertions for objects
  const propsClient = props.client as Record<string, unknown> | undefined;
  const rawClient = rawData.client as Record<string, unknown> | undefined;
  const propsStaff = props.staff as Record<string, unknown> | undefined;
  const rawStaff = rawData.staff as Record<string, unknown> | undefined;
  const _rawStaffMembers = (rawData.staffMembers || props.staffMembers) as Array<Record<string, unknown>> | undefined;

  const servicesSource: AppointmentService[] = (
    Array.isArray(rawData.services)
      ? (rawData.services as AppointmentService[])
      : Array.isArray(props.services)
        ? (props.services as AppointmentService[])
        : props.service || rawData.service
          ? [props.service || (rawData.service as AppointmentService)]
          : []
  ) as AppointmentService[];

  const services = servicesSource.map(normalizeService)

  const normalizeStaff = (staff: Record<string, unknown>): AppointmentStaffInfo => {
    const roleRaw = toOptionalString(staff.role);
    const sequenceOrder = toOptionalNumber(staff.sequenceOrder) ?? 0;
    const mapLegacyRole = (value?: string): string | undefined => {
      if (!value) return undefined;
      const normalized = value.toUpperCase();
      if (normalized === 'PRIMARY') return 'SALON_OWNER';
      if (normalized === 'STAFF' || normalized === 'STAFF_MEMBER') return 'STAFF_MEMBER';
      if (normalized === 'RECEPTIONIST') return 'RECEPTIONIST';
      if (normalized === 'MANAGER') return 'MANAGER';
      if (normalized === 'SALON_OWNER') return 'SALON_OWNER';
      return normalized;
    };
    const role = mapLegacyRole(roleRaw) || (sequenceOrder === 0 ? 'SALON_OWNER' : 'STAFF_MEMBER');
    return {
      id: toStringSafe(staff.id || staff.staffId, ''),
      firstName: toStringSafe(staff.firstName, ''),
      lastName: toStringSafe(staff.lastName, ''),
      role,
      avatar: toOptionalString(staff.avatar),
      rating: toOptionalNumber(staff.rating),
      reviewCount: toOptionalNumber(staff.reviewCount),
      color: toOptionalString(staff.color),
      sequenceOrder: sequenceOrder ?? undefined
    };
  };

  const staffMembers: AppointmentStaffInfo[] = Array.isArray(_rawStaffMembers)
    ? (_rawStaffMembers as Array<Record<string, unknown>>).map(member => normalizeStaff(member || {}))
    : [];
  const primaryStaffRecord = staffMembers[0];

  return {
    // Основные данные
    id: appointmentId,
    appointmentNumber,
    status: normalizeStatusValue(statusStr),
    createdAt: safeDate(rawData.createdAt) || new Date(),
    updatedAt: safeDate(rawData.updatedAt) || new Date(),

    // Расписание
    startAt,
    endAt,
    durationMinutes: calculateDuration(startAt, endAt),
    totalDuration: toNumberSafe(rawData.totalDuration ?? props.totalDuration, calculateDuration(startAt, endAt)),
    totalPrice: toNumberSafe(rawData.totalPrice ?? props.totalPrice, calculateTotalPrice(servicesSource as unknown[])),
    currency,
    cancelledAt: safeDate(rawData.cancelledAt),
    cancelledReason: cancelledReasonStr ? (cancelledReasonStr as CancellationReason) : undefined,
    cancelledBy,
    rescheduleRequestedAt: safeDate(rawData.rescheduleRequestedAt),
    rescheduleReason,

    // Клиент
    client: {
      id: String(propsClient?.id || rawClient?.id || rawData.clientId || ''),
      firstName: String((propsClient?.name as string | undefined)?.split(' ')[0] || propsClient?.firstName || rawClient?.firstName || 'Unknown'),
      lastName: String((propsClient?.name as string | undefined)?.split(' ')[1] || propsClient?.lastName || rawClient?.lastName || ''),
      email: (propsClient?.email as string | undefined) || (rawClient?.email as string | undefined),
      phone: (propsClient?.phone as string | undefined) || (rawClient?.phone as string | undefined),
      avatar: (propsClient?.avatarUrl as string | undefined) || (propsClient?.avatar as string | undefined) || (rawClient?.avatar as string | undefined) || (rawData.clientAvatarUrl as string | undefined),
      birthDate: safeDate(propsClient?.birthDate || rawClient?.birthDate),
      loyaltyTier: (propsClient?.loyaltyTier || rawClient?.loyaltyTier || rawData.loyaltyTier) as 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | undefined,
      totalVisits: Number(propsClient?.totalVisits || rawClient?.totalVisits || rawData.totalVisits || 0),
      lastVisitAt: safeDate(propsClient?.lastVisitAt || rawClient?.lastVisitAt || rawData.lastVisitAt),
      notes: (propsClient?.notes as string | undefined) || (rawClient?.notes as string | undefined) || (rawData.clientNotes as string | undefined),
    },

    // Услуги (поддержка service singular и services plural)
    services,

    // Мастер
    staff: primaryStaffRecord ?? {
      id: String(propsStaff?.id || rawStaff?.id || rawData.staffId || ''),
      firstName: String(propsStaff?.firstName || rawStaff?.firstName || 'Unknown'),
      lastName: String(propsStaff?.lastName || rawStaff?.lastName || ''),
      role: String(propsStaff?.role || rawStaff?.role || 'Staff'),
      avatar: (propsStaff?.avatar as string | undefined) || (rawStaff?.avatar as string | undefined),
      rating: (propsStaff?.rating as number | undefined) || (rawStaff?.rating as number | undefined),
      reviewCount: (propsStaff?.reviewCount as number | undefined) || (rawStaff?.reviewCount as number | undefined),
      color: String(propsStaff?.color || rawStaff?.color || '#818cf8'),
    },
    staffMembers: staffMembers.length ? staffMembers : undefined,

    // Финансы
    // NOTE: payments API endpoint at /calendar doesn't include payment details yet
    // If you need payment details, use a direct GET /appointments/:id endpoint
    payments: Array.isArray(rawData.payments)
      ? (rawData.payments as unknown[]).map(normalizePayment)
      : [],
    outstandingBalance: toNumberSafe(rawData.outstandingBalance, 0),
    loyaltyPointsUsed: toOptionalNumber(rawData.loyaltyPointsUsed),
    loyaltyPointsEarned: toOptionalNumber(rawData.loyaltyPointsEarned),
    discount: normalizeDiscount(rawData.discount),

    // Коммуникация (будет заполнена отдельно)
    communicationLogs: [],

    // Салон информация
    salonName: toStringSafe(rawData.salonName, ''),
    salonAddress: toOptionalString(rawData.salonAddress),
    roomNumber: toOptionalString(rawData.roomNumber),
    googleMeetLink: toOptionalString(rawData.googleMeetLink),
    timezone: toOptionalString(rawData.timezone ?? props.timezone),

    // Заметки (будет заполнена отдельно)
    notes: Array.isArray(rawData.notes)
      ? (rawData.notes as unknown[]).map(normalizeNote)
      : [],

    // Активити (будет заполнена отдельно)
    activityEvents: [],

    // Метаданные
    source: normalizeSource(rawData.source),
    tags: Array.isArray(rawData.tags) ? (rawData.tags as unknown[]).map((tag) => toStringSafe(tag)).filter(Boolean) : undefined,
    customFields: rawData.customFields && typeof rawData.customFields === 'object' ? (rawData.customFields as Record<string, unknown>) : undefined,
  }
}

/**
 * Загружает события активности для записи
 *
 * TODO: Когда будет endpoint GET /appointments/:id/activity, реализовать загрузку
 * Сейчас эта функция возвращает пустой массив, так как endpoint не существует
 */
async function fetchActivityEvents(): Promise<ActivityEvent[]> {
  try {
    // TODO: Implement when API endpoint is available
    // const response = await CRMApiService.getAppointmentActivity(appointmentId)
    return [];
  } catch {
    return [];
  }
}

/**
 * Загружает логи коммуникации для записи
 *
 * TODO: Когда будет endpoint GET /appointments/:id/communications, реализовать загрузку
 * Сейчас эта функция возвращает пустой массив, так как endpoint не существует
 */
async function fetchCommunicationLogs(): Promise<CommunicationLog[]> {
  try {
    // TODO: Implement when API endpoint is available
    // const response = await CRMApiService.getAppointmentCommunications(appointmentId)
    return [];
  } catch {
    return [];
  }
}

/**
 * Утилиты
 */

function calculateDuration(startAt: string | Date, endAt: string | Date): number {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  return Math.round((end - start) / (1000 * 60)); // в минутах
}

function calculateTotalPrice(services: unknown[]): number {
  if (!Array.isArray(services)) return 0;
  return services.reduce((sum: number, s: unknown): number => {
    const service = s as Record<string, unknown>;
    const price = service.price ? parseFloat(String(service.price)) : 0;
    return sum + (isNaN(price) ? 0 : price);
  }, 0);
}
