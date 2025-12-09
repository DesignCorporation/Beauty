// 🚀 BEAUTY CRM API Client - Production HTTP Client
// Подключение к реальному CRM API через SDK

import { sdkClient } from '../services/sdkClient';
import { Client, ClientFormData } from '../hooks/useClients';
import { Service, ServiceFormData } from '../hooks/useServices';
import { Appointment, AppointmentFormData } from '../types/calendar';
import {
  ServiceCategory,
  ServiceCategoryInput,
  ServiceSubcategory,
  ServiceSubcategoryInput,
  CategoryServiceSummary,
  ReorderItem,
  ServiceCategoryUpdateInput,
  ServiceSubcategoryUpdateInput,
} from '../types/services';

// Префикс для CRM сервиса относительно Gateway /api
const SERVICE_PREFIX = '/crm';

// HTTP клиент с автоматической авторизацией через SDK
class CRMApiClient {
  
  // Адаптер для SDK запросов
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Строим путь: /crm + endpoint
    // endpoint обычно начинается с /, например /clients
    const path = `${SERVICE_PREFIX}${endpoint}`;

    try {
      const method = (options.method || 'GET').toUpperCase();
      
      return await sdkClient.request<T>(path, {
        method,
        data: options.body ? JSON.parse(options.body as string) : undefined,
        headers: options.headers as Record<string, string>
      });
    } catch (error: any) {
      // Обработка 401 уже делается в sdkClient (throw) -> ловим здесь
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        // Перенаправление на логин должно обрабатываться глобально или здесь
        // В старой версии было: window.location.href = '/login';
        // Оставим пока так, но вообще лучше через AuthContext
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
           window.location.href = '/login';
        }
        throw new Error('UNAUTHORIZED');
      }
      throw error;
    }
  }

  // HTTP методы
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const options: RequestInit = {
      method: 'POST',
    };

    if (data !== undefined) {
      options.body = JSON.stringify(data);
    }

    return this.request<T>(endpoint, options);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const options: RequestInit = {
      method: 'PUT',
    };

    if (data !== undefined) {
      options.body = JSON.stringify(data);
    }

    return this.request<T>(endpoint, options);
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

const apiClient = new CRMApiClient();

// Normalization helpers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeCategoryService = (service: any): CategoryServiceSummary => ({
  id: service.id,
  name: service.name,
  duration: Number(service.duration),
  price: Number(service.price),
  isDefault: Boolean(service.isDefault),
  isActive: service.isActive ?? true,
  subcategoryId: service.subcategoryId ?? null,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeSubcategory = (subcategory: any): ServiceSubcategory => ({
  id: subcategory.id,
  name: subcategory.name,
  order: Number(subcategory.order ?? 0),
  isDefault: Boolean(subcategory.isDefault),
  isActive: subcategory.isActive ?? true,
  createdAt: subcategory.createdAt,
  updatedAt: subcategory.updatedAt,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// 🚀 Production CRM API Service - Real HTTP Requests
export class CrmApiService {

  // ✅ CLIENTS CRUD
  static async getClients(): Promise<{ success: boolean; clients: Client[] }> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Client[] }>('/clients');

      return {
        success: response.success,
        clients: response.data || []
      };
    } catch (error) {
      console.error('[CRM API] Error fetching clients:', error);
      return { success: false, clients: [] };
    }
  }

  static async checkClientEmail(email: string): Promise<CheckClientEmailResponse> {
    return apiClient.get<CheckClientEmailResponse>(`/clients/check-email?email=${encodeURIComponent(email)}`);
  }

  static async createClient(clientData: ClientFormData): Promise<{ success: boolean; client?: Client }> {
    try {
      const response = await apiClient.post<{ success: boolean; data: Client }>('/clients', clientData);

      return {
        success: response.success,
        client: response.data
      };
    } catch (error) {
      console.error('[CRM API] Error creating client:', error);
      return { success: false };
    }
  }

  static async updateClient(id: string, clientData: Partial<ClientFormData>): Promise<{ success: boolean; client?: Client }> {
    try {
      const response = await apiClient.put<{ success: boolean; data: Client }>(`/clients/${id}`, clientData);

      return {
        success: response.success,
        client: response.data
      };
    } catch (error) {
      console.error('[CRM API] Error updating client:', error);
      return { success: false };
    }
  }

  static async deleteClient(id: string): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.delete<{ success: boolean }>(`/clients/${id}`);

      return { success: response.success };
    } catch (error) {
      console.error('[CRM API] Error deleting client:', error);
      return { success: false };
    }
  }

  // ✅ SERVICES CRUD
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
      console.error('[CRM API] Error fetching services:', error);

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
          console.error('[CRM API] Fallback fetch (active + inactive) failed:', fallbackError);
        }
      }

      return { success: false, services: [] };
    }
  }

  static async createService(serviceData: ServiceFormData): Promise<{ success: boolean; service?: Service }> {
    try {
      const response = await apiClient.post<{ success: boolean; data: unknown }>('/services', serviceData);

      const result: { success: boolean; service?: Service } = {
        success: response.success
      };

      if (response.data) {
        result.service = normalizeService(response.data);
      }

      return result;
    } catch (error) {
      console.error('[CRM API] Error creating service:', error);
      return { success: false };
    }
  }

  static async updateService(id: string, serviceData: Partial<ServiceFormData>): Promise<{ success: boolean; service?: Service }> {
    try {
      const response = await apiClient.put<{ success: boolean; data: unknown }>(`/services/${id}`, serviceData);

      const result: { success: boolean; service?: Service } = {
        success: response.success
      };

      if (response.data) {
        result.service = normalizeService(response.data);
      }

      return result;
    } catch (error) {
      console.error('[CRM API] Error updating service:', error);
      return { success: false };
    }
  }

  static async deleteService(id: string): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.delete<{ success: boolean }>(`/services/${id}`);

      return { success: response.success };
    } catch (error) {
      console.error('[CRM API] Error deleting service:', error);
      return { success: false };
    }
  }

  // ✅ SERVICE CATEGORIES
  static async getServiceCategories(): Promise<{ success: boolean; categories: ServiceCategory[] }> {
    try {
      const response = await apiClient.get<{ success: boolean; data: unknown[] }>('/service-categories');

      if (!response.success) {
        return { success: false, categories: [] };
      }

      return {
        success: true,
        categories: (response.data || []).map(normalizeCategory),
      };
    } catch (error) {
      console.error('[CRM API] Error fetching categories:', error);
      return { success: false, categories: [] };
    }
  }

  static async createServiceCategory(payload: ServiceCategoryInput): Promise<{ success: boolean; category?: ServiceCategory }> {
    try {
      const response = await apiClient.post<{ success: boolean; data: unknown }>('/service-categories', payload);

      const result: { success: boolean; category?: ServiceCategory } = {
        success: response.success,
      };

      if (response.data) {
        result.category = normalizeCategory(response.data);
      }

      return result;
    } catch (error) {
      console.error('[CRM API] Error creating category:', error);
      return { success: false };
    }
  }

  static async updateServiceCategory(id: string, payload: ServiceCategoryUpdateInput): Promise<{ success: boolean; category?: ServiceCategory }> {
    try {
      const response = await apiClient.put<{ success: boolean; data: unknown }>(`/service-categories/${id}`, payload);

      const result: { success: boolean; category?: ServiceCategory } = {
        success: response.success,
      };

      if (response.data) {
        result.category = normalizeCategory(response.data);
      }

      return result;
    } catch (error) {
      console.error('[CRM API] Error updating category:', error);
      return { success: false };
    }
  }

  static async deleteServiceCategory(id: string): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.delete<{ success: boolean }>(`/service-categories/${id}`);

      return { success: response.success };
    } catch (error) {
      console.error('[CRM API] Error deleting category:', error);
      return { success: false };
    }
  }

  static async reorderServiceCategories(items: ReorderItem[]): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.post<{ success: boolean }>(
        '/service-categories/reorder',
        items,
      );

      return { success: response.success };
    } catch (error) {
      console.error('[CRM API] Error reordering categories:', error);
      return { success: false };
    }
  }

  static async getServiceSubcategories(categoryId: string): Promise<{ success: boolean; subcategories: ServiceSubcategory[] }> {
    try {
      const response = await apiClient.get<{ success: boolean; data: unknown[] }>(`/service-categories/${categoryId}/subcategories`);

      if (!response.success) {
        return { success: false, subcategories: [] };
      }

      return {
        success: true,
        subcategories: (response.data || []).map(normalizeSubcategory),
      };
    } catch (error) {
      console.error('[CRM API] Error fetching subcategories:', error);
      return { success: false, subcategories: [] };
    }
  }

  static async createServiceSubcategory(payload: ServiceSubcategoryInput): Promise<{ success: boolean; subcategory?: ServiceSubcategory }> {
    try {
      const response = await apiClient.post<{ success: boolean; data: unknown }>('/service-subcategories', payload);

      const result: { success: boolean; subcategory?: ServiceSubcategory } = {
        success: response.success,
      };

      if (response.data) {
        result.subcategory = normalizeSubcategory(response.data);
      }

      return result;
    } catch (error) {
      console.error('[CRM API] Error creating subcategory:', error);
      return { success: false };
    }
  }

  static async updateServiceSubcategory(id: string, payload: ServiceSubcategoryUpdateInput): Promise<{ success: boolean; subcategory?: ServiceSubcategory }> {
    try {
      const response = await apiClient.put<{ success: boolean; data: unknown }>(`/service-subcategories/${id}`, payload);

      const result: { success: boolean; subcategory?: ServiceSubcategory } = {
        success: response.success,
      };

      if (response.data) {
        result.subcategory = normalizeSubcategory(response.data);
      }

      return result;
    } catch (error) {
      console.error('[CRM API] Error updating subcategory:', error);
      return { success: false };
    }
  }

  static async deleteServiceSubcategory(id: string): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.delete<{ success: boolean }>(`/service-subcategories/${id}`);

      return { success: response.success };
    } catch (error) {
      console.error('[CRM API] Error deleting subcategory:', error);
      return { success: false };
    }
  }

  static async reorderServiceSubcategories(items: ReorderItem[]): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.post<{ success: boolean }>(
        '/service-subcategories/reorder',
        items,
      );

      return { success: response.success };
    } catch (error) {
      console.error('[CRM API] Error reordering subcategories:', error);
      return { success: false };
    }
  }

  // ✅ APPOINTMENTS CRUD
  static async getAppointments(params?: { date?: string; staffId?: string }): Promise<{ success: boolean; appointments: Appointment[] }> {
    try {
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
      console.error('[CRM API] Error fetching appointments:', error);
      return { success: true, appointments: [] };
    }
  }

  static async getCalendarAppointments(startDate: string, endDate: string): Promise<{ success: boolean; appointments: unknown[] }> {
    try {
      const response = await apiClient.get<{ success: boolean; data: unknown[] }>(`/appointments/calendar?startDate=${startDate}&endDate=${endDate}`);

      return {
        success: response.success,
        appointments: response.data || []
      };
    } catch (error) {
      console.error('[CRM API] Error fetching calendar appointments:', error);
      return { success: true, appointments: [] };
    }
  }

  static async createAppointment(appointmentData: AppointmentFormData): Promise<{ success: boolean; appointment?: Appointment }> {
    try {
      const response = await apiClient.post<{ success: boolean; data: Appointment }>('/appointments', appointmentData);

      return {
        success: response.success,
        appointment: response.data
      };
    } catch (error) {
      console.error('[CRM API] Error creating appointment:', error);
      return { success: false };
    }
  }

  static async updateAppointment(id: string, appointmentData: Partial<AppointmentFormData>): Promise<{ success: boolean; appointment?: Appointment }> {
    try {
      const response = await apiClient.put<{ success: boolean; data: Appointment }>(`/appointments/${id}`, appointmentData);

      return {
        success: response.success,
        appointment: response.data
      };
    } catch (error) {
      console.error('[CRM API] Error updating appointment:', error);
      return { success: false };
    }
  }

  static async deleteAppointment(id: string): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.delete<{ success: boolean }>(`/appointments/${id}`);

      return { success: response.success };
    } catch (error) {
      console.error('[CRM API] Error deleting appointment:', error);
      return { success: false };
    }
  }

  // ✅ STAFF
  static async getStaff(): Promise<{ success: boolean; staff: unknown[] }> {
    const response = await apiClient.get<{ success: boolean; data: unknown[] }>('/staff');

    if (!response || !response.success) {
      throw new Error('Failed to fetch staff');
    }

    return {
      success: true,
      staff: response.data || []
    };
  }
}