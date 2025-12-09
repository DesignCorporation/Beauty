import { useState, useEffect, useCallback } from 'react';
import { useNotificationSocket } from './useNotificationSocket';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'WEBHOOK';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  sentAt?: string;
  readAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<number>;
  deleteNotification: (notificationId: string) => Promise<void>;
}

let csrfTokenCache: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfTokenCache) return csrfTokenCache;

  // dev gateway может проксировать CRM как /api/crm/*
  // Пробуем только рабочие публичные маршруты, чтобы не создавать лишних 404
  const candidates = [
    '/api/csrf-token',
    '/csrf-token'
  ];

  let lastError: Error | null = null;

  for (const path of candidates) {
    try {
      const response = await fetch(path, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        lastError = new Error(`CSRF fetch failed: HTTP ${response.status} at ${path}`);
        continue;
      }

      const body = await response.json().catch(() => ({}));
      const token = body?.csrfToken || body?.token;
      if (!token) {
        lastError = new Error(`CSRF token missing in response from ${path}`);
        continue;
      }

      csrfTokenCache = token;
      return token;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown CSRF fetch error');
      continue;
    }
  }

  throw lastError || new Error('Failed to fetch CSRF token');
}

async function fetchWithCsrf(path: string, init?: RequestInit, retry = true): Promise<Response> {
  try {
    const csrfToken = await getCsrfToken();

    const response = await fetch(path, {
      credentials: 'include',
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        ...(init?.headers ?? {})
      }
    });

    if (response.status === 403 && retry) {
      // Сбрасываем кеш и пробуем заново (токен мог протухнуть)
      csrfTokenCache = null;
      return fetchWithCsrf(path, init, false);
    }

    return response;
  } catch (error) {
    if (retry) {
      csrfTokenCache = null;
      return fetchWithCsrf(path, init, false);
    }
    throw error;
  }
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notifications/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Gracefully handle 403 errors (dual portal login scenario)
        // When CLIENT role user accesses CRM, notifications endpoint returns 403
        if (response.status === 403 || response.status === 401) {
          console.warn('[CRM] Notifications endpoint returned', response.status, '- suppressing error (likely no salon/permissions yet).');
          setNotifications([]);
          setIsLoading(false);
          return; // Don't set error state for 403
        }

        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setNotifications(data.data?.notifications || []);
    } catch (err) {
      // Suppress 403 errors in console (expected for dual portal login)
      if (
        err instanceof Error &&
        (err.message.includes('403') || err.message.includes('401'))
      ) {
        console.warn('[CRM] Notifications fetch failed with', err.message, '- suppressing error for onboarding scenario');
        setNotifications([]);
      } else {
        console.error('Failed to fetch notifications:', err);
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
        setNotifications([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect((): (() => void) => {
    void fetchNotifications();

    // Обновляем каждые 30 секунд
    const interval = setInterval(() => {
      void fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useNotificationSocket({
    onNotification: () => {
      // Приход нового события — обновляем список
      void fetchNotifications();
    },
    onError: (err) => {
      console.error('[NotificationSocket] error', err.message);
    }
  });

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetchWithCsrf(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${response.status}`);
      }

      const body = await response.json().catch(() => null);
      const updated = body?.data;

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                status: 'READ',
                readAt: updated?.readAt ?? new Date().toISOString(),
              }
            : notification
        )
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      throw err instanceof Error ? err : new Error('Failed to mark notification as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetchWithCsrf('/api/notifications/mark-all-read', {
        method: 'POST'
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${response.status}`);
      }

      const body = await response.json().catch(() => ({ data: { updated: 0 } }));
      const updatedCount = body?.data?.updated ?? 0;
      const readTimestamp = new Date().toISOString();

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.status === 'READ'
            ? notification
            : { ...notification, status: 'READ', readAt: readTimestamp }
        )
      );

      return updatedCount;
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      throw err instanceof Error ? err : new Error('Failed to mark all notifications as read');
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetchWithCsrf(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${response.status}`);
      }

      setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));
    } catch (err) {
      console.error('Failed to delete notification:', err);
      throw err instanceof Error ? err : new Error('Failed to delete notification');
    }
  }, []);

  const unreadCount = notifications.filter(n => n.status !== 'READ').length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
