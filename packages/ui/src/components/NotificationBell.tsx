"use client";

import { useState, useEffect } from 'react';
import { Bell, Check, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

// Types for notification data
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'WEBHOOK';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  sentAt?: string | undefined;
  readAt?: string | undefined;
  createdAt: string;
}

interface NotificationBellProps {
  /**
   * Base URL для notification service
   * @default "/api" (через API Gateway)
   */
  serviceUrl?: string;
  /**
   * Дополнительные CSS классы
   */
  className?: string;
  /**
   * Размер иконки
   * @default "default"
   */
  size?: 'sm' | 'default' | 'lg';
  /**
   * Вариант отображения
   * @default "ghost"
   */
  variant?: 'default' | 'ghost' | 'outline';
  /**
   * Максимальное количество отображаемых уведомлений
   * @default 5
   */
  maxNotifications?: number;
  /**
   * Callback при клике на уведомление
   */
  onNotificationClick?: (notification: Notification) => void;
  /**
   * Callback при клике на настройки
   */
  onSettingsClick?: () => void;
}

export function NotificationBell({
  serviceUrl = "/api",
  className,
  size = "default",
  variant = "ghost",
  maxNotifications = 5,
  onNotificationClick,
  onSettingsClick
}: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Размеры иконки в зависимости от size
  const iconSizes = {
    sm: 16,
    default: 20,
    lg: 24
  };

  /**
   * Загрузка уведомлений с сервера
   */
  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${serviceUrl}/notifications/me`, {
        method: 'GET',
        credentials: 'include', // Отправляем httpOnly cookies
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        const limitedNotifications = data.data.notifications.slice(0, maxNotifications);
        setNotifications(limitedNotifications);
        setUnreadCount(data.data.unreadCount || 0);
      } else {
        throw new Error(data.message || 'Failed to fetch notifications');
      }
    } catch (err) {
      console.error('[NotificationBell] Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');

      // Fallback к mock данным при ошибке
      setNotifications([
        {
          id: 'mock-1',
          title: 'Напоминание о записи',
          message: 'У вас запись через 1 час',
          type: 'EMAIL',
          status: 'SENT',
          sentAt: new Date().toISOString(),
          readAt: undefined,
          createdAt: new Date().toISOString()
        }
      ]);
      setUnreadCount(1);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Отметить уведомление как прочитанное
   */
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`${serviceUrl}/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ read: true }),
      });

      if (response.ok) {
        // Обновляем локальное состояние
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, status: 'READ' as const, readAt: new Date().toISOString() }
              : notification
          )
        );

        // Уменьшаем счетчик непрочитанных
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('[NotificationBell] Error marking notification as read:', err);
    }
  };

  /**
   * Обработка клика на уведомление
   */
  const handleNotificationClick = (notification: Notification) => {
    // Отмечаем как прочитанное если еще не прочитано
    if (!notification.readAt) {
      markAsRead(notification.id);
    }

    // Вызываем callback если предоставлен
    onNotificationClick?.(notification);
  };

  /**
   * Загрузка уведомлений при монтировании компонента
   */
  useEffect(() => {
    fetchNotifications();

    // Устанавливаем интервал для периодического обновления
    const interval = setInterval(fetchNotifications, 30000); // каждые 30 секунд

    return () => clearInterval(interval);
  }, [serviceUrl, maxNotifications]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn("relative", className)}
          disabled={isLoading}
        >
          <Bell size={iconSizes[size]} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Уведомления</span>
          {onSettingsClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSettingsClick}
              className="h-6 w-6 p-0"
            >
              <Settings size={14} />
            </Button>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {error && (
          <div className="p-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-sm text-destructive">
                  Ошибка загрузки: {error}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchNotifications}
                  className="mt-2"
                  disabled={isLoading}
                >
                  Повторить
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {!error && notifications.length === 0 && !isLoading && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Нет уведомлений
          </div>
        )}

        {!error && notifications.length > 0 && (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="p-0"
                onSelect={() => handleNotificationClick(notification)}
              >
                <Card className="w-full border-0 shadow-none">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          !notification.readAt && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.sentAt
                            ? new Date(notification.sentAt).toLocaleString('ru-RU')
                            : new Date(notification.createdAt).toLocaleString('ru-RU')
                          }
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant={notification.readAt ? "secondary" : "default"}
                          className="text-xs"
                        >
                          {notification.type}
                        </Badge>

                        {notification.readAt && (
                          <Check size={14} className="text-green-500" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="justify-center"
              onSelect={() => fetchNotifications()}
            >
              <Button variant="ghost" size="sm" disabled={isLoading}>
                {isLoading ? 'Загрузка...' : 'Обновить'}
              </Button>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type { Notification, NotificationBellProps };
