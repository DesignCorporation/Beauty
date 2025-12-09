// Secure API Client with CSRF protection - ADAPTER for Unified SDK
import { sdkClient } from '../services/sdkClient';

const isDevEnvironment = import.meta.env.DEV;

interface ApiRequestOptions extends RequestInit {
  skipCSRF?: boolean;
}

class SecureApiClient {
  constructor() {
    if (isDevEnvironment) {
      console.debug('SecureApiClient (SDK Adapter) initialized');
    }
  }

  // Основной метод для запросов
  async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const { skipCSRF, ...requestOptions } = options;

    // Endpoint ДОЛЖЕН содержать явный префикс сервиса:
    // /auth/login, /auth/logout, /auth/refresh
    // /crm/clients, /crm/services, /crm/appointments
    // /payments/*, /notifications/*, etc.
    //
    // SDK добавит /api, поэтому:
    // /auth/login → /api/auth/login ✓
    // /crm/clients → /api/crm/clients ✓

    let path = endpoint;
    if (!endpoint.startsWith('http')) {
      // Внутренний путь - используем как есть
      // SDK добавит /api baseUrl
      if (!endpoint.startsWith('/')) {
        path = `/${endpoint}`;
      }
    }

    try {
      // Используем SDK
      // Метод по умолчанию GET
      const method = (requestOptions.method || 'GET').toUpperCase();
      
      return await sdkClient.request<T>(path, {
        method,
        data: requestOptions.body ? JSON.parse(requestOptions.body as string) : undefined,
        headers: requestOptions.headers as Record<string, string>,
        skipCsrf: skipCSRF
      });

    } catch (error: unknown) {
      // Обработка 401 (Token Expired) - попытка рефреша
      // SDK бросает ошибку при 401.
      const isAuthError = error instanceof Error && (
        error.message.includes('401') || 
        error.message.includes('Unauthorized') ||
        error.message.includes('expired') ||
        error.message.includes('INVALID_TOKEN') ||
        error.message.includes('Access token expired') ||
        error.message.includes('Invalid access token')
      );

      if (isAuthError) {
        if (isDevEnvironment) {
          console.debug('API request 401/Expired, attempting refresh...');
        }
        
        const refreshSuccess = await this.refreshToken();
        if (refreshSuccess) {
          // Повторяем запрос рекурсивно
          return this.request<T>(endpoint, options);
        } else {
          this.handleAuthFailure();
          throw new Error('Authentication failed');
        }
      }
      
      throw error;
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      // Вызываем endpoint рефреша через SDK (он уже /auth/refresh если использовать наш префикс)
      // Но здесь мы вызываем напрямую
      await sdkClient.request('/auth/refresh', { method: 'POST' });
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  private handleAuthFailure(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    if (isDevEnvironment) {
      console.debug('Authentication failed - token invalid or expired');
    }
  }

  // Сброс (для совместимости)
  reset(): void {
    sdkClient.clearCsrfCache();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async patch<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new SecureApiClient();
export default apiClient;
