/**
 * Unified Appointment Editor Types
 * Core interfaces for the refactored AppointmentEditor component
 */

import type { AppointmentStatus } from '../../types/calendar';

// ============================================================================
// EDITOR MODES & LAYOUTS
// ============================================================================

export type AppointmentEditorMode = 'create' | 'edit' | 'view' | 'duplicate';
export type AppointmentEditorLayout = 'compact' | 'full';

export interface AppointmentEditorProps {
  appointmentId?: string;
  initialDate?: Date;
  mode: AppointmentEditorMode;
  layout: AppointmentEditorLayout;  // compact = modal, full = page
  onClose?: () => void;
  onSaved?: (appointment: any) => void;
  onDeleted?: (appointmentId: string) => void;
}

// ============================================================================
// FORM DATA & STATE
// ============================================================================

export interface ClientData {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface ServiceData {
  id: string;
  name: string;
  duration: number;
  price: number;
  category?: string;
  isActive: boolean;
}

export interface StaffData {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  color?: string | null;
  avatarUrl?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  role?: string;
}

export interface AppointmentFormData {
  client: ClientData | null;
  services: ServiceData[];              // ⭐ Array now, not single!
  staff: StaffData | null;
  startAt: string;                      // ISO8601 or empty
  endAt: string;                        // ISO8601 or empty
  status: AppointmentStatus;
  notes: string;
  tags?: string[];                      // Client tags (VIP, new, etc.)
  paymentMethod?: 'cash' | 'card' | 'transfer';
  paymentStatus?: 'pending' | 'completed' | 'refunded';
}

export interface AppointmentEditorState {
  mode: AppointmentEditorMode;
  layout: AppointmentEditorLayout;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;                    // Has unsaved changes
  errors: FormErrors;
  validationState: ValidationState;
}

export interface FormErrors {
  client?: string;
  services?: string;
  staff?: string;
  startAt?: string;
  endAt?: string;
  time?: string;                       // Conflict errors
  general?: string;
  [key: string]: string | undefined;
}

// ============================================================================
// VALIDATION & AVAILABILITY
// ============================================================================

export interface ValidationState {
  hasConflicts: boolean;
  conflicts: ConflictInfo[];           // Staff conflicts
  isWithinWorkingHours: boolean;
  staffAvailable: boolean;
  canBook: boolean;                    // All checks pass
}

export interface ConflictInfo {
  staffId: string;
  staffName: string;
  startAt: string;                     // ISO8601
  endAt: string;                       // ISO8601
  duration?: number;                   // minutes
  clientName: string;
  appointmentId: string;
}

export interface StaffAvailability {
  staffId: string;
  isAvailable: boolean;
  nextAvailableTime?: string;          // ISO8601
  reason?: 'WORKING_HOURS' | 'APPOINTMENT_CONFLICT' | 'STAFF_OFF' | 'UNKNOWN';
}

export interface SlotAvailability {
  isAvailable: boolean;
  unavailabilityReason?: string;
  message?: string;
  messageKey?: string;
}

// ============================================================================
// API/DISPLAY DATA
// ============================================================================

export interface AppointmentSummary {
  id: string;
  appointmentNumber: string;
  clientName: string;
  serviceNames: string[];
  staffName: string;
  duration: number;                    // minutes
  totalPrice: number;
  currency: string;
  startAt: string;                     // ISO8601
  endAt: string;                       // ISO8601
  status: AppointmentStatus;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  method: 'cash' | 'card' | 'transfer';
  status: 'pending' | 'completed' | 'refunded';
  createdAt: string;
  paymentRef?: string;
}

// ============================================================================
// ACTIONS & EVENTS
// ============================================================================

export interface ConfirmationModalData {
  action: 'save' | 'delete' | 'reschedule' | 'cancel';
  title: string;
  description: string;
  items: Array<{
    label: string;
    value: string | React.ReactNode;
  }>;
  primaryAction: {
    label: string;
    variant: 'default' | 'destructive' | 'secondary';
    secondaryActions?: Array<{
      label: string;
      action: () => void;
    }>;
  };
}

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  action: () => void;
  variant?: 'default' | 'secondary' | 'destructive';
  disabled?: boolean;
  tooltip?: string;
}

// ============================================================================
// SECTION COMPONENTS PROPS
// ============================================================================

export interface SectionCardProps {
  title: string;
  icon?: React.ComponentType<any>;
  status?: 'empty' | 'filled' | 'error' | 'loading';
  editable?: boolean;
  className?: string;
  children: React.ReactNode;
}

export interface ClientSectionProps {
  editable: boolean;
  client: ClientData | null;
  clients: ClientData[];
  onClientChange: (clientId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export interface ServicesSectionProps {
  editable: boolean;
  services: ServiceData[];
  allServices: ServiceData[];
  selectedServiceIds: string[];
  totalPrice: number;
  currency: string;
  onServiceChange: (serviceId: string) => void;
}

export interface ScheduleSectionProps {
  editable: boolean;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  onDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange?: (time: string) => void;
  availability?: SlotAvailability;
}

export interface StaffSectionProps {
  editable: boolean;
  staff: StaffData | null;
  allStaff: StaffData[];
  selectedStaffIds: string[];
  onStaffChange: (staffId: string) => void;
  conflicts?: ConflictInfo[];
}

export interface PaymentSectionProps {
  editable: boolean;
  payments?: PaymentRecord[];
  outstandingBalance?: number;
  currency?: string;
  onPaymentAdd?: () => void;
}

export interface InfoSectionProps {
  appointmentNumber: string;
  createdAt: string;
  updatedAt?: string;
  statusHistory?: Array<{
    status: AppointmentStatus;
    changedAt: string;
    changedBy: string;
  }>;
  source?: 'portal' | 'phone' | 'crm' | 'walk_in';
}

// ============================================================================
// PANEL COMPONENTS PROPS
// ============================================================================

export interface ActionPanelProps {
  mode: AppointmentEditorMode;
  canSave: boolean;
  canDelete: boolean;
  isSaving: boolean;
  isDirty: boolean;
  onSave: () => void;
  onDelete: () => void;
  onReschedule?: () => void;
  onDuplicate?: () => void;
  onSendReminder?: () => void;
  onCancel: () => void;
}

export interface ConflictIndicatorProps {
  conflicts: ConflictInfo[];
  isEmpty: boolean;
}

export interface DurationTimelineProps {
  services: ServiceData[];
  totalDuration: number;
  startTime: string;
  endTime: string;
}

export interface StatusTimelineProps {
  status: AppointmentStatus;
  createdAt: string;
  history?: Array<{
    status: AppointmentStatus;
    changedAt: string;
    changedBy: string;
  }>;
}

// ============================================================================
// CONSTANTS & ENUMS
// ============================================================================

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  PENDING: 'bg-warning',
  CONFIRMED: 'bg-info',
  IN_PROGRESS: 'bg-primary',
  COMPLETED: 'bg-success',
  CANCELED: 'bg-error'
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Oczekująca',
  CONFIRMED: 'Potwierdzona',
  IN_PROGRESS: 'W trakcie',
  COMPLETED: 'Zakończona',
  CANCELED: 'Anulowana'
};
