import { useMemo } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import type { TenantRole } from './useAuth'

const ROLE_ORDER: Record<TenantRole, number> = {
  OWNER: 5,
  MANAGER: 4,
  RECEPTIONIST: 3,
  ACCOUNTANT: 2,
  STAFF: 1
}

const normalizeTenantRole = (role?: string | null): TenantRole | null => {
  if (!role) return null
  const upper = role.toUpperCase()
  if (upper === 'SALON_OWNER') return 'OWNER'
  if (upper === 'STAFF_MEMBER') return 'STAFF'
  if (upper === 'OWNER' || upper === 'MANAGER' || upper === 'STAFF' || upper === 'RECEPTIONIST' || upper === 'ACCOUNTANT') {
    return upper as TenantRole
  }
  return null
}

const normalizeRequiredRole = (role?: string | null): TenantRole | null => {
  if (!role) return null
  const upper = role.toUpperCase()
  if (upper === 'SALON_OWNER') return 'OWNER'
  if (upper === 'STAFF_MEMBER') return 'STAFF'
  if (upper === 'SUPER_ADMIN') return 'OWNER' // супер админ имеет полноту прав
  if (upper === 'CLIENT') return null
  if (upper === 'OWNER' || upper === 'MANAGER' || upper === 'STAFF' || upper === 'RECEPTIONIST' || upper === 'ACCOUNTANT') {
    return upper as TenantRole
  }
  return null
}

const normalizeTenantRoles = (roles?: TenantRole[] | string[] | string | null): TenantRole[] => {
  if (!roles) return []
  const list = Array.isArray(roles) ? roles : [roles]
  const normalized: TenantRole[] = []

  list.forEach(item => {
    const role = typeof item === 'string' ? normalizeTenantRole(item) : item
    if (role && !normalized.includes(role)) {
      normalized.push(role)
    }
  })

  return normalized
}

const dedupeRoles = (roles: TenantRole[]): TenantRole[] => {
  const seen = new Set<TenantRole>()
  const unique: TenantRole[] = []

  roles.forEach(role => {
    if (!seen.has(role)) {
      seen.add(role)
      unique.push(role)
    }
  })

  return unique
}

const pickPrimaryRole = (roles: TenantRole[]): TenantRole | null => {
  if (!roles.length) return null
  let primary: TenantRole | null = null
  let bestPriority = -Infinity

  roles.forEach(role => {
    const priority = ROLE_ORDER[role] ?? 0
    if (priority > bestPriority) {
      primary = role
      bestPriority = priority
    }
  })

  return primary
}

export interface Permissions {
  role: TenantRole | null
  roles: TenantRole[]
  hasTenantAssigned: boolean
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  hasMinimumRole: (role: string) => boolean
  canManageRoles: boolean
  canAddCoOwner: boolean
  canGrantOwnerRole: boolean
  canRevokeRole: (role: TenantRole) => boolean
  canManageStaff: boolean
  canEditStaff: boolean
  canViewAllAppointments: boolean
  canEditOwnAppointments: boolean
  canManageClients: boolean
  canManageServices: boolean
  canViewPayments: boolean
  canViewAnalytics: boolean
  canEditSalonSettings: boolean
}

export const usePermissions = (): Permissions => {
  const { user } = useAuthContext()
  const tenants = user?.tenants ?? []

  // КРИТИЧНО: Проверяем есть ли у пользователя хотя бы один назначенный салон (tenant)
  const hasTenantAssigned = tenants.length > 0

  const tenantId = user?.tenantId ?? tenants[0]?.tenantId ?? null
  const activeMembership = tenantId
    ? tenants.find(tenant => tenant.tenantId === tenantId) ?? tenants[0]
    : tenants[0]

  const activeRoles = useMemo<TenantRole[]>(() => {
    const combined: TenantRole[] = []

    if (Array.isArray(activeMembership?.roles) && activeMembership.roles.length) {
      combined.push(...activeMembership.roles)
    }

    const membershipRole = normalizeTenantRole(activeMembership?.role)
    if (membershipRole) {
      combined.push(membershipRole)
    }

    combined.push(...normalizeTenantRoles(user?.tenantRoles ?? null))

    const explicitTenantRole = normalizeTenantRole(user?.tenantRole)
    if (explicitTenantRole) {
      combined.push(explicitTenantRole)
    }

    const legacyRole = normalizeTenantRole(user?.role)
    if (legacyRole) {
      combined.push(legacyRole)
    }

    return dedupeRoles(combined)
  }, [activeMembership, user?.tenantRoles, user?.tenantRole, user?.role])

  const role = pickPrimaryRole(activeRoles)

  return useMemo<Permissions>(() => {
    const hasRole = (requiredRole: string) => {
      const normalized = normalizeRequiredRole(requiredRole)
      if (!normalized) return false
      return activeRoles.includes(normalized)
    }

    const hasAnyRole = (roles: string[]) => roles.some(r => hasRole(r))

    const hasMinimumRole = (minimumRole: string) => {
      const normalized = normalizeRequiredRole(minimumRole)
      if (!normalized || !role) return false
      return ROLE_ORDER[role] >= ROLE_ORDER[normalized]
    }

    return {
      role,
      roles: activeRoles,
      hasTenantAssigned,
      hasRole,
      hasAnyRole,
      hasMinimumRole,
      canManageRoles: hasTenantAssigned && activeRoles.some(r => r === 'OWNER' || r === 'MANAGER'),
      canAddCoOwner: hasTenantAssigned && activeRoles.includes('OWNER'),
      canGrantOwnerRole: hasTenantAssigned && activeRoles.includes('OWNER'),
      canRevokeRole: (targetRole: TenantRole) => {
        if (!hasTenantAssigned || !activeRoles.length) return false
        if (targetRole === 'OWNER') {
          return activeRoles.includes('OWNER')
        }
        if (activeRoles.includes('OWNER')) {
          return true
        }
        if (activeRoles.includes('MANAGER')) {
          return ROLE_ORDER['MANAGER'] >= ROLE_ORDER[targetRole]
        }
        return false
      },
      canManageStaff: hasTenantAssigned && activeRoles.some(r => r === 'OWNER' || r === 'MANAGER'),
      canEditStaff: hasTenantAssigned && activeRoles.some(r => r === 'OWNER' || r === 'MANAGER'),
      canViewAllAppointments: hasTenantAssigned && activeRoles.some(r => ['OWNER', 'MANAGER', 'RECEPTIONIST'].includes(r)),
      canEditOwnAppointments: hasTenantAssigned && activeRoles.includes('STAFF'),
      canManageClients: hasTenantAssigned && activeRoles.some(r => ['OWNER', 'MANAGER', 'RECEPTIONIST'].includes(r)),
      canManageServices: hasTenantAssigned && activeRoles.some(r => r === 'OWNER' || r === 'MANAGER'),
      canViewPayments: hasTenantAssigned && activeRoles.some(r => ['OWNER', 'MANAGER', 'ACCOUNTANT'].includes(r)),
      canViewAnalytics: hasTenantAssigned && activeRoles.some(r => ['OWNER', 'MANAGER', 'ACCOUNTANT'].includes(r)),
      canEditSalonSettings: hasTenantAssigned && activeRoles.includes('OWNER')
    }
  }, [activeRoles, role, hasTenantAssigned])
}
