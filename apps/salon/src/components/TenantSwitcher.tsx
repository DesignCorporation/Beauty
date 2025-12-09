import React from 'react'
import { Link } from 'react-router-dom'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  Badge
} from '@beauty-platform/ui'
import { Building2, Check, Scissors, Sparkles, Plus, Loader2, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthContext, useTenant } from '../contexts/AuthContext'
import { toast } from 'sonner'
import type { TenantRole } from '../hooks/useAuth'
import apiClient from '../utils/api-client'

const roleLabelMap: Record<TenantRole, string> = {
  OWNER: 'tenantSwitcher.roles.owner',
  MANAGER: 'tenantSwitcher.roles.manager',
  STAFF: 'tenantSwitcher.roles.staff',
  RECEPTIONIST: 'tenantSwitcher.roles.receptionist',
  ACCOUNTANT: 'tenantSwitcher.roles.accountant'
}

const roleBadgeVariant: Record<TenantRole, 'default' | 'secondary' | 'outline'> = {
  OWNER: 'default',
  MANAGER: 'secondary',
  RECEPTIONIST: 'secondary',
  ACCOUNTANT: 'outline',
  STAFF: 'outline'
}

const TenantSwitcher: React.FC = () => {
  const { t } = useTranslation()
  const { user, loading, refetch } = useAuthContext()
  const { tenantId, tenantName, tenants } = useTenant()
  const [isOpen, setIsOpen] = React.useState(false)
  const [switchingTenantId, setSwitchingTenantId] = React.useState<string | null>(null)

  const resolveAssetUrl = React.useCallback((value?: string | null) => {
    if (!value) return null
    if (value.startsWith('http://') || value.startsWith('https://')) return value
    if (value.startsWith('/')) return value
    return `/${value}`
  }, [])

  const currentMembership =
    (tenantId ? tenants.find((tenant: typeof tenants[0]) => tenant.tenantId === tenantId) : null) ?? tenants[0] ?? null

  const currentLogo = React.useMemo(() => 
    resolveAssetUrl(currentMembership?.logoUrl ?? user?.tenant?.logoUrl ?? user?.logoUrl ?? null),
    [currentMembership, user, resolveAssetUrl]
  )

  const otherTenants = React.useMemo(() => 
    tenants.filter((tenant: typeof tenants[0]) => tenant.tenantId !== currentMembership?.tenantId),
    [tenants, currentMembership]
  )

  const handleSwitch = React.useCallback(async (targetTenantId: string) => {
    if (targetTenantId === (currentMembership?.tenantId ?? tenantId ?? null)) {
      return
    }

    const targetMembership = tenants.find(tenant => tenant.tenantId === targetTenantId)
    const fallbackTenantName = targetMembership?.tenantName ?? ''

    try {
      setSwitchingTenantId(targetTenantId)
      const response = await apiClient.post<{
        success: boolean
        tenant?: { id: string; name: string }
        message?: string
      }>('/auth/switch-tenant', { tenantId: targetTenantId })

      await refetch()

      if (response?.success) {
        const description =
          response.tenant?.name ??
          fallbackTenantName

        toast.success(
          t('tenantSwitcher.toast.switched', 'Салон переключен'),
          {
            description: description || undefined
          }
        )
      } else {
        const description = fallbackTenantName

        toast.info(
          t('tenantSwitcher.toast.switched', 'Салон переключен'),
          {
            description: description || undefined
          }
        )
      }
    } catch (error) {
      const title = t('tenantSwitcher.toast.error', 'Не удалось переключиться на выбранный салон')
      const message =
        error instanceof Error
          ? error.message
          : title

      toast.error(
        title,
        { description: message === title ? undefined : message }
      )
    } finally {
      setSwitchingTenantId(null)
    }
  }, [currentMembership, tenantId, tenants, t, refetch])

  const content = React.useMemo(() => {
    if (loading) {
      return (
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3">
              <div className="size-10 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1">
                <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      )
    }

    if (!currentMembership) {
      return (
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-dashed">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">
                  {t('tenantSwitcher.empty.title', 'Нет салонов')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('tenantSwitcher.empty.subtitle', 'Создайте первый салон чтобы начать работу')}
                </p>
              </div>
            </SidebarMenuButton>
            <div className="mt-3">
              <Link
                to="/onboarding/create-salon"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
              >
                <Plus className="h-4 w-4" />
                {t('tenantSwitcher.actions.register', 'Зарегистрировать салон')}
              </Link>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      )
    }

    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/40 bg-card">
                  {currentLogo ? (
                    <img src={currentLogo} alt={tenantName ?? currentMembership.tenantName} className="h-full w-full object-cover" />
                  ) : (
                    <Scissors className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-1 flex-col text-left">
                  <span className="truncate text-base font-medium text-foreground">
                    {tenantName ?? currentMembership.tenantName}
                  </span>
                  {/* role label intentionally hidden */}
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg"
              side="bottom"
              align="start"
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs font-semibold uppercase text-muted-foreground">
                {t('tenantSwitcher.dropdown.current', 'Текущий салон')}
              </DropdownMenuLabel>
              <DropdownMenuItem className="gap-2 p-3" disabled>
                <div className="flex size-8 items-center justify-center rounded-md border bg-muted">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {tenantName ?? currentMembership.tenantName}
                  </p>
                  {/* role badge intentionally hidden */}
                </div>
                <Check className="h-4 w-4 text-primary" />
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs font-semibold uppercase text-muted-foreground">
                {t('tenantSwitcher.dropdown.other', 'Другие салоны')}
              </DropdownMenuLabel>

              {otherTenants.length === 0 ? (
                <DropdownMenuItem disabled className="p-3 text-sm text-muted-foreground">
                  {t('tenantSwitcher.dropdown.noOther', 'Больше салонов нет')}
                </DropdownMenuItem>
              ) : (
                otherTenants.map((tenant: typeof tenants[0]) => {
                  const roleVariant = roleBadgeVariant[tenant.role as TenantRole] ?? 'outline'
                  const roleLabel = roleLabelMap[tenant.role as TenantRole] ?? tenant.role
                  return (
                    <DropdownMenuItem
                      key={tenant.tenantId}
                      className="gap-2 p-3"
                      disabled={!!switchingTenantId}
                      onSelect={() => handleSwitch(tenant.tenantId)}
                    >
                      <div className="flex size-8 items-center justify-center rounded-md border bg-transparent">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {tenant.tenantName}
                        </p>
                        <Badge
                          variant={roleVariant}
                          className="mt-1 text-[10px]"
                        >
                          {t(roleLabel as any)}
                        </Badge>
                      </div>
                      {switchingTenantId === tenant.tenantId ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : null}
                    </DropdownMenuItem>
                  )
                })
              )}

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs font-semibold uppercase text-muted-foreground">
                {t('tenantSwitcher.dropdown.actions', 'Действия')}
              </DropdownMenuLabel>

              <DropdownMenuItem className="gap-2 p-3" asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-md border">
                    <Settings className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">
                    {t('tenantSwitcher.actions.openSettings', 'Настройки салона')}
                  </span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-2 p-3" asChild>
                <Link to="/settings/theme" className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-md border">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">
                    {t('tenantSwitcher.actions.theme', 'Тема')}
                  </span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-2 p-3" asChild>
                <Link to="/onboarding/create-salon" className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-md border border-dashed">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">
                    {t('tenantSwitcher.actions.register', 'Зарегистрировать новый салон')}
                  </span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-2 p-3" asChild>
                <Link to="/salon/add-existing" className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-md border border-dashed">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">
                    {t('tenantSwitcher.actions.addExisting', 'Добавить существующий салон')}
                  </span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem disabled className="p-3 text-xs text-muted-foreground">
                {t('tenantSwitcher.actions.inviteOwner', 'Чтобы добавить владельца, перейдите в настройки салона')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }, [loading, currentMembership, tenantName, isOpen, setIsOpen, currentLogo, otherTenants, switchingTenantId, handleSwitch, t])

  return content
}

export default TenantSwitcher
