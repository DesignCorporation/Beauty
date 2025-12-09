"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Bell, Check, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from './ui/dropdown-menu';
export function NotificationBell({ serviceUrl = "/api", className, size = "default", variant = "ghost", maxNotifications = 5, onNotificationClick, onSettingsClick }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
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
            }
            else {
                throw new Error(data.message || 'Failed to fetch notifications');
            }
        }
        catch (err) {
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
        }
        finally {
            setIsLoading(false);
        }
    };
    /**
     * Отметить уведомление как прочитанное
     */
    const markAsRead = async (notificationId) => {
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
                setNotifications(prev => prev.map(notification => notification.id === notificationId
                    ? { ...notification, status: 'READ', readAt: new Date().toISOString() }
                    : notification));
                // Уменьшаем счетчик непрочитанных
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        }
        catch (err) {
            console.error('[NotificationBell] Error marking notification as read:', err);
        }
    };
    /**
     * Обработка клика на уведомление
     */
    const handleNotificationClick = (notification) => {
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
    return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: variant, size: size, className: cn("relative", className), disabled: isLoading, children: [_jsx(Bell, { size: iconSizes[size] }), unreadCount > 0 && (_jsx(Badge, { variant: "destructive", className: "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]", children: unreadCount > 99 ? '99+' : unreadCount }))] }) }), _jsxs(DropdownMenuContent, { align: "end", className: "w-80", children: [_jsxs(DropdownMenuLabel, { className: "flex items-center justify-between", children: [_jsx("span", { children: "\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F" }), onSettingsClick && (_jsx(Button, { variant: "ghost", size: "sm", onClick: onSettingsClick, className: "h-6 w-6 p-0", children: _jsx(Settings, { size: 14 }) }))] }), _jsx(DropdownMenuSeparator, {}), error && (_jsx("div", { className: "p-3", children: _jsx(Card, { children: _jsxs(CardContent, { className: "p-3", children: [_jsxs("p", { className: "text-sm text-destructive", children: ["\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438: ", error] }), _jsx(Button, { variant: "outline", size: "sm", onClick: fetchNotifications, className: "mt-2", disabled: isLoading, children: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C" })] }) }) })), !error && notifications.length === 0 && !isLoading && (_jsx("div", { className: "p-4 text-center text-sm text-muted-foreground", children: "\u041D\u0435\u0442 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0439" })), !error && notifications.length > 0 && (_jsxs(_Fragment, { children: [notifications.map((notification) => (_jsx(DropdownMenuItem, { className: "p-0", onSelect: () => handleNotificationClick(notification), children: _jsx(Card, { className: "w-full border-0 shadow-none", children: _jsx(CardContent, { className: "p-3", children: _jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: cn("text-sm font-medium truncate", !notification.readAt && "font-semibold"), children: notification.title }), _jsx("p", { className: "text-xs text-muted-foreground line-clamp-2 mt-1", children: notification.message }), _jsx("p", { className: "text-xs text-muted-foreground mt-1", children: notification.sentAt
                                                                ? new Date(notification.sentAt).toLocaleString('ru-RU')
                                                                : new Date(notification.createdAt).toLocaleString('ru-RU') })] }), _jsxs("div", { className: "flex flex-col items-end gap-1", children: [_jsx(Badge, { variant: notification.readAt ? "secondary" : "default", className: "text-xs", children: notification.type }), notification.readAt && (_jsx(Check, { size: 14, className: "text-green-500" }))] })] }) }) }) }, notification.id))), _jsx(DropdownMenuSeparator, {}), _jsx(DropdownMenuItem, { className: "justify-center", onSelect: () => fetchNotifications(), children: _jsx(Button, { variant: "ghost", size: "sm", disabled: isLoading, children: isLoading ? 'Загрузка...' : 'Обновить' }) })] }))] })] }));
}
