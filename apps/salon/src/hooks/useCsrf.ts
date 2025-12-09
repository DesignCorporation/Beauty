import { useState, useEffect, useCallback } from 'react';

interface CsrfTokenResponse {
  success: boolean;
  csrfToken: string;
  message?: string;
}

/**
 * Hook для получения и управления CSRF токеном
 * Используется для защиты PUT/POST/DELETE запросов
 */
export function useCsrf(): {
  csrfToken: string | null;
  loading: boolean;
  error: string | null;
  fetchCsrfToken: () => Promise<string | null>;
  getCsrfHeaders: () => Record<string, string>;
  fetchWithCsrf: (url: string, options?: RequestInit) => Promise<Response>;
} {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Получение CSRF токена с сервера
   */
  const fetchCsrfToken = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/csrf-token', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data: CsrfTokenResponse = await response.json();

      if (!data.success || !data.csrfToken) {
        throw new Error('Invalid CSRF token response');
      }

      setCsrfToken(data.csrfToken);
      return data.csrfToken;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch CSRF token';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Автоматическое получение токена при монтировании компонента
   */
  useEffect((): void => {
    void fetchCsrfToken();
  }, [fetchCsrfToken]);

  /**
   * Получение заголовков с CSRF токеном для fetch запросов
   */
  const getCsrfHeaders = useCallback((): Record<string, string> => {
    if (!csrfToken) {
      console.warn('CSRF token not available. Call fetchCsrfToken() first.');
      return {};
    }

    return {
      'X-CSRF-Token': csrfToken,
    };
  }, [csrfToken]);

  /**
   * Wrapper для fetch с автоматическим добавлением CSRF токена
   */
  const fetchWithCsrf = useCallback(
    async (url: string, options: RequestInit = {}) => {
      // Если токена нет, получаем его
      let token = csrfToken;
      if (!token) {
        token = await fetchCsrfToken();
        if (!token) {
          throw new Error('Failed to obtain CSRF token');
        }
      }

      // Добавляем CSRF токен в заголовки
      const headers = {
        ...options.headers,
        'X-CSRF-Token': token,
      };

      // Выполняем запрос
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      // Если получили 403 с CSRF ошибкой, обновляем токен и повторяем
      if (response.status === 403) {
        const errorText = await response.text();
        if (errorText.includes('CSRF') || errorText.includes('csrf')) {
          console.warn('CSRF token expired or invalid. Refreshing...');
          token = await fetchCsrfToken();
          if (token) {
            // Повторяем запрос с новым токеном
            return fetch(url, {
              ...options,
              headers: {
                ...options.headers,
                'X-CSRF-Token': token,
              },
              credentials: 'include',
            });
          }
        }
      }

      return response;
    },
    [csrfToken, fetchCsrfToken]
  );

  return {
    csrfToken,
    loading,
    error,
    fetchCsrfToken,
    getCsrfHeaders,
    fetchWithCsrf,
  };
}
