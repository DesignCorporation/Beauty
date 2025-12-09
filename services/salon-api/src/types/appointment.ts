/**
 * Issue #79: Multiple Services per Appointment
 * TypeScript type definitions for the new M:N appointment-services architecture
 */

/**
 * Snapshot of a service at the moment of appointment creation
 * This preserves the service details even if the service is later modified or deleted
 */
export interface AppointmentServiceSnapshot {
  id: string;                    // UUID of the appointment_services record
  appointmentId: string;
  serviceId: string | null;      // Reference to Service (can be null if service was deleted)
  name: string;                  // Service name (snapshot at creation time)
  price: number;                 // Price in decimal (snapshot)
  duration: number;              // Duration in minutes (snapshot)
  currency: string;              // Currency code (e.g., 'EUR', 'PLN')
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Appointment with multiple services support (Issue #79)
 * Response format for GET endpoints
 */
export interface AppointmentWithServices {
  // Basic appointment info
  id: string;
  appointmentNumber: string;
  tenantId: string;

  // Timing
  date: Date;
  startAt: Date;                 // UTC ISO string
  endAt: Date;                   // Calculated: startAt + sum(durations)

  // Client info
  clientId: string;
  clientName?: string;           // For API response normalization

  // Staff assignment
  assignedToId?: string | null;
  staffName?: string;            // For API response normalization

  // Multiple services (NEW - Issue #79)
  services: AppointmentServiceSnapshot[];
  totalDuration: number;         // Sum of all service durations in minutes
  totalPrice: number;            // Sum of all service prices
  currency: string;              // Currency from first service (all same currency)

  // Appointment status
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string;

  // Payment info
  paymentMethod: 'CARD' | 'CASH';
  paymentStatus: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  paymentId?: string | null;

  // Metadata
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request payload for creating an appointment with multiple services
 */
export interface CreateAppointmentPayload {
  clientId?: string;             // From legacy client system
  clientEmail?: string;          // From ClientProfile system (walk-in)
  clientData?: {                 // Required if no ClientProfile
    firstName: string;
    lastName: string;
    phone?: string;
    birthdate?: string;          // ISO date
  };
  serviceIds: string[];          // NEW: Array of service IDs (min 1)
  staffId: string;               // Staff member ID
  startAt: string;               // ISO UTC datetime (ONLY startAt, no endAt)
  status?: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string;
}

/**
 * Request payload for updating an appointment
 */
export interface UpdateAppointmentPayload {
  serviceIds?: string[];         // Can change services
  staffId?: string;              // Can reassign staff
  startAt?: string;              // Can change start time (endAt recalculated)
  status?: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string;
}

/**
 * Helper interface for internal calculations
 */
export interface ServiceDurationAndPrice {
  id: string;
  name: string;
  duration: number;              // in minutes
  price: number;
  currency: string;
}

/**
 * Calendar/List view representation of appointment
 * Compact format for calendar grids and list displays
 */
export interface AppointmentCalendarView {
  id: string;
  appointmentNumber: string;
  clientId: string;
  clientName: string;
  staffId: string;
  staffName: string;
  staffColor?: string;
  startAt: Date;
  endAt: Date;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

  // Multiple services display
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
  paymentStatus?: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

  // extendedProps for calendar libraries
  extendedProps?: {
    services: Array<{ id: string; name: string; price: number; duration: number }>;
    totalPrice: number;
    totalDuration: number;
    currency: string;
  };
}

/**
 * API Response wrapper
 */
export interface AppointmentResponse<T = AppointmentWithServices> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * List response for appointments
 */
export interface AppointmentsListResponse {
  success: boolean;
  data?: AppointmentWithServices[];
  total?: number;
  error?: string;
}
