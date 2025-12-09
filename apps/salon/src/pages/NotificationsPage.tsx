import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge, PageContainer, SidebarTrigger } from '@beauty-platform/ui';
import { Bell, Check, Trash2, Mail, MessageSquare, Smartphone, Webhook, AlertCircle, CheckCircle, Clock, Filter } from 'lucide-react';
import { useNotificationToast } from '../hooks/useNotificationToast';
import { useNotifications } from '../hooks/useNotifications';
import { PageHeader } from '../components/layout/PageHeader';

type FilterType = 'all' | 'unread' | 'important';

export default function NotificationsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { showSuccess, showError, showInfo } = useNotificationToast();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    deleteNotification: deleteNotificationMutation,
  } = useNotifications();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'unread') {
      return notifications.filter((notification) => notification.status !== 'READ');
    }
    if (activeFilter === 'important') {
      return notifications.filter(
        (notification) => notification.priority === 'HIGH' || notification.priority === 'URGENT'
      );
    }
    return notifications;
  }, [notifications, activeFilter]);

  const importantCount = useMemo(
    () => notifications.filter((notification) => notification.priority === 'HIGH' || notification.priority === 'URGENT').length,
    [notifications]
  );

  const typeIcons = useMemo(() => ({ 
    EMAIL: <Mail className="h-4 w-4" />,
    SMS: <MessageSquare className="h-4 w-4" />,
    PUSH: <Smartphone className="h-4 w-4" />,
    IN_APP: <Bell className="h-4 w-4" />,
    WEBHOOK: <Webhook className="h-4 w-4" />
  }), []);

  const statusBadges = useMemo(() => ({ 
    READ: <Badge variant="secondary" className="text-xs">{t('notifications.status.read')}</Badge>,
    DELIVERED: <Badge variant="default" className="text-xs bg-success text-success-foreground">{t('notifications.status.delivered')}</Badge>,
    SENT: <Badge variant="default" className="text-xs bg-info text-info-foreground">{t('notifications.status.sent')}</Badge>,
    PENDING: <Badge variant="outline" className="text-xs">{t('notifications.status.pending')}</Badge>,
    FAILED: <Badge variant="destructive" className="text-xs">{t('notifications.status.error')}</Badge>
  }), [t]);

  const typeStyles = useMemo(
    () => ({
      EMAIL: { border: 'border-t-info', bg: 'bg-info/20' },
      SMS: { border: 'border-t-primary', bg: 'bg-primary/20' },
      PUSH: { border: 'border-t-warning', bg: 'bg-warning/20' },
      IN_APP: { border: 'border-t-border', bg: 'bg-muted/40' },
      WEBHOOK: { border: 'border-t-success', bg: 'bg-success/20' }
    }),
    []
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 1) return t('notifications.time.justNow');
    if (diffMins < 60) return t('notifications.time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('notifications.time.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('notifications.time.daysAgo', { count: diffDays });

    return date.toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await markNotificationAsRead(notificationId);
        showSuccess(t('notifications.success_marked_as_read'));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
        showError(t('common.error'), t('notifications.error_marked_as_read'));
      }
    },
    [markNotificationAsRead, showSuccess, showError, t]
  );

  const handleDeleteNotification = useCallback(
    async (notificationId: string) => {
      if (!confirm(t('messages.confirmDelete'))) return;
      try {
        await deleteNotificationMutation(notificationId);
        showInfo(t('notifications.info_deleted'));
      } catch (err) {
        console.error('Failed to delete notification:', err);
        showError(t('common.error'), t('notifications.error_deleted'));
      }
    },
    [deleteNotificationMutation, showInfo, showError, t]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const updated = await markAllNotificationsAsRead();
      const count = updated || unreadCount;
      showSuccess(t('notifications.success_marked_all_as_read', { count }));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      showError(t('common.error'), t('notifications.error_marked_as_read'));
    }
  }, [markAllNotificationsAsRead, showSuccess, showError, t, unreadCount]);

  return (
    <PageContainer variant="full-width" className="bg-background min-h-screen">
      <div className="mx-auto max-w-[1440px] px-14 py-10 space-y-8">
        <PageHeader
          title={
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <Bell className="h-8 w-8 text-muted-foreground" />
                <span className="uppercase">{t(`notifications.title`)}</span>
              </div>
            </div>
          }
          actions={
            <Button onClick={() => void handleMarkAllAsRead()} disabled={unreadCount === 0} className="bg-card shadow-none border border-border text-foreground hover:bg-muted">
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('notifications.actions.markAllAsRead')}
            </Button>
          }
        />

        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground mr-2">{t('notifications.filters.title')}:</span>
              <Button variant={activeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => void setActiveFilter('all')}>
                {t('notifications.filters.all')}
                <Badge variant="secondary" className="ml-2">{notifications.length}</Badge>
              </Button>
              <Button variant={activeFilter === 'unread' ? 'default' : 'outline'} size="sm" onClick={() => void setActiveFilter('unread')}>
                {t('notifications.filters.unread')}
                {unreadCount > 0 && <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>}
              </Button>
              <Button variant={activeFilter === 'important' ? 'default' : 'outline'} size="sm" onClick={() => void setActiveFilter('important')}>
                {t('notifications.filters.important')}
                <Badge variant="secondary" className="ml-2">{importantCount}</Badge>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">{t(`notifications.title`)}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {filteredNotifications.length === 0 ? t('notifications.noNotifications') : t('notifications.found_plural', { count: filteredNotifications.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
                <p className="text-lg">{t('notifications.loading')}</p>
              </div>
          )}

          {error && (
            <div className="text-center py-12 text-destructive">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-medium">{t('notifications.error_title')}</p>
              <p className="text-sm mt-2">{error}</p>
              <Button onClick={() => void refetch()} className="mt-4" variant="outline">{t('notifications.actions.retry')}</Button>
            </div>
          )}

          {!isLoading && !error && filteredNotifications.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">{t(`notifications.emptyState.${activeFilter}_title`)}</p>
              <p className="text-sm mt-2">{t(`notifications.emptyState.${activeFilter}_description`)}</p>
            </div>
          )}

          {!isLoading && !error && filteredNotifications.length > 0 && (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={[
                    'border-0 border-t p-4 transition bg-muted/40',
                    notification.status !== 'READ' ? 'ring-1 ring-primary/20' : '',
                    typeStyles[notification.type]?.border ?? 'border-t-border',
                    typeStyles[notification.type]?.bg ?? '',
                    'hover:bg-muted/40'
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1 text-muted-foreground">{typeIcons[notification.type] || <Bell className="h-4 w-4" />}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-foreground">{notification.title}</h4>
                          {statusBadges[notification.status]}
                          {(notification.priority === 'HIGH' || notification.priority === 'URGENT') && (
                            <Badge variant="destructive" className="text-xs">{t(`notifications.priority.${notification.priority}`)}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatDate(notification.createdAt)}</span>
                          <span>•</span>
                          <span className="capitalize">{t(`notifications.types.${notification.type}`)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {notification.status !== 'READ' && (
                        <Button size="sm" variant="ghost" onClick={() => void handleMarkAsRead(notification.id)} title={t('notifications.actions.markAsRead')}>
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleDeleteNotification(notification.id)}
                        title={t('notifications.actions.delete')}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
