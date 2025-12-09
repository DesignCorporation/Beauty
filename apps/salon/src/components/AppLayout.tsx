import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutShell,
  LayoutNavItem,
  LayoutUser,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@beauty-platform/ui'
import type { ThemeId } from '@beauty-platform/ui'
import { useTheme } from '@beauty-platform/ui'
import type { LayoutShellProps } from '@beauty-platform/ui'
import {
  Calendar,
  LayoutDashboard,
  Users,
  Scissors,
  UserCheck,
  CreditCard,
  BarChart3,
  HelpCircle,
  CalendarDays,
  Bell, // Используется в sidebar navigation для пункта "Уведомления"
  User,
  LogOut,
  Settings
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
// ❌ УБРАНО: import LanguageSwitcher (не используется после удаления из header)
import { useNotifications } from '../hooks/useNotifications'
import { useAuthContext, useTenant } from '../contexts/AuthContext'
import type { TenantRole, User as AuthUser } from '../hooks/useAuth'
import { HeaderProvider } from '../contexts/HeaderContext'
import apiClient from '../utils/api-client'
import TenantSwitcher from './TenantSwitcher'
import { usePermissions } from '../hooks/usePermissions'

type SidebarIcon = React.ComponentType<{ className?: string }>

const createSidebarIcon = (Icon: LucideIcon): SidebarIcon => {
  const Wrapped: SidebarIcon = ({ className }) => <Icon className={className} strokeWidth={1.5} />
  Wrapped.displayName = Icon.displayName ?? 'SidebarIcon'
  return Wrapped
}

const DashboardSidebarIcon = createSidebarIcon(LayoutDashboard)
const CalendarSidebarIcon = createSidebarIcon(Calendar)
const CalendarDaysSidebarIcon = createSidebarIcon(CalendarDays)
const ServicesSidebarIcon = createSidebarIcon(Scissors)
const ClientsSidebarIcon = createSidebarIcon(Users)
const TeamSidebarIcon = createSidebarIcon(UserCheck)
const PaymentsSidebarIcon = createSidebarIcon(CreditCard)
const AnalyticsSidebarIcon = createSidebarIcon(BarChart3)
const NotificationsSidebarIcon = createSidebarIcon(Bell)
const HelpSidebarIcon = createSidebarIcon(HelpCircle)

const TENANT_ROLE_LABELS: Record<TenantRole, string> = {
  OWNER: 'tenantSwitcher.roles.owner',
  MANAGER: 'tenantSwitcher.roles.manager',
  STAFF: 'tenantSwitcher.roles.staff',
  RECEPTIONIST: 'tenantSwitcher.roles.receptionist',
  ACCOUNTANT: 'tenantSwitcher.roles.accountant'
}

// Навигация будет локализована в компоненте

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();
  const { user: authUser } = useAuthContext();
  const { tenantRole } = useTenant();
  const { tenantId } = useTenant();
  const permissions = usePermissions();
  const { setTheme, setMode, resetToDefault } = useTheme()

  const [storedUser, setStoredUser] = React.useState<AuthUser | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem('user');
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch (error) {
      console.warn('Failed to parse stored user from localStorage:', error);
      return null;
    }
  });

  const [avatarFailed, setAvatarFailed] = React.useState(false);
  const [headerActions, setHeaderActions] = React.useState<React.ReactNode | undefined>(undefined);

  const headerContextValue = React.useMemo(
    () => ({
      setHeader: (node: React.ReactNode) => setHeaderActions(node),
      clearHeader: () => setHeaderActions(undefined)
    }),
    [setHeaderActions]
  );

  React.useEffect(() => {
    if (typeof window === 'undefined' || !authUser) return

    // Если бекенд вернул avatar === undefined, значит значение неизвестно — не затираем сохранённый аватар
    if (!authUser.avatar && storedUser?.id === authUser.id && storedUser?.avatar) {
      return
    }

    try {
      window.localStorage.setItem('user', JSON.stringify(authUser))
      setStoredUser(authUser)
    } catch (error) {
      console.warn('Failed to persist auth user:', error)
    }
  }, [authUser, storedUser?.id])

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'user') {
        try {
          const raw = event.newValue;
          setStoredUser(raw ? (JSON.parse(raw) as AuthUser) : null);
        } catch (error) {
          console.warn('Failed to sync user from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleUserUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ user?: AuthUser }>).detail;
      if (detail?.user) {
        setStoredUser(detail.user);
      }
    };
    window.addEventListener('beauty-user-update', handleUserUpdate as EventListener);
    return () => window.removeEventListener('beauty-user-update', handleUserUpdate as EventListener);
  }, []);

  const resolveAssetUrl = React.useCallback((value?: string | null) => {
    if (!value) return null
    if (value.startsWith('http://') || value.startsWith('https://')) return value
    if (value.startsWith('/')) return value
    return `/${value}`
  }, [])

  const rawAvatar = React.useMemo(() => {
    if (storedUser?.avatar) return storedUser.avatar
    if (authUser?.avatar) return authUser.avatar
    return null
  }, [authUser?.avatar, storedUser?.avatar])

  const resolvedAvatarUrl = React.useMemo(() => resolveAssetUrl(rawAvatar), [rawAvatar, resolveAssetUrl])

  React.useEffect(() => {
    setAvatarFailed(false);
  }, [resolvedAvatarUrl]);

  // Загружаем тему салона при смене tenantId
  React.useEffect(() => {
    if (!tenantId) return

    const storageKey = `salon-theme-${tenantId}`
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      resetToDefault()
      return
    }

    try {
      const payload = JSON.parse(raw) as { themeId?: string; mode?: string }
      if (payload.themeId) {
        setTheme(payload.themeId as ThemeId)
      }
      if (payload.mode && (payload.mode === 'light' || payload.mode === 'dark' || payload.mode === 'system')) {
        setMode(payload.mode)
      }
    } catch (error) {
      console.warn('Failed to restore salon theme for tenant', tenantId, error)
      resetToDefault()
    }
  }, [tenantId, setTheme, setMode, resetToDefault])

  // 🔄 FIX: Читаем salonLogoUrl из localStorage при каждом рендере
  // чтобы обновление было мгновенным после загрузки/удаления
  const navigation: LayoutNavItem[] = React.useMemo(() => {
    const entries: Array<{ visible: boolean; item: LayoutNavItem }> = [
      {
        visible: true,
        item: {
          title: t('navigation.dashboard'),
          href: '/dashboard',
          icon: DashboardSidebarIcon
        }
      },
      {
        // Calendar и Appointments требуют assigned tenant (содержат данные салона)
        visible: permissions.hasTenantAssigned,
        item: {
          title: t('navigation.calendar'),
          href: '/calendar',
          icon: CalendarSidebarIcon
        }
      },
      {
        // Calendar и Appointments требуют assigned tenant (содержат данные салона)
        visible: permissions.hasTenantAssigned,
        item: {
          title: t('navigation.appointments', { defaultValue: 'Записи' }),
          href: '/appointments',
          icon: CalendarDaysSidebarIcon
        }
      },
      {
        visible: permissions.canManageServices,
        item: {
          title: t('navigation.services'),
          href: '/services',
          icon: ServicesSidebarIcon
        }
      },
      {
        visible: permissions.canManageClients,
        item: {
          title: t('navigation.clients'),
          href: '/clients',
          icon: ClientsSidebarIcon
        }
      },
      {
        visible: permissions.canManageStaff,
        item: {
          title: t('navigation.team'),
          href: '/team',
          icon: TeamSidebarIcon
        }
      },
      {
        visible: permissions.canViewPayments,
        item: {
          title: t('navigation.payments'),
          href: '/payments',
          icon: PaymentsSidebarIcon
        }
      },
      {
        visible: permissions.canViewAnalytics,
        item: {
          title: t('navigation.analytics'),
          href: '/analytics',
          icon: AnalyticsSidebarIcon
        }
      },
      {
        // Notifications требует assigned tenant (уведомления от салона)
        visible: permissions.hasTenantAssigned,
        item: {
          title: t('navigation.notifications', { defaultValue: 'Уведомления' }),
          href: '/notifications',
          icon: NotificationsSidebarIcon,
          badge: unreadCount
        }
      },
      {
        visible: true,
        item: {
          title: t('navigation.help', { defaultValue: 'Помощь' }),
          href: '/help',
          icon: HelpSidebarIcon
        }
      }
    ]

    return entries.filter(entry => entry.visible).map(entry => entry.item)
  }, [
    permissions,
    t,
    unreadCount
  ]);

  const secondaryNavigation: LayoutNavItem[] = [];

  // 📍 Определяем текущий раздел (с иконкой) по URL
  const currentPageItem = React.useMemo<LayoutNavItem>(() => {
    const path = location.pathname

    // 🔧 FIX: Специальная обработка для страниц Settings, Profile, UserSettings
    // Эти страницы не в основной навигации (доступны через dropdown меню)
    if (path === '/settings' || path.startsWith('/settings/')) {
      return {
        title: t('navigation.salonSettings', { defaultValue: 'Настройки салона' }),
        href: '/settings/salon'
      };
    }

    if (path === '/profile' || path.startsWith('/profile/')) {
      return {
        title: t('navigation.profile', { defaultValue: 'Профиль пользователя' }),
        href: '/profile'
      };
    }

    if (path === '/user-settings' || path.startsWith('/user-settings/')) {
      return {
        title: t('navigation.userSettings', { defaultValue: 'Настройки пользователя' }),
        href: '/user-settings'
      };
    }

    // Ищем соответствующий пункт меню
    const navItem = navigation.find(item => {
      if (item.href === '/dashboard') {
        return path === '/dashboard' || path === '/dashboard/' || path === '/dashboard/home'
      }
      return path === item.href || path.startsWith(item.href + '/')
    })

    if (navItem) {
      return navItem
    }

    return navigation[0] ?? {
      title: t('navigation.dashboard'),
      href: '/dashboard',
      icon: DashboardSidebarIcon
    }
  }, [location.pathname, navigation, t])

  const isActiveLink = React.useCallback((href: string) => {
    // Проверяем точное совпадение для главной страницы
    if (href === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/' || location.pathname === '/dashboard/home';
    }

    // Для всех остальных проверяем точное совпадение или начало пути
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }, [location.pathname])

  const formatRoleLabel = React.useCallback(
    (tenantRoleValue?: TenantRole | null, legacyRole?: string | null) => {
      if (tenantRoleValue) {
        const translationKey = TENANT_ROLE_LABELS[tenantRoleValue]
        return t(translationKey, tenantRoleValue)
      }

      if (legacyRole) {
        return legacyRole.replace(/_/g, ' ').toLowerCase()
      }

      return undefined
    },
    [t]
  )

  const layoutUser: LayoutUser | undefined = React.useMemo(() => {
    if (authUser) {
      const displayName =
        authUser.firstName && authUser.lastName ? `${authUser.firstName} ${authUser.lastName}` : undefined
      const email = authUser.email ?? undefined
      const initials = (displayName ?? email ?? 'U').trim().charAt(0).toUpperCase()

      return {
        displayName,
        email,
        roleLabel: formatRoleLabel(tenantRole, authUser.role ?? null),
        avatarUrl: resolvedAvatarUrl ?? undefined,
        initials
      } as LayoutUser
    }

    if (storedUser) {
      const displayName =
        storedUser.firstName && storedUser.lastName ? `${storedUser.firstName} ${storedUser.lastName}` : undefined
      const email = storedUser.email ?? undefined
      const initials = (displayName ?? email ?? 'U').trim().charAt(0).toUpperCase()

      return {
        displayName,
        email,
        roleLabel: formatRoleLabel(storedUser.tenantRole ?? null, storedUser.role ?? null),
        avatarUrl: resolvedAvatarUrl ?? undefined,
        initials
      } as LayoutUser
    }

    return undefined
  }, [authUser, formatRoleLabel, resolvedAvatarUrl, storedUser, tenantRole])

  const userInitial = layoutUser?.initials ?? 'U';

  // ❌ УБРАНО: topbarActions (колокольчик уведомлений + переключатель языков)
  // const topbarActions = (
  //   <>
  //     <Link to="/notifications" className="relative inline-flex items-center rounded p-2 transition-colors hover:bg-muted">
  //       <Bell className="h-5 w-5 text-muted-foreground" />
  //       {unreadCount > 0 ? (
  //         <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
  //           {unreadCount}
  //         </span>
  //       ) : null}
  //     </Link>
  //     <LanguageSwitcher variant="compact" />
  //   </>
  // )

  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false)

  const handleLogout = React.useCallback(async () => {
    try {
      try {
        await apiClient.post('/logout', {
          refreshToken: localStorage.getItem('refreshToken') || ''
        })
      } catch (error) {
        console.warn('Logout API call failed:', error)
      }

      apiClient.reset()
      localStorage.removeItem('user')
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('salonLoginData')
      localStorage.removeItem('salonLogoUrl')
      Object.keys(localStorage)
        .filter(key => key.startsWith('userAvatarCache:'))
        .forEach(key => localStorage.removeItem(key))
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)
      apiClient.reset()
      localStorage.clear()
      window.location.href = '/login'
    }
  }, [])

  const sidebarFooter = (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60">
                {resolvedAvatarUrl && !avatarFailed ? (
                  <img
                    src={resolvedAvatarUrl}
                    alt={layoutUser?.displayName || layoutUser?.email || 'Avatar'}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-primary/10 text-sm font-semibold text-primary">
                    {userInitial}
                  </span>
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{layoutUser?.displayName || layoutUser?.email || 'Пользователь'}</span>
                {layoutUser?.roleLabel ? (
                  <span className="truncate text-xs text-muted-foreground">{layoutUser.roleLabel}</span>
                ) : null}
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="right"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {layoutUser?.displayName || layoutUser?.email || 'Пользователь'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center">
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                {t('navigation.profile', { defaultValue: 'Профиль' })}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/user-settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                {t('navigation.settings', { defaultValue: 'Настройки' })}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
              <LogOut className="mr-2 h-4 w-4" />
              {t('navigation.logout', { defaultValue: 'Выйти' })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )

  // Страницы с собственным локальным PageHeader
  const HIDE_GLOBAL_HEADER_PREFIXES = ['/dashboard', '/appointments', '/calendar', '/services', '/clients', '/team', '/payments', '/analytics', '/notifications', '/help', '/settings/salon', '/settings', '/user-settings'];

  const showHeader = React.useMemo(() => {
    const path = location.pathname;
    if (path.includes('/settings')) return false;
    if (path.includes('/user-settings')) return false;
    return !HIDE_GLOBAL_HEADER_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  }, [location.pathname]);

  const pageHeader = showHeader ? (
    <div className="border-b border-border/60 bg-background px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="-ml-1" />
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-3">
            {currentPageItem.icon ? <currentPageItem.icon className="h-5 w-5 text-muted-foreground" /> : null}
            <h1 className="text-2xl font-semibold text-foreground">
              {currentPageItem.title}
            </h1>
          </div>
        </div>
        {headerActions ? (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {headerActions}
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  const layoutShellProps: LayoutShellProps = {
    sidebarHeaderSlot: <TenantSwitcher />,
    sidebarFooterSlot: sidebarFooter,
    primaryNav: navigation,
    secondaryNav: secondaryNavigation,
    isPrimaryItemActive: item => isActiveLink(item.href),
    isSecondaryItemActive: item => isActiveLink(item.href),
    renderPrimaryItem: (item, _defaultContent, meta) => (
      <Link to={item.href} className="flex items-center gap-3">
        {item.icon ? <item.icon className="h-6 w-6 stroke-[1.5] text-foreground" /> : null}
        <span className="flex-1 truncate text-[0.85rem] font-medium text-foreground">{item.title}</span>
        {meta.badge}
      </Link>
    ),
    renderSecondaryItem: item => (
      <Link to={item.href} className="flex items-center gap-3">
        {item.icon ? <item.icon className="h-6 w-6 stroke-[1.5] text-foreground" /> : null}
        <span className="flex-1 truncate text-[0.85rem] font-medium text-foreground">{item.title}</span>
      </Link>
    ),
    sidebarProps: {
      className: 'bg-neutral-200 text-foreground [&_[data-sidebar=sidebar]]:bg-neutral-200 [&_[data-sidebar=sidebar]]:text-foreground'
    },
    mainClassName: 'p-0',
    children: (
      <div className="flex h-full flex-col">
        {pageHeader}
        <div className="flex-1">
          {children}
        </div>
      </div>
    )
  }

  return (
    <HeaderProvider value={headerContextValue}>
      <LayoutShell {...layoutShellProps} />
    </HeaderProvider>
  )
}
