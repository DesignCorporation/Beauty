/**
 * Типы для детальной страницы записи (AppointmentDetailsPage)
 *
 * Объединяет данные о записи, клиенте, услугах, платежах и истории
 */

/**
 * Статусы записи
 */
export enum AppointmentStatus {
  Draft = 'DRAFT',
  Confirmed = 'CONFIRMED',
  InProgress = 'IN_PROGRESS',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
  NoShow = 'NO_SHOW',
}

/**
 * Каналы коммуникации
 */
export enum CommunicationChannel {
  Email = 'EMAIL',
  SMS = 'SMS',
  WhatsApp = 'WHATSAPP',
  Phone = 'PHONE',
  InApp = 'IN_APP',
}

/**
 * Статусы уведомлений
 */
export enum NotificationStatus {
  Sent = 'SENT',
  Pending = 'PENDING',
  Failed = 'FAILED',
  Bounced = 'BOUNCED',
  Opened = 'OPENED',
  Clicked = 'CLICKED',
}

/**
 * Типы событий в активити-таймлайне
 */
export enum ActivityEventType {
  Created = 'CREATED',
  Updated = 'UPDATED',
  StatusChanged = 'STATUS_CHANGED',
  Confirmed = 'CONFIRMED',
  Started = 'STARTED',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
  RescheduleRequested = 'RESCHEDULE_REQUESTED',
  RescheduleApproved = 'RESCHEDULE_APPROVED',
  EmailSent = 'EMAIL_SENT',
  SMSSent = 'SMS_SENT',
  NotificationSent = 'NOTIFICATION_SENT',
  PaymentReceived = 'PAYMENT_RECEIVED',
  PaymentFailed = 'PAYMENT_FAILED',
  RefundIssued = 'REFUND_ISSUED',
  NoteAdded = 'NOTE_ADDED',
  NoteUpdated = 'NOTE_UPDATED',
}

/**
 * Причины отмены записи
 */
export enum CancellationReason {
  ClientRequested = 'CLIENT_REQUESTED',
  SalonRequested = 'SALON_REQUESTED',
  StaffUnavailable = 'STAFF_UNAVAILABLE',
  ClientNoShow = 'CLIENT_NO_SHOW',
  EquipmentFailure = 'EQUIPMENT_FAILURE',
  Other = 'OTHER',
}

/**
 * Информация о клиенте для записи
 */
export interface AppointmentClientInfo {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  avatar?: string
  birthDate?: Date
  loyaltyTier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
  totalVisits: number
  lastVisitAt?: Date
  notes?: string
}

/**
 * Информация об услуге в записи
 */
export interface AppointmentServiceInfo {
  id: string
  appointmentServiceId?: string
  serviceId?: string
  name: string
  description?: string
  durationMinutes: number
  price: number
  currency: string
  category?: string
  image?: string
}

/**
 * Информация о мастере в записи
 */
export interface AppointmentStaffInfo {
  id: string
  firstName: string
  lastName: string
  role: string
  avatar?: string
  rating?: number
  reviewCount?: number
  color?: string
  sequenceOrder?: number
}

/**
 * Информация о платеже
 */
export interface PaymentInfo {
  id: string
  status: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED'
  amount: number
  currency: string
  method: 'CARD' | 'CASH' | 'BANK_TRANSFER'
  transactionId?: string
  paidAt?: Date
  refundedAt?: Date
  notes?: string
}

/**
 * Информация об уведомлении/коммуникации
 */
export interface CommunicationLog {
  id: string
  type: CommunicationChannel
  status: NotificationStatus
  template: string
  sentAt?: Date
  deliveredAt?: Date
  openedAt?: Date
  failureReason?: string
  metadata?: Record<string, unknown>
}

/**
 * Событие в активити-таймлайне
 */
export interface ActivityEvent {
  id: string
  type: ActivityEventType
  createdAt: Date
  createdBy: {
    id: string
    firstName: string
    lastName: string
    role: string
  }
  changes?: Record<string, { from: unknown; to: unknown }>
  metadata?: Record<string, unknown>
  description: string
}
export interface GenericEntity {
  id: string
  name?: string
}

/**
 * Заметка в записи
 */
export interface AppointmentNote {
  id: string
  content: string
  type: 'SALON_NOTE' | 'STAFF_NOTE' | 'INTERNAL_NOTE'
  createdBy: {
    id: string
    firstName: string
    lastName: string
    role: string
  }
  createdAt: Date
  updatedAt: Date
}

/**
 * Главный объект для детальной страницы записи
 */
export interface AppointmentDetails {
  // Основные данные записи
  id: string
  appointmentNumber: string
  status: AppointmentStatus
  createdAt: Date
  updatedAt: Date

  // Расписание
  startAt: Date
  endAt: Date
  durationMinutes: number
  cancelledAt?: Date
  cancelledReason?: CancellationReason
  cancelledBy?: string
  rescheduleRequestedAt?: Date
  rescheduleReason?: string

  // Клиент
  client: AppointmentClientInfo

  // Услуги (может быть несколько)
  services: AppointmentServiceInfo[]
  totalDuration: number
  totalPrice: number
  currency: string

  // Мастер
  staff: AppointmentStaffInfo
  staffMembers?: AppointmentStaffInfo[]

  // Финансы
  payments: PaymentInfo[]
  outstandingBalance: number
  loyaltyPointsUsed?: number
  loyaltyPointsEarned?: number
  discount?: {
    type: 'PERCENTAGE' | 'FIXED'
    value: number
    reason?: string
  }

  // Коммуникация
  communicationLogs: CommunicationLog[]

  // Салон информация
  salonName: string
  salonAddress?: string
  roomNumber?: string
  googleMeetLink?: string
  timezone?: string

  // Заметки
  notes: AppointmentNote[]

  // Активити
  activityEvents: ActivityEvent[]

  // Метаданные
  source?: 'WALK_IN' | 'ONLINE' | 'PHONE' | 'GOOGLE_CALENDAR' | 'IMPORT'
  tags?: string[]
  customFields?: Record<string, unknown>
}

/**
 * Результат загрузки деталей записи
 */
export interface AppointmentDetailsResult {
  data: AppointmentDetails | null
  error: string | null
  isLoading: boolean
  isFetching: boolean
  refetch: () => Promise<void>
  invalidate: () => void
}

/**
 * Входные параметры для хука useAppointmentDetails
 */
export interface UseAppointmentDetailsParams {
  appointmentId: string
  enabled?: boolean
  refetchInterval?: number
}

/**
 * Ошибки которые может возвращать хук
 */
export interface AppointmentDetailsError {
  code: string
  message: string
  status?: number
  details?: Record<string, unknown>
}

/**
 * Опции для редактирования записи
 */
export interface AppointmentEditOptions {
  mode: 'inline' | 'modal' | 'sidebar'
  section?: 'client' | 'services' | 'schedule' | 'staff' | 'notes' | 'payment'
  readOnly?: boolean
}

/**
 * Результат обновления записи
 */
export interface UpdateAppointmentResult {
  success: boolean
  data?: AppointmentDetails
  error?: AppointmentDetailsError
}
