/**
 * Email Templates Export
 * Централизованный экспорт всех email templates для удобного импорта
 */

export {
  generateBookingConfirmationEmail,
  generateBookingConfirmationSubject,
  type BookingConfirmationData,
} from './booking-confirmation';

export {
  generateAppointmentReminderEmail,
  generateAppointmentReminderSubject,
  type AppointmentReminderData,
} from './appointment-reminder';

export {
  generatePaymentReceiptEmail,
  generatePaymentReceiptSubject,
  type PaymentReceiptData,
} from './payment-receipt';