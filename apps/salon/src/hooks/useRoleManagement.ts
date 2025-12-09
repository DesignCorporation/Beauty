import { useCallback, useEffect, useMemo, useState } from 'react'
import apiClient from '../utils/api-client'
import { useTenant } from '../contexts/AuthContext'
import { useStaff, StaffMember } from './useStaff'
import type { TenantRole } from './useAuth'

interface TenantOwnerSummary {
  userId: string
  email: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  avatar?: string | null
  avatarUrl?: string | null
  isPrimary: boolean
  share?: number | null
  createdAt: string
}

export interface StaffMemberWithRoles extends StaffMember {
  tenantRoles: TenantRole[]
}

const TENANT_ROLE_MAP: Record<string, TenantRole> = {
  OWNER: 'OWNER',
  SALON_OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  STAFF_MEMBER: 'STAFF',
  STAFF: 'STAFF',
  RECEPTIONIST: 'RECEPTIONIST',
  ACCOUNTANT: 'ACCOUNTANT'
}

const normalizeTenantRole = (value?: string | null): TenantRole | null => {
  if (!value) return null
  const normalized = TENANT_ROLE_MAP[value.toUpperCase()]
  return normalized ?? null
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

const resolveAssetUrl = (value?: string | null): string | null => {
  if (!value) return null
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  if (value.startsWith('/')) return value
  return `/${value}`
}

export const useRoleManagement = (): {
  owners: TenantOwnerSummary[];
  staff: StaffMemberWithRoles[];
  loading: boolean;
  error: string | null;
  ownersLoading: boolean;
  ownersError: string | null;
  rolesLoading: boolean;
  rolesError: string | null;
  refetch: () => Promise<void>;
  grantRole: (userId: string, role: TenantRole) => Promise<{ success: boolean }>;
  revokeRole: (userId: string, role: TenantRole) => Promise<{ success: boolean }>;
  addCoOwner: (userId: string, share?: number) => Promise<{ success: boolean; owner: TenantOwnerSummary | null }>;
} => {
  const { tenantId } = useTenant()
  const {
    staff,
    loading: staffLoading,
    error: staffError,
    refetch: refetchStaff
  } = useStaff({ bookableOnly: false })

  const [owners, setOwners] = useState<TenantOwnerSummary[]>([])
  const [ownersLoading, setOwnersLoading] = useState(false)
  const [ownersError, setOwnersError] = useState<string | null>(null)

  const [roleAssignments, setRoleAssignments] = useState<Record<string, TenantRole[]>>({})
  const [rolesLoading, setRolesLoading] = useState(false)
  const [rolesError, setRolesError] = useState<string | null>(null)

  const loadOwners = useCallback(async (): Promise<void> => {
    if (!tenantId) {
      setOwners([])
      setOwnersError(null)
      setOwnersLoading(false)
      return
    }

    setOwnersLoading(true)
    setOwnersError(null)

    try {
      const response = await apiClient.get<Record<string, unknown>>(
        `/auth/tenants/${tenantId}/owners`
      )
      const data = response as { success?: boolean; owners?: TenantOwnerSummary[]; error?: string }

      if (!data?.success || !Array.isArray(data.owners)) {
        throw new Error(data?.error || 'Failed to fetch owners')
      }

      const normalized = data.owners.map(owner => {
        const avatar = owner.avatar ?? null
        return {
          ...owner,
          avatar,
          avatarUrl: resolveAssetUrl(avatar)
        }
      })

      setOwners(normalized)
    } catch (error) {
      console.error('[useRoleManagement] Failed to load owners', error)
      const message = error instanceof Error ? error.message : 'Failed to fetch owners'
      setOwnersError(message)
      setOwners([])
    } finally {
      setOwnersLoading(false)
    }
  }, [tenantId])

  const loadRoles = useCallback(async (): Promise<void> => {
    if (!tenantId || !staff.length) {
      setRoleAssignments({})
      setRolesError(null)
      setRolesLoading(false)
      return
    }

    setRolesLoading(true)
    setRolesError(null)

    try {
      const results = await Promise.allSettled(
        staff.map(async member => {
          if (!member.id) return { userId: member.id, roles: [] as TenantRole[] }
          const response = await apiClient.get<Record<string, unknown>>(
            `/auth/users/${member.id}/tenants/${tenantId}/roles`
          )
          const data = response as { success?: boolean; roles?: string[]; error?: string }

          if (!data?.success || !Array.isArray(data.roles)) {
            throw new Error(data?.error || 'Failed to fetch roles')
          }

          return {
            userId: member.id,
            roles: normalizeTenantRoles(data.roles)
          }
        })
      )

      const assignments: Record<string, TenantRole[]> = {}
      const errors: string[] = []

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value?.userId) {
          assignments[result.value.userId] = result.value.roles
        } else if (result.status === 'rejected') {
          errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason))
        }
      })

      if (errors.length) {
        setRolesError(errors[0] ?? null)
      }

      setRoleAssignments(assignments)
    } catch (error) {
      console.error('[useRoleManagement] Failed to load staff roles', error)
      const message = error instanceof Error ? error.message : 'Failed to fetch roles'
      setRolesError(message)
      setRoleAssignments({})
    } finally {
      setRolesLoading(false)
    }
  }, [staff, tenantId])

  useEffect(() => {
    void loadOwners()
  }, [loadOwners])

  useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  const staffWithRoles = useMemo<StaffMemberWithRoles[]>(() => {
    if (!staff.length) return []

    return staff.map(member => {
      const tenantRoles = roleAssignments[member.id] ?? normalizeTenantRoles(member.role ?? null)
      return {
        ...member,
        tenantRoles
      }
    })
  }, [staff, roleAssignments])

  const loading = ownersLoading || rolesLoading || staffLoading
  const error = ownersError ?? rolesError ?? staffError ?? null

  const grantRole = useCallback(async (userId: string, role: TenantRole): Promise<{ success: boolean }> => {
    if (!tenantId) throw new Error('No tenant selected')

    try {
      const response = await apiClient.post<Record<string, unknown>>(
        `/auth/users/${userId}/tenants/${tenantId}/roles`,
        { role }
      )
      const data = response as { success?: boolean; userTenantRole?: { id: string; role: string } | null; error?: string }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to grant role')
      }

      await loadRoles()
      return { success: true }
    } catch (error) {
      console.error('[useRoleManagement] Failed to grant role', error)
      throw error
    }
  }, [tenantId, loadRoles])

  const revokeRole = useCallback(async (userId: string, role: TenantRole): Promise<{ success: boolean }> => {
    if (!tenantId) throw new Error('No tenant selected')

    try {
      const response = await apiClient.delete<Record<string, unknown>>(
        `/auth/users/${userId}/tenants/${tenantId}/roles/${role}`
      )
      const data = response as { success?: boolean; userTenantRole?: { id: string; role: string } | null; error?: string }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to revoke role')
      }

      await loadRoles()
      return { success: true }
    } catch (error) {
      console.error('[useRoleManagement] Failed to revoke role', error)
      throw error
    }
  }, [tenantId, loadRoles])

  const addCoOwner = useCallback(async (userId: string, share: number = 50): Promise<{ success: boolean; owner: TenantOwnerSummary | null }> => {
    if (!tenantId) throw new Error('No tenant selected')

    try {
      const response = await apiClient.post<Record<string, unknown>>(
        `/auth/tenants/${tenantId}/owners`,
        { userId, share }
      )
      const data = response as { success?: boolean; owner?: TenantOwnerSummary | null; error?: string; code?: string }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to add co-owner')
      }

      await loadOwners()
      return { success: true, owner: data.owner ?? null }
    } catch (error) {
      console.error('[useRoleManagement] Failed to add co-owner', error)
      throw error
    }
  }, [tenantId, loadOwners])

  const refetch = useCallback(async (): Promise<void> => {
    await Promise.all([
      loadOwners(),
      loadRoles(),
      refetchStaff()
    ])
  }, [loadOwners, loadRoles, refetchStaff])

  return {
    owners,
    staff: staffWithRoles,
    loading,
    error,
    ownersLoading,
    ownersError,
    rolesLoading: rolesLoading || staffLoading,
    rolesError: rolesError ?? staffError ?? null,
    refetch,
    grantRole,
    revokeRole,
    addCoOwner
  }
}
