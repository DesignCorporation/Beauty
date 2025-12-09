// 🚀 BEAUTY CRM API Client - ЧИСТАЯ НОВАЯ АРХИТЕКТУРА!
// Подключение к новому CRM API (6022) с полным tenant isolation

import { Client, ClientFormData } from '../hooks/useClients';
import type { Appointment } from '../types/appointment';
import type { AppointmentFormData as AppointmentPayload } from '../types/appointment';
import {
  Service,
  ServiceFormInput,
  ServiceCategory,
  ServiceCategoryInput,
  ServiceSubcategory,
  ServiceSubcategoryInput,
  CategoryServiceSummary,
  ReorderItem,
  ServiceCategoryUpdateInput,
  ServiceSubcategoryUpdateInput,
} from '../types/services';
import { debugLog } from '../utils/debug';
import {
  AvailableSlotResponse,
  GetAvailableSlotsRequest,
  SalonWorkingHour,
  StaffScheduleException,
  StaffScheduleResponse,
  StaffWorkingHour,
  WorkingHoursPayload
} from '../types/schedule';
import { BeautyApiClient } from '@beauty-platform/client-sdk';

export interface ClientImportIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
}

export interface ClientImportPreviewRow {
  id: string;
  rowNumber: number;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  birthdate?: string | null;
  notes?: string | null;
  tags: string[];
  status: 'READY' | 'WARNING' | 'ERROR';
  issues: ClientImportIssue[];
  duplicateInFile?: boolean;
  duplicateInTenant?: boolean;
}

export interface ClientImportPreviewResponse {
  success: boolean;
  previewId: string;
  fileName?: string;
  summary: {
    total: number;
    ready: number;
    warnings: number;
    errors: number;
    duplicateInTenant: number;
  };
  rows: ClientImportPreviewRow[];
  totalRows: number;
  sampleSize: number;
  detectedColumns: Record<string, string | null>;
  availableColumns: string[];
  hasMoreRows: boolean;
}

export interface ClientImportCommitResponse {
  success: boolean;
  summary: {
    total: number;
    imported: number;
    skipped: number;
  };
  results: Array<{
    rowId: string;
    status: 'IMPORTED' | 'SKIPPED';
    reason?: string;
  }>;
}

// 🎯 Новый CRM API URL - всегда через nginx proxy
const CRM_API_BASE_URL = '/crm';

// HTTP клиент с авто-CSRF, retry и поддержкой tenant через SDK
class CRMApiClient {
  private client: BeautyApiClient;

  constructor() {
    const baseApi = '/api';
    this.client = new BeautyApiClient({
      apiUrl: baseApi.replace(/\/$/, '')
    });
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    const data =
      options.body && typeof options.body !== 'string'
        ? options.body
        : options.body
        ? JSON.parse(options.body as string)
        : undefined;

    const normalizedPath = endpoint.startsWith('http')
      ? endpoint
      : `${CRM_API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    try {
      return await this.client.request<T>(normalizedPath, {
        method,
        data,
        headers: options.headers as Record<string, string> | undefined,
        retry: 1
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        debugLog('🔐 Session expired, redirecting to login');
        window.location.href = '/login';
      }
      throw error instanceof Error ? error : new Error('Request failed');
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const options: RequestInit = { method: 'POST' };
    if (data !== undefined) options.body = JSON.stringify(data);
    return this.request<T>(endpoint, options);
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const options: RequestInit = { method: 'PUT' };
    if (data !== undefined) options.body = JSON.stringify(data);
    return this.request<T>(endpoint, options);
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

const apiClient = new CRMApiClient();


const normalizeCategoryService = (service: any): CategoryServiceSummary => ({
  id: service.id,
  name: service.name,
  duration: Number(service.duration),
  price: Number(service.price),
  isDefault: Boolean(service.isDefault),
  isActive: service.isActive ?? true,
  subcategoryId: service.subcategoryId ?? null,
});

const normalizeSubcategory = (subcategory: any): ServiceSubcategory => ({
  id: subcategory.id,
  name: subcategory.name,
  order: Number(subcategory.order ?? 0),
  isDefault: Boolean(subcategory.isDefault),
  isActive: subcategory.isActive ?? true,
  createdAt: subcategory.createdAt,
  updatedAt: subcategory.updatedAt,
});

const normalizeCategory = (category: any): ServiceCategory => ({
  id: category.id,
  name: category.name,
  icon: category.icon ?? null,
  order: Number(category.order ?? 0),
  isDefault: Boolean(category.isDefault),
  isActive: category.isActive ?? true,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
  subcategories: (category.subcategories ?? []).map(normalizeSubcategory),
  services: (category.services ?? []).map(normalizeCategoryService),
});

const normalizeService = (service: any): Service => ({
  id: service.id,
  name: service.name,
  description: service.description ?? null,
  duration: Number(service.duration),
  price: Number(service.price),
  status: service.status ?? 'ACTIVE',
  isDefault: Boolean(service.isDefault),
  isActive: service.isActive ?? (service.status !== 'INACTIVE'),
  categoryId: service.categoryId ?? service.category?.id ?? null,
  subcategoryId: service.subcategoryId ?? service.subcategory?.id ?? null,
  category: service.category
    ? {
        id: service.category.id,
        name: service.category.name,
        icon: service.category.icon ?? null,
        order: Number(service.category.order ?? 0),
        isDefault: Boolean(service.category.isDefault),
        isActive: service.category.isActive ?? undefined,
      }
    : null,
  subcategory: service.subcategory
    ? {
        id: service.subcategory.id,
        name: service.subcategory.name,
        order: Number(service.subcategory.order ?? 0),
        isDefault: Boolean(service.subcategory.isDefault),
        isActive: service.subcategory.isActive ?? undefined,
        categoryId: service.subcategory.categoryId,
      }
    : null,
  createdAt: service.createdAt,
  updatedAt: service.updatedAt,
});

// No hardcode fallback data - always use real API data

export interface ClientProfileInfo {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  phoneVerified?: boolean;
  birthdate?: string | null;
  avatar?: string | null;
}

export interface CheckClientEmailResponse {
  success: boolean;
  exists: boolean;
  clientProfile: ClientProfileInfo | null;
}

// 🚀 НОВЫЙ CRM API Service - РЕАЛЬНЫЕ HTTP ЗАПРОСЫ
export class CRMApiService {
  // =====================
  // 📅 Working Hours / Schedule
  // =====================

  static async getSalonWorkingHours(): Promise<{ success: boolean; hours: SalonWorkingHour[] }> {
    const response = await apiClient.get<{ success: boolean; data: SalonWorkingHour[] }>('/settings/working-hours');

    if (!response?.success || !Array.isArray(response.data)) {
      throw new Error('Failed to load salon working hours');
    }

    return {
      success: true,
      hours: response.data
    };
  }

  static async updateSalonWorkingHours(payload: WorkingHoursPayload): Promise<{ success: boolean; hours: SalonWorkingHour[] }> {
    const response = await apiClient.put<{ success: boolean; data: SalonWorkingHour[]; message?: string }>(
      '/settings/working-hours',
      payload
    );

    if (!response?.success || !Array.isArray(response.data)) {
      throw new Error(response?.message || 'Failed to update salon working hours');
    }

    return {
      success: true,
      hours: response.data
    };
  }

  static async getStaffSchedule(staffId: string): Promise<StaffScheduleResponse['data']> {
    const response = await apiClient.get<StaffScheduleResponse>(`/staff/${staffId}/schedule`);

    if (!response?.success || !response.data) {
      throw new Error('Failed to load staff schedule');
    }

    return response.data;
  }

  static async updateStaffSchedule(staffId: string, payload: WorkingHoursPayload): Promise<StaffWorkingHour[]> {
    const response = await apiClient.put<{ success: boolean; data: StaffWorkingHour[] }>(`/staff/${staffId}/schedule`, payload);

    if (!response?.success || !Array.isArray(response.data)) {
      throw new Error('Failed to update staff schedule');
    }

    return response.data;
  }

  static async createStaffScheduleException(
    staffId: string,
    payload: {
      startDate: string;
      endDate: string;
      type: string;
      reason?: string | null;
      customStartTime?: string | null;
      customEndTime?: string | null;
      isWorkingDay?: boolean | null;
    }
  ): Promise<StaffScheduleException> {
    const response = await apiClient.post<{ success: boolean; data: StaffScheduleException }>(
      `/staff/${staffId}/schedule/exceptions`,
      payload
    );

    if (!response?.success || !response.data) {
      throw new Error('Failed to create schedule exception');
    }

    return response.data;
  }

  static async deleteStaffScheduleException(staffId: string, exceptionId: string): Promise<boolean> {
    const response = await apiClient.delete<{ success: boolean; message?: string }>(
      `/staff/${staffId}/schedule/exceptions/${exceptionId}`
    );

    if (!response?.success) {
      throw new Error(response?.message || 'Failed to delete schedule exception');
    }

    return true;
  }

  static async updateStaffMember(
    staffId: string,
    payload: { isBookable?: boolean; specializations?: string[]; languages?: string[] }
  ): Promise<{ success: boolean }> {
    const response = await apiClient.put<{ success: boolean }>(`/staff/${staffId}`, payload);

    if (!response?.success) {
      throw new Error('Failed to update staff member');
    }

    return { success: true };
  }

  static async assignServiceToStaff(staffId: string, serviceId: string, notes?: string): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(`/staff/${staffId}/services`, {
      serviceId,
      notes
    });

    if (!response?.success) {
      throw new Error('Failed to assign service to staff');
    }

    return { success: true };
  }

  static async getStaffServices(
    staffId: string
  ): Promise<{ success: boolean; services: Array<{ id: string; serviceId: string }> }> {
    const response = await apiClient.get<{ success: boolean; data: Array<{ id: string; serviceId: string }> }>(
      `/staff/${staffId}/services`
    );

    if (!response?.success) {
      throw new Error('Failed to load staff services');
    }

    return {
      success: true,
      services: response.data || []
    };
  }

  static async removeServiceFromStaff(staffId: string, serviceId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(`/staff/${staffId}/services/${serviceId}`);

    if (!response?.success) {
      throw new Error('Failed to remove service from staff');
    }

    return { success: true };
  }

  static async getAvailableSlots(params: GetAvailableSlotsRequest): Promise<AvailableSlotResponse> {
    const query = new URLSearchParams({
      date: params.date,
      serviceDurationMinutes: String(params.serviceDurationMinutes),
    });

    if (params.staffId) {
      query.set('staffId', params.staffId);
    }
    if (typeof params.bufferMinutes === 'number') {
      query.set('bufferMinutes', String(params.bufferMinutes));
    }

    const response = await apiClient.get<AvailableSlotResponse>(`/schedule/available-slots?${query.toString()}`);

    if (!response?.success) {
      throw new Error('Failed to fetch available slots');
    }

    return response;
  }
  
  // ✅ CLIENTS CRUD - Реальные API вызовы
  static async getClients(): Promise<{ success: boolean; clients: Client[] }> {
    try {
      debugLog('[NEW CRM API] Fetching clients from real API');
      
      const response = await apiClient.get<{ success: boolean; data: Client[] }>('/clients');
      
      return { 
        success: response.success, 
        clients: response.data || []
      };
    } catch (error) {
      console.error('[NEW CRM API] Error fetching clients:', error);
      
      // Fallback: Попробуем публичный demo endpoint через nginx
      try {
      debugLog('[DEMO] Trying demo endpoint through nginx proxy...');
        const demoUrl = '/demo/clients';
        
        const demoResponse = await fetch(demoUrl);
        if (demoResponse.ok) {
          const demoData = await demoResponse.json();
          if (demoData.success && demoData.data) {
            debugLog('[DEMO] Got real data from demo endpoint!');
            return { 
              success: true, 
              clients: demoData.data.map((client: any) => ({
                id: client.id,
                tenantId: client.tenantId || 'demo-tenant',
                name: client.name,
                email: client.email,
                phone: client.phone,
                notes: client.notes,
                birthday: client.birthday,
                status: client.status || 'ACTIVE' as const,
                createdAt: client.createdAt,
                updatedAt: client.updatedAt || client.createdAt,
                appointmentsCount: client.appointmentsCount ?? 0,
                avatar: client.avatar ?? null,
                avatarUrl: client.avatarUrl ?? null,
                profileFirstName: client.profileFirstName ?? null,
                profileLastName: client.profileLastName ?? null,
                isPortalClient: Boolean(client.isPortalClient)
              }))
            };
          }
        }
      } catch (debugError) {
        console.error('[NEW CRM API] Debug endpoint also failed:', debugError);
      }
      
      // Если все API endpoints не работают, возвращаем пустой массив
      debugLog('❌ All API endpoints failed, returning empty array');
      return { success: false, clients: [] };
    }
  }

  static async previewClientImport(file: File): Promise<ClientImportPreviewResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/crm/clients/import/preview', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json().catch(() => ({
        success: false,
        error: 'IMPORT_PREVIEW_FAILED'
      }));

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }

      return data as ClientImportPreviewResponse;
    } catch (error) {
      console.error('[NEW CRM API] Error creating client import preview:', error);
      throw error;
    }
  }

  static async commitClientImport(params: {
    previewId: string;
    includeWarnings?: boolean;
    rowIds?: string[];
  }): Promise<ClientImportCommitResponse> {
    try {
      const response = await apiClient.post<ClientImportCommitResponse>(
        '/clients/import/commit',
        params
      );
      return response;
    } catch (error) {
      console.error('[NEW CRM API] Error committing client import:', error);
      throw error;
    }
  }

  static async exportClients(format: 'csv' | 'xlsx' = 'csv'): Promise<{ success: boolean; blob?: Blob; filename?: string }> {
    try {
      const query = new URLSearchParams({ format });
      const response = await fetch(`/api/crm/clients/export?${query.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition');
      const match = disposition?.match(/filename="?([^"]+)"?/i);
      const filename =
        match?.[1] ?? `clients-${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`;

      return {
        success: true,
        blob,
        filename
      };
    } catch (error) {
      console.error('[NEW CRM API] Error exporting clients:', error);
      return { success: false };
    }
  }

  static async checkClientEmail(email: string): Promise<CheckClientEmailResponse> {
    return apiClient.get<CheckClientEmailResponse>(`/clients/check-email?email=${encodeURIComponent(email)}`);
  }

  static async createClient(clientData: ClientFormData): Promise<{ success: boolean; client?: Client }> {
    try {
      debugLog('[NEW CRM API] Creating client:', clientData);
      
      const response = await apiClient.post<{ success: boolean; data: Client }>('/clients', clientData);
      
      return { 
        success: response.success, 
        client: response.data 
      };
    } catch (error) {
      console.error('[NEW CRM API] Error creating client:', error);
      return { success: false };
    }
  }

  static async updateClient(id: string, clientData: Partial<ClientFormData>): Promise<{ success: boolean; client?: Client }> {
    try {
      debugLog(`[NEW CRM API] Updating client ${id}:`, clientData);
      
      const response = await apiClient.put<{ success: boolean; data: Client }>(`/clients/${id}`, clientData);
      
      return { 
        success: response.success, 
        client: response.data 
      };
    } catch (error) {
      console.error('[NEW CRM API] Error updating client:', error);
      return { success: false };
    }
  }

  static async deleteClient(id: string): Promise<{ success: boolean }> {
    try {
      debugLog(`[NEW CRM API] Deleting client ${id}`);
      
      const response = await apiClient.delete<{ success: boolean }>(`/clients/${id}`);
      
      return { success: response.success };
    } catch (error) {
      console.error('[NEW CRM API] Error deleting client:', error);
      return { success: false };
    }
  }

  // ✅ SERVICES CRUD - Реальные API вызовы
  static async getServices(options: { includeInactive?: boolean; status?: 'ACTIVE' | 'INACTIVE' | 'ALL'; isActive?: boolean } = {}): Promise<{ success: boolean; services: Service[] }> {
    const fetchPage = async (statusParam?: 'ACTIVE' | 'INACTIVE', isActiveParam?: boolean) => {
      const query = new URLSearchParams();

      if (statusParam) {
        query.set('status', statusParam);
      }

      if (typeof isActiveParam === 'boolean') {
        query.set('isActive', String(isActiveParam));
      }

      const endpoint = query.toString().length ? `/services?${query.toString()}` : '/services';
      const response = await apiClient.get<{ success: boolean; data: unknown[] }>(endpoint);

      if (!response.success) {
        throw new Error('FAILED_TO_FETCH_SERVICES');
      }

      return (response.data || []).map(normalizeService);
    };

    const shouldCombineStatuses =
      options.includeInactive &&
      (!options.status || options.status === 'ALL') &&
      typeof options.isActive === 'undefined';

    const requestedStatus = options.status && options.status !== 'ALL' ? options.status : undefined;

    try {
      const services = await fetchPage(requestedStatus, options.isActive);
      return { success: true, services };
    } catch (error) {
      console.error('[NEW CRM API] Error fetching services:', error);

      if (shouldCombineStatuses) {
        try {
          const [activeServices, inactiveServices] = await Promise.all([
            fetchPage('ACTIVE'),
            fetchPage('INACTIVE'),
          ]);

          const deduped = Array.from(
            new Map([...activeServices, ...inactiveServices].map(service => [service.id, service]))
          ).map(([, service]) => service);

          return { success: true, services: deduped };
        } catch (fallbackError) {
          console.error('[NEW CRM API] Fallback fetch (active + inactive) failed:', fallbackError);
        }
      }

      return { success: false, services: [] };
    }
  }

  static async createService(serviceData: ServiceFormInput): Promise<{ success: boolean; service?: Service }> {
    try {
      debugLog('[NEW CRM API] Creating service:', serviceData);
      
      const response = await apiClient.post<{ success: boolean; data: unknown }>('/services', serviceData);
      
      const result: { success: boolean; service?: Service } = {
        success: response.success
      };

      if (response.data) {
        result.service = normalizeService(response.data);
      }

      return result;
    } catch (error) {
      console.error('[NEW CRM API] Error creating service:', error);
      return { success: false };
    }
  }

  static async updateService(id: string, serviceData: Partial<ServiceFormInput>): Promise<{ success: boolean; service?: Service }> {
    try {
      debugLog(`[NEW CRM API] Updating service ${id}:`, serviceData);
      
      const response = await apiClient.put<{ success: boolean; data: unknown }>(`/services/${id}`, serviceData);
      
      const result: { success: boolean; service?: Service } = {
        success: response.success
      };

      if (response.data) {
        result.service = normalizeService(response.data);
      }

      return result;
    } catch (error) {
      console.error('[NEW CRM API] Error updating service:', error);
      return { success: false };
    }
  }

  static async deleteService(id: string): Promise<{ success: boolean }> {
    try {
      debugLog(`[NEW CRM API] Deleting service ${id}`);
      
      const response = await apiClient.delete<{ success: boolean }>(`/services/${id}`);
      
      return { success: response.success };
    } catch (error) {
      console.error('[NEW CRM API] Error deleting service:', error);
      return { success: false };
    }
  }

  // ✅ SERVICE CATEGORIES
  static async getServiceCategories(): Promise<{ success: boolean; categories: ServiceCategory[] }> {
    try {
      debugLog('[NEW CRM API] Fetching service categories');

      const response = await apiClient.get<{ success: boolean; data: unknown[] }>('/service-categories');

      if (!response.success) {
        return { success: false, categories: [] };
      }

      return {
        success: true,
        categories: (response.data || []).map(normalizeCategory),
      };
    } catch (error) {
      console.error('[NEW CRM API] Error fetching categories:', error);
      return { success: false, categories: [] };
    }
  }

  static async createServiceCategory(payload: ServiceCategoryInput): Promise<{ success: boolean; category?: ServiceCategory }> {
    try {
      debugLog('[NEW CRM API] Creating service category:', payload);

      const response = await apiClient.post<{ success: boolean; data: unknown }>('/service-categories', payload);

      const result: { success: boolean; category?: ServiceCategory } = {
        success: response.success,
      };

      if (response.data) {
        result.category = normalizeCategory(response.data);
      }

      return result;
    } catch (error) {
      console.error('[NEW CRM API] Error creating category:', error);
      return { success: false };
    }
  }

  static async updateServiceCategory(id: string, payload: ServiceCategoryUpdateInput): Promise<{ success: boolean; category?: ServiceCategory }> {
    try {
      debugLog(`[NEW CRM API] Updating service category ${id}`, payload);

      const response = await apiClient.put<{ success: boolean; data: unknown }>(`/service-categories/${id}`, payload);

      const result: { success: boolean; category?: ServiceCategory } = {
        success: response.success,
      };

      if (response.data) {
        result.category = normalizeCategory(response.data);
      }

      return result;
    } catch (error) {
      console.error('[NEW CRM API] Error updating category:', error);
      return { success: false };
    }
  }

  static async deleteServiceCategory(id: string): Promise<{ success: boolean }> {
    try {
      debugLog(`[NEW CRM API] Deleting service category ${id}`);

      const response = await apiClient.delete<{ success: boolean }>(`/service-categories/${id}`);

      return { success: response.success };
    } catch (error) {
      console.error('[NEW CRM API] Error deleting category:', error);
      return { success: false };
    }
  }

  static async reorderServiceCategories(items: ReorderItem[]): Promise<{ success: boolean }> {
    try {
      debugLog('[NEW CRM API] Reordering service categories');

      const response = await apiClient.post<{ success: boolean }>(
        '/service-categories/reorder',
        items,
      );

      return { success: response.success };
    } catch (error) {
      console.error('[NEW CRM API] Error reordering categories:', error);
      return { success: false };
    }
  }

  static async getServiceSubcategories(categoryId: string): Promise<{ success: boolean; subcategories: ServiceSubcategory[] }> {
    try {
      debugLog(`[NEW CRM API] Fetching subcategories for category ${categoryId}`);

      const response = await apiClient.get<{ success: boolean; data: unknown[] }>(`/service-categories/${categoryId}/subcategories`);

      if (!response.success) {
        return { success: false, subcategories: [] };
      }

      return {
        success: true,
        subcategories: (response.data || []).map(normalizeSubcategory),
      };
    } catch (error) {
      console.error('[NEW CRM API] Error fetching subcategories:', error);
      return { success: false, subcategories: [] };
    }
  }

  static async createServiceSubcategory(payload: ServiceSubcategoryInput): Promise<{ success: boolean; subcategory?: ServiceSubcategory }> {
    try {
      debugLog('[NEW CRM API] Creating service subcategory:', payload);

      const response = await apiClient.post<{ success: boolean; data: unknown }>('/service-subcategories', payload);

      const result: { success: boolean; subcategory?: ServiceSubcategory } = {
        success: response.success,
      };

      if (response.data) {
        result.subcategory = normalizeSubcategory(response.data);
      }

      return result;
    } catch (error) {
      console.error('[NEW CRM API] Error creating subcategory:', error);
      return { success: false };
    }
  }

  static async updateServiceSubcategory(id: string, payload: ServiceSubcategoryUpdateInput): Promise<{ success: boolean; subcategory?: ServiceSubcategory }> {
    try {
      debugLog(`[NEW CRM API] Updating service subcategory ${id}`, payload);

      const response = await apiClient.put<{ success: boolean; data: unknown }>(`/service-subcategories/${id}`, payload);

      const result: { success: boolean; subcategory?: ServiceSubcategory } = {
        success: response.success,
      };

      if (response.data) {
        result.subcategory = normalizeSubcategory(response.data);
      }

      return result;
    } catch (error) {
      console.error('[NEW CRM API] Error updating subcategory:', error);
      return { success: false };
    }
  }

  static async deleteServiceSubcategory(id: string): Promise<{ success: boolean }> {
    try {
      debugLog(`[NEW CRM API] Deleting service subcategory ${id}`);

      const response = await apiClient.delete<{ success: boolean }>(`/service-subcategories/${id}`);

      return { success: response.success };
    } catch (error) {
      console.error('[NEW CRM API] Error deleting subcategory:', error);
      return { success: false };
    }
  }

  static async reorderServiceSubcategories(items: ReorderItem[]): Promise<{ success: boolean }> {
    try {
      debugLog('[NEW CRM API] Reordering service subcategories');

      const response = await apiClient.post<{ success: boolean }>(
        '/service-subcategories/reorder',
        items,
      );

      return { success: response.success };
    } catch (error) {
      console.error('[NEW CRM API] Error reordering subcategories:', error);
      return { success: false };
    }
  }

  // ✅ APPOINTMENTS CRUD - Реальные API вызовы
  static async getAppointments(params?: { date?: string; staffId?: string }): Promise<{ success: boolean; appointments: Appointment[] }> {
    try {
      debugLog('[NEW CRM API] Fetching appointments from real API');
      
      const queryParams = new URLSearchParams();
      if (params?.date) queryParams.append('date', params.date);
      if (params?.staffId) queryParams.append('staffId', params.staffId);
      
      const endpoint = `/appointments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<{ success: boolean; data: Appointment[] }>(endpoint);
      
      return { 
        success: response.success, 
        appointments: response.data || []
      };
    } catch (error) {
      console.error('[NEW CRM API] Error fetching appointments:', error);
      return { success: true, appointments: [] };
    }
  }

  static async getCalendarAppointments(startDate: string, endDate: string): Promise<{ success: boolean; appointments: unknown[] }> {
    try {
      debugLog('[NEW CRM API] Fetching calendar appointments');

      // Добавляем include параметр для загрузки всех related данных
      const response = await apiClient.get<{ success: boolean; data: unknown[] }>(`/appointments/calendar?startDate=${startDate}&endDate=${endDate}&include=client,staff,services,payments,notes`);

      return {
        success: response.success,
        appointments: response.data || []
      };
    } catch (error) {
      console.error('[NEW CRM API] Error fetching calendar appointments:', error);
      return { success: true, appointments: [] };
    }
  }

  static async getAppointmentById(appointmentId: string): Promise<{ success: boolean; appointment?: unknown }> {
    try {
      debugLog('[NEW CRM API] Fetching appointment by ID:', appointmentId);

      // Запрашиваем полную информацию о записи с платежами, аватарами и всем остальным
      const response = await apiClient.get<{ success: boolean; data: unknown }>(`/appointments/${appointmentId}?include=client,staff,services,payments,notes`);

      return {
        success: response.success,
        appointment: response.data
      };
    } catch (error) {
      console.error('[NEW CRM API] Error fetching appointment by ID:', error);
      return { success: false };
    }
  }

  static async createAppointment(appointmentData: AppointmentPayload): Promise<{ success: boolean; appointment?: Appointment }> {
    try {
      debugLog('[NEW CRM API] Creating appointment:', appointmentData);
      
      const response = await apiClient.post<{ success: boolean; data: Appointment }>('/appointments', appointmentData);
      
      return { 
        success: response.success, 
        appointment: response.data 
      };
    } catch (error) {
      console.error('[NEW CRM API] Error creating appointment:', error);
      return { success: false };
    }
  }

  static async updateAppointment(id: string, appointmentData: Partial<AppointmentPayload>): Promise<{ success: boolean; appointment?: Appointment }> {
    try {
      debugLog(`[NEW CRM API] Updating appointment ${id}:`, appointmentData);
      
      const response = await apiClient.put<{ success: boolean; data: Appointment }>(`/appointments/${id}`, appointmentData);
      
      return { 
        success: response.success, 
        appointment: response.data 
      };
    } catch (error) {
      console.error('[NEW CRM API] Error updating appointment:', error);
      return { success: false };
    }
  }

  static async deleteAppointment(id: string): Promise<{ success: boolean }> {
    try {
      debugLog(`[NEW CRM API] Deleting appointment ${id}`);
      
      const response = await apiClient.delete<{ success: boolean }>(`/appointments/${id}`);
      
      return { success: response.success };
    } catch (error) {
      console.error('[NEW CRM API] Error deleting appointment:', error);
      return { success: false };
    }
  }

  // ✅ STAFF - Реальные API вызовы с fallback данными
  static async getStaff(options?: {
    bookableOnly?: boolean;
    role?: string;
    specialization?: string;
    serviceId?: string;
    languages?: string[];
  }): Promise<{ success: boolean; staff: unknown[] }> {
    debugLog('[NEW CRM API] Fetching staff from real API');

    const query = new URLSearchParams();
    if (options?.bookableOnly === false) {
      query.append('bookableOnly', 'false');
    }
    if (options?.role) {
      query.append('role', options.role);
    }
    if (options?.specialization) {
      query.append('specialization', options.specialization);
    }
    if (options?.serviceId) {
      query.append('serviceId', options.serviceId);
    }
    if (options?.languages?.length) {
      query.append('languages', options.languages.join(','));
    }

    const response = await apiClient.get<{ success: boolean; data: unknown[] }>(
      `/staff${query.toString() ? `?${query.toString()}` : ''}`
    );

    if (!response || !response.success) {
      throw new Error('Failed to fetch staff');
    }

    return {
      success: true,
      staff: response.data || []
    };
  }
}

// Новый CRM API клиент готов для использования в браузере
debugLog('New CRM API Service initialized - connected to real backend!');
