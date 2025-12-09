import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageContainer
} from '@beauty-platform/ui'
import {
  AlertCircle,
  Bell,
  Calendar,
  Check,
  CheckCircle,
  Gift,
  Info,
  Loader2,
  Mail,
  MessageSquare
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import ClientLayout from '../components/ClientLayout'
import { clientApi } from '../services'

type NotificationPriority = 'HIGH' | 'MEDIUM' | 'LOW' | 'URGENT'

type FilterType = 'all' | 'unread'

interface NotificationRecord {
  id: string
  title: string
  message: string
  createdAt: string
  readAt?: string | null
  type: string
  priority: NotificationPriority
  metadata?: Record<string, unknown> | null
}

const PRIORITY_STYLES: Record<'HIGH' | 'MEDIUM' | 'LOW' | 'URGENT', string> = {
  HIGH: 'border-l-4 border-l-destructive/70',
  URGENT: 'border-l-4 border-l-destructive',
  MEDIUM: 'border-l-4 border-l-warning/60',
  LOW: 'border-l-4 border-l-muted'
}

const TYPE_ICONS: Record<string, JSX.Element> = {
  appointment: <Calendar className="h-5 w-5" />,
  loyalty: <Gift className="h-5 w-5" />,
  referral: <Mail className="h-5 w-5" />,
  payment: <CheckCircle className="h-5 w-5" />,
  system: <AlertCircle className="h-5 w-5" />,
  message: <MessageSquare className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />
}

interface NotificationsResponse {
  notifications: NotificationRecord[]
  unreadCount: number
}

const formatRelativeTime = (dateString: string, t: ReturnType<typeof useTranslation>['0']) => {
  const value = new Date(dateString)
  const now = Date.now()
  const diffMs = now - value.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return t('pages.notifications.timeAgo.justNow')
  if (diffMinutes < 60) return t('pages.notifications.timeAgo.minutesAgo', { count: diffMinutes })
  if (diffHours < 24) return t('pages.notifications.timeAgo.hoursAgo', { count: diffHours })
  if (diffDays === 1) return t('pages.notifications.timeAgo.yesterday')
  return t('pages.notifications.timeAgo.daysAgo', { count: diffDays })
}

const mapNotificationCategory = (type: string): string => {
  const upper = type?.toUpperCase() || ''
  if (upper.startsWith('APPOINTMENT')) return 'appointment'
  if (upper.startsWith('LOYALTY')) return 'loyalty'
  if (upper.startsWith('REFERRAL')) return 'referral'
  if (upper.startsWith('PAYMENT')) return 'payment'
  if (upper.startsWith('BIRTHDAY') || upper.startsWith('MARKETING')) return 'system'
  return type?.toLowerCase() || 'system'
}

const formatNotificationTypeLabel = (type: string, t: ReturnType<typeof useTranslation>['0']) => {
  const normalized = type.replace(/_/g, '-').toLowerCase()
  const category = mapNotificationCategory(type)
  const fallback = t(`pages.notifications.types.${category}`, { defaultValue: category })
  return t(`pages.notifications.types.${normalized}`, { defaultValue: fallback })
}

const fetchNotifications = async (): Promise<NotificationsResponse> => {
  const response = await clientApi.get<{ notifications?: NotificationRecord[]; unreadCount?: number }>('/client/notifications')

  if (!response.success) {
    throw new Error(response.error || 'FAILED_TO_FETCH_NOTIFICATIONS')
  }

  const data = response.data ?? {}
  const notifications = (data.notifications ?? []) as NotificationRecord[]
  return {
    notifications,
    unreadCount: data.unreadCount ?? notifications.filter(item => !item.readAt).length
  }
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<FilterType>('all')

  const notificationsQuery = useQuery({
    queryKey: ['client-notifications', 'page'],
    queryFn: fetchNotifications,
    refetchInterval: 15000,
    refetchOnWindowFocus: true
  })

  const notifications = notificationsQuery.data?.notifications ?? []
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter(notification => !notification.readAt)
    }
    return notifications
  }, [notifications, filter])

  const markAsRead = useCallback(
    async (id: string) => {
      await clientApi.request(`/client/notifications/${id}/read`, {
        method: 'PATCH'
      })
      await notificationsQuery.refetch()
    },
    [notificationsQuery]
  )

  const markAllAsRead = useCallback(async () => {
    await clientApi.request('/client/notifications/read-all', {
      method: 'PATCH'
    })
    await notificationsQuery.refetch()
  }, [notificationsQuery])

  return (
    <ClientLayout>
      <PageContainer variant="standard" maxWidth="full" className="space-y-6">
        <div className="flex justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(['all', 'unread'] as FilterType[]).map(option => (
              <Button
                key={option}
                variant={filter === option ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(option)}
                className="gap-2"
              >
                {t(`pages.notifications.filters.${option}`)}
                <Badge variant="secondary">
                  {option === 'all' ? notifications.length : unreadCount}
                </Badge>
              </Button>
            ))}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={markAllAsRead}>
              <Check className="h-4 w-4" />
              {t('pages.notifications.markAllRead')}
              <Badge variant="secondary">{unreadCount}</Badge>
            </Button>
          )}
        </div>

        {notificationsQuery.isLoading ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span>{t('pages.notifications.loading', { defaultValue: 'Loading notifications...' })}</span>
            </CardContent>
          </Card>
        ) : null}

        {!notificationsQuery.isLoading && filteredNotifications.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Bell className="h-12 w-12 text-primary/30" />
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">
                  {filter === 'unread'
                    ? t('pages.notifications.empty.noUnread')
                    : t('pages.notifications.empty.noNotifications')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {filter === 'unread'
                    ? t('pages.notifications.empty.allRead')
                    : t('pages.notifications.empty.checkLater')}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {filteredNotifications.map(notification => {
          const iconKey = mapNotificationCategory(notification.type)
          const icon = TYPE_ICONS[iconKey] ?? <Info className="h-5 w-5" />
          const priorityStyle = PRIORITY_STYLES[notification.priority === 'URGENT' ? 'HIGH' : notification.priority]

          return (
            <Card
              key={notification.id}
              className={`border border-border/60 bg-background ${priorityStyle}`}
            >
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-muted p-2 text-muted-foreground">{icon}</div>
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold text-foreground">
                      {notification.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={notification.readAt ? 'secondary' : 'default'}>
                    {notification.readAt
                      ? t('pages.notifications.status.read')
                      : t('pages.notifications.status.unread')}
                  </Badge>
                  <span>{formatRelativeTime(notification.createdAt, t)}</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{formatNotificationTypeLabel(notification.type, t)}</Badge>
                </div>
                <div className="flex gap-2">
                  {!notification.readAt && (
                    <Button variant="outline" size="sm" onClick={() => markAsRead(notification.id)}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {t('pages.notifications.markAsRead')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </PageContainer>
    </ClientLayout>
  )
}
