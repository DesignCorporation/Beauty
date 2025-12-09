/**
 * Unified Appointment API Service
 * Centralizes all appointment-related API calls with consistent response format
 * Replaces: CRMApiService.getAppointment, createAppointment, etc.
 */

import api from '../utils/api-client';
import ENVIRONMENT from '../config/environment';
import type { AppointmentStatus } from '../types/calendar';

// API Response wrapper
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Appointment DTOs
export interface AppointmentDTO {
  id: string;
  appointmentNumber: string;
  tenantId: string;
  clientId: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientAvatarUrl?: string | null;
  client?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  };
  serviceId: string;
  serviceIds?: string[];
  services?: Array<{
    id: string;
    name: string;
    duration: number;
    price: number;
  }>;
  staffId: string;
  staff?: {
    id: string;
    firstName: string;
    lastName: string;
    color?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  startAt: string; // ISO8601
  endAt: string;   // ISO8601
  status: AppointmentStatus;
  price?: number | string;
  currency?: string;
  notes?: string | null;
  payments?: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    createdAt: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAppointmentInput {
  clientId: string;
  serviceId?: string;
  serviceIds?: string[];
  staffId: string;
  startAt: string;
  endAt: string;
  status?: AppointmentStatus;
  notes?: string;
}

export interface UpdateAppointmentInput {
  clientId?: string;
  serviceId?: string;
  serviceIds?: string[];
  staffId?: string;
  startAt?: string;
  endAt?: string;
  status?: AppointmentStatus;
  notes?: string;
}

export interface AvailabilityCheck {
  available: boolean;
  reason?: string;
  conflicts?: Array<{
    staffName: string;
    time: string;
  }>;
}

export interface ConflictInfo {
  staffId: string;
  staffName: string;
  startAt: string;
  endAt: string;
  clientName: string;
  appointmentId: string;
}

/**
 * AppointmentApiService - Unified API client for appointments
 */
export class AppointmentApiService {
  /**
   * Fetch single appointment
   */
  static async getAppointment(id: string): Promise<ApiResponse<AppointmentDTO>> {
    try {
      const crmUrl = ENVIRONMENT.getCrmUrl();
      const response = await api.get<AppointmentDTO>(`${crmUrl}/appointments/${id}`);
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch appointment',
        message: error.response?.data?.message
      };
    }
  }

  /**
   * Create new appointment
   */
  static async createAppointment(
    input: CreateAppointmentInput
  ): Promise<ApiResponse<AppointmentDTO>> {
    try {
      const crmUrl = ENVIRONMENT.getCrmUrl();
      const response = await api.post<AppointmentDTO>(`${crmUrl}/appointments`, {
        clientId: input.clientId,
        serviceId: input.serviceId || (input.serviceIds?.[0] || ''),
        serviceIds: input.serviceIds && input.serviceIds.length > 0 ? input.serviceIds : undefined,
        staffId: input.staffId,
        startAt: input.startAt,
        endAt: input.endAt,
        status: input.status || 'CONFIRMED',
        notes: input.notes
      });
      return {
        success: true,
        data: response,
        message: 'Appointment created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create appointment',
        message: error.response?.data?.message
      };
    }
  }

  /**
   * Update existing appointment
   */
  static async updateAppointment(
    id: string,
    input: UpdateAppointmentInput
  ): Promise<ApiResponse<AppointmentDTO>> {
    try {
      const crmUrl = ENVIRONMENT.getCrmUrl();
      const response = await api.put<AppointmentDTO>(`${crmUrl}/appointments/${id}`, {
        clientId: input.clientId,
        serviceId: input.serviceId || (input.serviceIds?.[0] || undefined),
        serviceIds: input.serviceIds && input.serviceIds.length > 0 ? input.serviceIds : undefined,
        staffId: input.staffId,
        startAt: input.startAt,
        endAt: input.endAt,
        status: input.status,
        notes: input.notes
      });
      return {
        success: true,
        data: response,
        message: 'Appointment updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update appointment',
        message: error.response?.data?.message
      };
    }
  }

  /**
   * Delete appointment
   */
  static async deleteAppointment(id: string): Promise<ApiResponse<void>> {
    try {
      const crmUrl = ENVIRONMENT.getCrmUrl();
      await api.delete(`${crmUrl}/appointments/${id}`);
      return {
        success: true,
        message: 'Appointment deleted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete appointment',
        message: error.response?.data?.message
      };
    }
  }

  /**
   * Update appointment status
   */
  static async updateAppointmentStatus(
    id: string,
    status: AppointmentStatus
  ): Promise<ApiResponse<AppointmentDTO>> {
    try {
      const crmUrl = ENVIRONMENT.getCrmUrl();
      const response = await api.patch<AppointmentDTO>(
        `${crmUrl}/appointments/${id}/status`,
        { status }
      );
      return {
        success: true,
        data: response,
        message: `Appointment status updated to ${status}`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update appointment status',
        message: error.response?.data?.message
      };
    }
  }

  /**
   * Check staff availability for given time slot
   */
  static async checkAvailability(
    staffId: string,
    date: string,
    startTime: string,
    duration: number
  ): Promise<ApiResponse<AvailabilityCheck>> {
    try {
      const params = new URLSearchParams({
        staffIds: staffId,
        date,
        startTime,
        duration: duration.toString()
      });
      const crmUrl = ENVIRONMENT.getCrmUrl();
      const response = await api.get<AvailabilityCheck>(
        `${crmUrl}/appointments/check-availability?${params}`
      );
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to check availability',
        message: error.response?.data?.message
      };
    }
  }

  /**
   * Get conflicting appointments for a staff member
   */
  static async getConflicts(
    staffId: string,
    startAt: string,
    endAt: string
  ): Promise<ApiResponse<ConflictInfo[]>> {
    try {
      const params = new URLSearchParams({
        staffId,
        startAt,
        endAt
      });
      const crmUrl = ENVIRONMENT.getCrmUrl();
      const response = await api.get<ConflictInfo[]>(
        `${crmUrl}/appointments/conflicts?${params}`
      );
      return {
        success: true,
        data: response || []
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch conflicts',
        data: [],
        message: error.response?.data?.message
      };
    }
  }

  /**
   * Generate appointment number
   */
  static async generateAppointmentNumber(date: string): Promise<string> {
    try {
      const response = await api.get<{ appointmentNumber: string }>(
        `/crm/appointments/generate-number?date=${date}`
      );
      return response.appointmentNumber || '';
    } catch (error) {
      // Fallback format
      const dateObj = new Date(date);
      return `001.${dateObj.toLocaleDateString('pl-PL')}`;
    }
  }
}

export default AppointmentApiService;
