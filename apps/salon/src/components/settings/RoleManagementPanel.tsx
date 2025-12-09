import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@beauty-platform/ui'
import { Crown, Loader2, RefreshCw, ShieldAlert, UserCircle, UsersRound } from 'lucide-react'
import { useRoleManagement } from '../../hooks/useRoleManagement'
import { usePermissions } from '../../hooks/usePermissions'
import type { TenantRole } from '../../hooks/useAuth'

const RoleManagementPanel: React.FC = () => {
  const { t } = useTranslation()
  const {
    owners,
    staff,
    error,
    ownersLoading,
    ownersError,
    rolesLoading,
    rolesError,
    refetch
  } = useRoleManagement()
  const permissions = usePermissions()

  const showOwnersError = ownersError ?? error
  const showRolesError = rolesError ?? error

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base font-medium">{t('settings.roleManagement.ownersTitle')}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">{t('settings.roleManagement.ownersDescription')}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!permissions.canAddCoOwner}
            className="flex items-center gap-2 bg-card shadow-none border-border hover:bg-muted"
          >
            <Crown className="h-4 w-4" />
            {t('settings.roleManagement.addOwner')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {ownersLoading ? (
            <div className="space-y-3">
              {[0, 1].map(index => (
                <div
                  key={index}
                  className="flex items-center gap-4 rounded-lg border border-border/60 bg-muted/40 p-4 animate-pulse"
                >
                  <div className="h-12 w-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                  <div className="h-3 w-16 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : showOwnersError ? (
            <div className="flex flex-col gap-3 rounded-lg border border-error/40 bg-error/10 p-4 text-sm text-error">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                <span>{showOwnersError}</span>
              </div>
              <Button variant="outline" size="sm" onClick={refetch} className="self-start">
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('settings.roleManagement.retry')}
              </Button>
            </div>
          ) : owners.length === 0 ? (
            <div className="flex items-center gap-2 border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <Crown className="h-4 w-4" />
              <span>{t('settings.roleManagement.emptyOwners')}</span>
            </div>
          ) : (
            <div className="space-y-3">
              {owners.map(owner => {
                const initials = `${owner.firstName?.[0] ?? ''}${owner.lastName?.[0] ?? ''}`.toUpperCase() || 'U'
                const fullName = `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim() || owner.email

                return (
                  <div
                    key={owner.userId}
                    className="flex flex-col gap-3 border border-border bg-card p-4 transition hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                        {owner.avatarUrl ? (
                          <img
                            src={owner.avatarUrl}
                            alt={fullName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-muted-foreground">{initials}</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-medium text-foreground">{fullName}</span>
                          {owner.isPrimary ? (
                            <Badge variant="default" className="flex items-center gap-1">
                              <Crown className="h-3 w-3" />
                              {t('settings.roleManagement.primaryBadge')}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {owner.email || t('settings.roleManagement.ownersFallbackEmail')}
                        </p>
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">
                        {t('settings.roleManagement.shareLabel', { value: owner.share ?? 0 })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-none border-0 border-t border-border bg-card shadow-none">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base font-medium">{t('settings.roleManagement.staffTitle')}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">{t('settings.roleManagement.staffDescription')}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} className="flex items-center gap-2 bg-card shadow-none border-border hover:bg-muted">
            {rolesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t('settings.roleManagement.retry')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {rolesLoading && !staff.length ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('settings.roleManagement.loading')}</span>
            </div>
          ) : showRolesError ? (
            <div className="flex flex-col gap-3 border border-error/40 bg-error/10 p-4 text-sm text-error">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                <span>{showRolesError}</span>
              </div>
              <Button variant="outline" size="sm" onClick={refetch} className="self-start">
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('settings.roleManagement.retry')}
              </Button>
            </div>
          ) : staff.length === 0 ? (
            <div className="flex items-center gap-2 border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <UsersRound className="h-4 w-4" />
              <span>{t('settings.roleManagement.emptyStaff')}</span>
            </div>
          ) : (
            <div className="space-y-3">
              {staff.map(member => {
                const initials = `${member.firstName?.[0] ?? ''}${member.lastName?.[0] ?? ''}`.toUpperCase() || 'U'
                const fullName = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || member.email
                const roles = member.tenantRoles.length
                  ? member.tenantRoles
                  : mapMemberRoles(member.role ?? null)

                return (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 border border-border bg-card p-4 transition hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-semibold text-muted-foreground">{initials}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-medium text-foreground">{fullName}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {roles.length ? (
                          roles.map(role => (
                            <Badge key={role} variant="secondary" className="uppercase tracking-wide">
                              {t(`tenantSwitcher.roles.${role}`, role)}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline">{t('settings.roleManagement.rolesLabel')}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <Button variant="ghost" size="sm" disabled className="flex items-center gap-2 text-muted-foreground">
                        <UserCircle className="h-4 w-4" />
                        {t('settings.roleManagement.manageRoles')}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const mapMemberRoles = (roles?: string | string[] | TenantRole[] | null): TenantRole[] => {
  if (!roles) return []
  const list = Array.isArray(roles) ? roles : [roles]
  const normalized: TenantRole[] = []

  list.forEach(item => {
    const value = typeof item === 'string' ? item.toUpperCase() : item
    const role =
      value === 'SALON_OWNER'
        ? 'OWNER'
        : value === 'STAFF_MEMBER'
          ? 'STAFF'
          : (value as TenantRole)

    if (role && !normalized.includes(role)) {
      normalized.push(role)
    }
  })

  return normalized
}

export default RoleManagementPanel
