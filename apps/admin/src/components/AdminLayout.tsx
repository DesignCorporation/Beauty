import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset
} from '@beauty-platform/ui'
import {
  Building2,
  Users,
  BarChart3,
  Shield,
  Database,
  LogOut,
  Crown,
  BookOpen,
  Image,
  Target,
  Activity,
  HardDrive,
  CreditCard
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import RightSidebar, {
  createSalonsConfig,
  createUsersConfig,
  createAnalyticsConfig,
  type SidebarConfig
} from './RightSidebar'

// Компоненты страниц
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const SalonsPage = lazy(() => import('../pages/SalonsPage'))
const UsersPage = lazy(() => import('../pages/UsersPage'))
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'))
const SecurityPage = lazy(() => import('../pages/SecurityPage'))
const SystemPage = lazy(() => import('../pages/SystemPage'))
const ImagesPage = lazy(() => import('../pages/ImagesPage'))
const DocumentationPage = lazy(() => import('../pages/DocumentationPage'))
const ServicesMonitoringPage = lazy(() => import('../pages/ServicesMonitoringPage'))
const BackupsPage = lazy(() => import('../pages/BackupsPage'))
const BillingPage = lazy(() => import('../pages/BillingPage'))
const CRMClientsDiagnostics = lazy(() => import('./CRMClientsDiagnostics').then(mod => ({ default: mod.CRMClientsDiagnostics })))
const ConnectionMapPage = lazy(() => import('../pages/ConnectionMapPage'))

const ContentLoader = () => (
  <div className="flex flex-1 items-center justify-center">
    <span className="text-sm text-muted-foreground">Загрузка раздела…</span>
  </div>
)

// Все доступные пункты меню
const getAllMenuItems = (t: any) => [
  {
    title: t('navigation.dashboard'),
    url: "/",
    icon: BarChart3,
    requiredRole: ['SUPER_ADMIN', 'SALON_OWNER', 'STAFF'],
    requiresTenant: false,
  },
  {
    title: t('navigation.salons'),
    url: "/salons",
    icon: Building2,
    requiredRole: ['SUPER_ADMIN', 'SALON_OWNER'],
    requiresTenant: false,
  },
  {
    title: t('navigation.users'),
    url: "/users",
    icon: Users,
    requiredRole: ['SUPER_ADMIN'],
    requiresTenant: false,
  },
  {
    title: t('navigation.analytics'),
    url: "/analytics",
    icon: BarChart3,
    requiredRole: ['SUPER_ADMIN'],
    requiresTenant: false,
  },
  {
    title: "Подписка",
    url: "/billing",
    icon: CreditCard,
    requiredRole: ['SUPER_ADMIN'],
    requiresTenant: false,
  },
  {
    title: t('navigation.security'),
    url: "/security",
    icon: Shield,
    requiredRole: ['SUPER_ADMIN'],
    requiresTenant: false,
  },
  {
    title: t('navigation.system'),
    url: "/system",
    icon: Database,
    requiredRole: ['SUPER_ADMIN'],
    requiresTenant: false,
  },
  {
    title: t('navigation.services_monitoring'),
    url: "/services-monitoring",
    icon: Activity,
    requiredRole: ['SUPER_ADMIN'],
    requiresTenant: false,
  },
  {
    title: 'Карта подключений',
    url: "/connection-map",
    icon: Database,
    requiredRole: ['SUPER_ADMIN'],
    requiresTenant: false,
  },
  {
    title: t('navigation.backups'),
    url: "/backups",
    icon: HardDrive,
    requiredRole: ['SUPER_ADMIN'],
    requiresTenant: false,
  },
  {
    title: t('navigation.images'),
    url: "/images",
    icon: Image,
    requiredRole: ['SUPER_ADMIN'],
    requiresTenant: false,
  },
  {
    title: t('navigation.documentation'),
    url: "/documentation",
    icon: BookOpen,
    requiredRole: ['SUPER_ADMIN', 'SALON_OWNER', 'STAFF'],
    requiresTenant: false,
  },
  {
    title: 'CRM Диагностика',
    url: "/crm-diagnostics",
    icon: Target,
    requiredRole: ['SUPER_ADMIN'],
    requiresTenant: false,
  },
]

// Функция для фильтрации меню на основе роли и tenantId
const getFilteredMenuItems = (t: any, userRole: string | undefined, hasTenant: boolean) => {
  return getAllMenuItems(t).filter(item => {
    // Проверяем роль
    if (!item.requiredRole.includes(userRole || '')) {
      return false
    }

    // Проверяем требуемый tenantId (если нужно)
    if (item.requiresTenant && !hasTenant) {
      return false
    }

    return true
  })
}

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()

  const handleLogout = () => {
    logout()
  }

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user?.email || 'Admin'
  }

  // Функция для определения конфигурации правого sidebar
  const getRightSidebarConfig = (): SidebarConfig | null => {
    const path = location.pathname

    // DocumentationPage сама управляет своим sidebar, поэтому не нужно здесь
    if (path.startsWith('/documentation')) {
      return null
    } else if (path === '/salons') {
      return createSalonsConfig()
    } else if (path === '/users') {
      return createUsersConfig()
    } else if (path === '/analytics') {
      return createAnalyticsConfig()
    }
    
    return null // Скрыть sidebar на остальных страницах
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar side="left" variant="sidebar" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
              <Crown className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              Beauty Platform
              <div className="text-xs text-sidebar-foreground/60 font-normal">
                Admin Panel
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Управление</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {getFilteredMenuItems(t, user?.role, !!user?.tenantId).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url} className="flex items-center gap-3">
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-sidebar-accent rounded-full flex items-center justify-center">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-medium truncate">
                      {getUserDisplayName()}
                    </span>
                    <span className="text-xs text-sidebar-foreground/60">
                      {user?.role === 'SUPER_ADMIN' ? t('users.roles.SUPER_ADMIN') : user?.role}
                    </span>
                  </div>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                className="text-destructive hover:bg-destructive/10" 
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                <span className="group-data-[collapsible=icon]:hidden">{t('auth.logout')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b border-border">
          <SidebarTrigger className="-ml-1" />
          <div className="h-4 w-px bg-border mx-2" />
          <h1 className="text-lg font-semibold">Beauty Platform - {t('dashboard.title')}</h1>
          <div className="ml-auto">
            <LanguageSwitcher variant="compact" className="w-auto" />
          </div>
        </header>
        
        <main className="flex-1 p-6">
          <Suspense fallback={<ContentLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/salons" element={<SalonsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/system" element={<SystemPage />} />
              <Route path="/services-monitoring" element={<ServicesMonitoringPage />} />
              <Route path="/connection-map" element={<ConnectionMapPage />} />
              <Route path="/backups" element={<BackupsPage />} />
              <Route path="/images" element={<ImagesPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/documentation/*" element={<DocumentationPage />} />
              <Route path="/crm-diagnostics" element={<CRMClientsDiagnostics />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
      </SidebarInset>
      
      {/* Правая панель - НЕ используем SidebarProvider, чтобы не конфликтовать */}
      {getRightSidebarConfig() && (
        <RightSidebar config={getRightSidebarConfig()} />
      )}
    </SidebarProvider>
  )
}

export default AdminLayout
