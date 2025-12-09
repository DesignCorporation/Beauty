import { ComponentType, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutShell,
  LayoutNavItem,
  LayoutUser,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Badge,
  Button
} from '@beauty-platform/ui'
import {
  LayoutDashboard,
  Building2,
  Award,
  Gift,
  Calendar,
  Bell,
  Sparkles,
  User,
  Settings,
  LogOut,
  Phone,
  CheckCircle,
  AlertCircle,
  Shield,
  Loader2,
  MessageSquare
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuth'
import { clientApi } from '../services'

interface ClientLayoutProps {
  children: ReactNode
}

type SidebarIcon = ComponentType<{ className?: string }>

const toSidebarIcon = (icon: LucideIcon): SidebarIcon => icon as SidebarIcon

interface NotificationRecord {
  id: string
  title: string
  message: string
  createdAt: string
  readAt?: string | null
  type: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  metadata?: Record<string, unknown> | null
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

const notificationTypeLabel = (type: string, t: ReturnType<typeof useTranslation>['0']) => {
  const normalized = type.replace(/_/g, '-').toLowerCase()
  const category = mapNotificationCategory(type)
  const fallback = t(`pages.notifications.types.${category}`, { defaultValue: category })
  return t(`pages.notifications.types.${normalized}`, { defaultValue: fallback })
}

const formatRelativeTime = (dateString: string, t: ReturnType<typeof useTranslation>['0']) => {
  const value = new Date(dateString)
  const diffMs = Date.now() - value.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return t('pages.notifications.timeAgo.justNow')
  if (diffMinutes < 60) return t('pages.notifications.timeAgo.minutesAgo', { count: diffMinutes })
  if (diffHours < 24) return t('pages.notifications.timeAgo.hoursAgo', { count: diffHours })
  if (diffDays === 1) return t('pages.notifications.timeAgo.yesterday')
  return t('pages.notifications.timeAgo.daysAgo', { count: diffDays })
}

const fetchNotifications = async (): Promise<{ notifications: NotificationRecord[]; unreadCount: number }> => {
  try {
    const response = await clientApi.get<{ notifications?: NotificationRecord[]; unreadCount?: number }>('/client/notifications', {
      method: 'GET',
      skipAuth: true // Don't redirect to /login on 403 (dual portal login scenario)
    })

    if (!response.success) {
      // Suppress 403 errors for non-CLIENT roles (e.g., when SALON_OWNER logged in CRM accesses Client Portal)
      // This is expected behavior when user is logged in to both portals with different roles
      if (response.error?.includes('403') || response.error?.includes('Forbidden') || response.error?.includes('Access denied')) {
        return { notifications: [], unreadCount: 0 }
      }

      throw new Error(response.error || 'FAILED_TO_FETCH_NOTIFICATIONS')
    }

    const payload = response.data ?? {}
    const notifications = (payload.notifications ?? []) as NotificationRecord[]

    return {
      notifications,
      unreadCount: payload.unreadCount ?? notifications.filter(item => !item.readAt).length
    }
  } catch (error: any) {
    // Gracefully handle 403 errors without throwing
    if (error.message?.includes('403') || error.message?.includes('Forbidden') || error.message?.includes('Access denied')) {
      return { notifications: [], unreadCount: 0 }
    }

    // Re-throw other errors
    throw error
  }
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const location = useLocation()
  const { t } = useTranslation()
  const { user, logout, isLoggingOut } = useAuth()
  // Salons loaded via useMySalons but not used in current version

  // TODO: Client Portal needs its own notifications endpoint (not CRM)
  // Temporarily disabled to prevent 403 errors from CRM endpoint
  const notificationQuery = useQuery({
    queryKey: ['client-notifications'],
    queryFn: fetchNotifications,
    enabled: Boolean(user?.email),
    refetchInterval: 15000,
    refetchOnWindowFocus: true
  })
  const notifications = notificationQuery.data?.notifications ?? []
  const unreadCount = notificationQuery.data?.unreadCount ?? 0
  const seenNotificationsRef = useRef<Set<string>>(new Set())

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : t('client.defaultName', { defaultValue: 'Клиент' })

  // Primary navigation items
  const navigation: LayoutNavItem[] = [
    {
      title: t('client.nav.dashboard', { defaultValue: 'Dashboard' }),
      href: '/dashboard',
      icon: toSidebarIcon(LayoutDashboard),
    },
    {
      title: t('client.nav.mySalons', { defaultValue: 'Мои салоны' }),
      href: '/my-salons',
      icon: toSidebarIcon(Building2),
    },
    // ⚠️ СКРЫТО: Loyalty и Referral требуют доработки (Issue #31)
    // Раскомментировать после завершения loyalty/referral backend
    // {
    //   title: t('client.nav.loyalty', { defaultValue: 'Программа лояльности' }),
    //   href: '/loyalty',
    //   icon: Award,
    // },
    // {
    //   title: t('client.nav.referral', { defaultValue: 'Рефералы' }),
    //   href: '/referral',
    //   icon: Gift,
    // },
    {
      title: t('client.nav.appointments', { defaultValue: 'Записи' }),
      href: '/appointments',
      icon: toSidebarIcon(Calendar),
    },
    {
      title: t('client.nav.notifications', { defaultValue: 'Уведомления' }),
      href: '/notifications',
      icon: toSidebarIcon(Bell),
    },
  ]

  const isActiveLink = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/'
    }
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  const layoutInitial = (displayName || user?.email || 'C').charAt(0).toUpperCase()

  const layoutUser: LayoutUser | undefined = user
    ? ({
        displayName,
        email: user.email ?? undefined,
        roleLabel: user.phoneVerified
          ? t('client.phoneVerified', { defaultValue: 'Подтверждён' })
          : t('client.phoneNotVerified', { defaultValue: 'Не подтверждён' }),
        avatarUrl: user.avatar ?? undefined,
        initials: layoutInitial
      } as LayoutUser)
    : undefined

  const userInitial = layoutUser?.initials ?? layoutInitial

  useEffect(() => {
    const unseen = notifications.filter(notification => !notification.readAt)
    unseen.forEach(notification => {
      if (!seenNotificationsRef.current.has(notification.id)) {
        seenNotificationsRef.current.add(notification.id)
        toast(notification.title, {
          description: notification.message,
          action: {
            label: t('pages.notifications.view', { defaultValue: 'Открыть' }),
            onClick: () => {
              window.location.href = '/notifications'
            }
          }
        })
      }
    })
  }, [notifications, t])

  const handleMarkNotification = useCallback(
    async (notificationId: string) => {
      await clientApi.request(`/client/notifications/${notificationId}/read`, {
        method: 'PATCH'
      })
      await notificationQuery.refetch()
    },
    [notificationQuery]
  )

  const handleMarkAll = useCallback(async () => {
    await clientApi.request('/client/notifications/read-all', {
      method: 'PATCH'
    })
    await notificationQuery.refetch()
  }, [notificationQuery])

  // Sidebar header with Beauty Platform branding
  const sidebarHeader = (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-semibold">Beauty Platform</span>
              <span className="text-xs text-muted-foreground">
                {t('client.portal', { defaultValue: 'Клиентский портал' })}
              </span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )

  // Sidebar footer with user menu
  const sidebarFooter = (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={layoutUser?.displayName || layoutUser?.email || t('client.guest', { defaultValue: 'Гость' })}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-primary/10 text-sm font-semibold text-primary">
                    {userInitial}
                  </span>
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{layoutUser?.displayName || layoutUser?.email || t('client.guest', { defaultValue: 'Гость' })}</span>
                {user && (
                  <div className="flex items-center gap-1 text-xs">
                    {user.phoneVerified ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-success" />
                        <span className="text-muted-foreground">{layoutUser?.roleLabel}</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 text-warning" />
                        <span className="text-muted-foreground">{layoutUser?.roleLabel}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side="right"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {layoutUser?.displayName || layoutUser?.email || t('client.myAccount', { defaultValue: 'Мой аккаунт' })}
            </DropdownMenuLabel>
            {user && !user.phoneVerified && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/complete-profile" className="flex items-center">
                    <Phone className="mr-2 h-4 w-4 text-warning" />
                    {t('client.verifyPhone', { defaultValue: 'Подтвердить телефон' })}
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center">
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                {t('client.profile', { defaultValue: 'Профиль' })}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                {t('client.settings', { defaultValue: 'Настройки' })}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={event => {
                event.preventDefault()
                void logout()
              }}
              disabled={isLoggingOut}
              className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut
                ? t('client.loggingOut', { defaultValue: 'Выходим...' })
                : t('client.logout', { defaultValue: 'Выйти' })
              }
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )

  const phoneVerificationBadge = user && !user.phoneVerified ? (
    <Link to="/complete-profile">
      <Badge variant="secondary" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        {t('client.phoneNotVerified', { defaultValue: 'Не подтверждён' })}
      </Badge>
    </Link>
  ) : null

  const topbarActions = (
    <div className="flex items-center gap-3">
      <NotificationBell
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={handleMarkNotification}
        onMarkAllRead={handleMarkAll}
        isLoading={notificationQuery.isFetching}
        translator={t}
      />
      {phoneVerificationBadge}
    </div>
  )

  // Header title + icon (mirrors CRM layout behaviour)
  const currentPage = useMemo(() => {
    const path = location.pathname

    if (path === '/profile' || path.startsWith('/profile/')) {
      return {
        title: t('pages.profile.title'),
        icon: User
      }
    }

    if (path === '/settings' || path.startsWith('/settings')) {
      return {
        title: t('pages.settings.title', { defaultValue: 'Настройки' }),
        icon: Settings
      }
    }

    if (path === '/complete-profile') {
      return {
        title: t('pages.completeProfile.title'),
        icon: Phone
      }
    }

    if (path === '/loyalty' || path.startsWith('/loyalty')) {
      return {
        title: t('client.nav.loyalty', { defaultValue: 'Программа лояльности' }),
        icon: Award
      }
    }

    if (path === '/referral' || path.startsWith('/referral')) {
      return {
        title: t('client.nav.referral', { defaultValue: 'Реферальная программа' }),
        icon: Gift
      }
    }

    if (path === '/appointments' || path.startsWith('/appointments')) {
      return {
        title: t('client.nav.appointments', { defaultValue: 'Записи' }),
        icon: Calendar
      }
    }

    if (path === '/notifications' || path.startsWith('/notifications')) {
      return {
        title: t('client.nav.notifications', { defaultValue: 'Уведомления' }),
        icon: Bell
      }
    }

    if (path === '/csrf-test') {
      return {
        title: 'CSRF Test',
        icon: Shield
      }
    }

    const navItem = navigation.find(item => {
      if (item.href === '/dashboard') {
        return path === '/dashboard' || path === '/' || path === '/home'
      }
      return path === item.href || path.startsWith(item.href + '/')
    })

    if (navItem) {
      return {
        title: navItem.title,
        icon: navItem.icon
      }
    }

    return {
      title: t('client.nav.dashboard', { defaultValue: 'Dashboard' }),
      icon: LayoutDashboard
    }
  }, [location.pathname, navigation, t])

  return (
    <LayoutShell
      primaryNav={navigation}
      sidebarHeaderSlot={sidebarHeader}
      sidebarFooterSlot={sidebarFooter}
      isPrimaryItemActive={(item) => isActiveLink(item.href)}
      renderPrimaryItem={(item, _defaultContent, meta) => (
        <Link to={item.href} className="flex items-center gap-3">
          {item.icon ? <item.icon className="h-6 w-6" /> : null}
          <span className="flex-1 truncate text-base font-normal">{item.title}</span>
          {meta.badge}
        </Link>
      )}
      sidebarProps={{
        variant: 'sidebar',
        collapsible: 'icon',
        side: 'left'
      }}
      mainClassName="bg-muted"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            {currentPage.icon ? <currentPage.icon className="h-6 w-6 text-muted-foreground" /> : null}
            <h1 className="text-2xl font-normal text-foreground">
              {currentPage.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {topbarActions}
          </div>
        </div>
        {children}
      </div>
    </LayoutShell>
  )
}

interface NotificationBellProps {
  notifications: NotificationRecord[]
  unreadCount: number
  onMarkAsRead: (id: string) => void
  onMarkAllRead: () => void
  isLoading: boolean
  translator: ReturnType<typeof useTranslation>['0']
}

function NotificationBell({ notifications, unreadCount, onMarkAsRead, onMarkAllRead, isLoading, translator }: NotificationBellProps) {
  const preview = notifications.slice(0, 5)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" side="bottom" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>{translator('pages.notifications.title', { defaultValue: 'Уведомления' })}</span>
          {unreadCount > 0 && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={event => {
                event.preventDefault()
                onMarkAllRead()
              }}
            >
              {translator('pages.notifications.markAllRead')}
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {translator('pages.notifications.loading', { defaultValue: 'Загружаем уведомления...' })}
          </div>
        ) : preview.length > 0 ? (
          preview.map(notification => (
            <DropdownMenuItem
              key={notification.id}
              className="flex flex-col items-start gap-1 whitespace-normal"
              onClick={event => {
                event.preventDefault()
                onMarkAsRead(notification.id)
              }}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{notification.title}</span>
                <Badge variant="outline" className="text-[10px]">
                  {notificationTypeLabel(notification.type, translator)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
              <span className="text-[11px] text-muted-foreground">
                {formatRelativeTime(notification.createdAt, translator)}
              </span>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {translator('pages.notifications.empty.noNotifications')}
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/notifications" className="flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4" />
            {translator('pages.notifications.viewAll', { defaultValue: 'Все уведомления' })}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
