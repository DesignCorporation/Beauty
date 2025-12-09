/**
 * Issue #79: Multiple Services per Appointment
 * Frontend TypeScript types synchronized with backend API
 */

/**
 * Service snapshot in an appointment
 */
export interface AppointmentService {
  id: string;
  serviceId: string | null;
  name: string;
  price: number;
  duration: number;        // minutes
  currency: string;
  createdAt: string;       // ISO date
  updatedAt: string;
}

/**
 * Full appointment with multiple services
 * Used for detail views and edit forms
 */
export interface Appointment {
  id: string;
  appointmentNumber: string;
  tenantId: string;

  // Timing
  date: string;            // ISO date string
  startAt: string;         // ISO datetime (UTC)
  endAt: string;           // ISO datetime (calculated)

  // Client
  clientId: string;
  clientName?: string;

  // Staff
  assignedToId?: string | null;
  staffName?: string;

  // Multiple services (Issue #79)
  services: AppointmentService[];
  totalDuration: number;   // minutes
  totalPrice: number;      // decimal
  currency: string;

  // Status
  status: AppointmentStatus;
  notes?: string;

  // Payment
  paymentMethod: 'CARD' | 'CASH';
  paymentStatus: PaymentStatus;
  paymentId?: string | null;

  // Metadata
  createdById?: string | null;
  createdAt: string;       // ISO datetime
  updatedAt: string;
}

/**
 * Appointment for calendar/list display
 * Compact format optimized for rendering
 */
export interface AppointmentListItem {
  id: string;
  appointmentNumber: string;
  clientId: string;
  clientName: string;
  staffId: string;
  staffName: string;
  staffColor?: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;

  // Services display
  services: Array<{
    id: string;
    name: string;
    price: number;
    duration: number;
  }>;
  totalPrice: number;
  totalDuration: number;
  currency: string;

  notes?: string;
  paymentStatus?: PaymentStatus;
}

/**
 * Form data for creating/editing appointment
 */
export interface AppointmentFormData {
  clientId?: string;
  clientEmail?: string;
  clientData?: {
    firstName: string;
    lastName: string;
    phone?: string;
    birthdate?: string;
  };
  serviceIds: string[];         // NEW: Multiple services
  staffIds: string[];           // Multiple staff
  staffId?: string;             // Primary (for backward compatibility)
  startAt: string;              // ISO datetime
  status?: AppointmentStatus;
  notes?: string;
}

/**
 * Appointment status enum
 */
export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

/**
 * Payment status enum
 */
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

/**
 * API Response types
 */
export interface AppointmentResponse {
  success: boolean;
  data?: Appointment;
  error?: string;
}

export interface AppointmentsListResponse {
  success: boolean;
  data?: AppointmentListItem[];
  total?: number;
  error?: string;
}
