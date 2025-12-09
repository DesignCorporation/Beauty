import React, { createContext, useContext, ReactNode } from 'react'
import { useAuth, AuthState, TenantRole, TenantMembership, User } from '../hooks/useAuth'

interface AuthContextType extends AuthState {
  login: (credentials: {
    email: string;
    password: string;
    tenantSlug?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  refetch: (force?: boolean, skipAuthPageCheck?: boolean) => Promise<User | null>;
  updateUser: (patch: Partial<User>) => User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
  )
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

const LEGACY_TENANT_ROLE_MAP: Record<string, TenantRole> = {
  OWNER: 'OWNER',
  SALON_OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  STAFF_MEMBER: 'STAFF',
  STAFF: 'STAFF',
  RECEPTIONIST: 'RECEPTIONIST',
  ACCOUNTANT: 'ACCOUNTANT'
}

const TENANT_ROLE_PRIORITY: Record<TenantRole, number> = {
  OWNER: 5,
  MANAGER: 4,
  RECEPTIONIST: 3,
  ACCOUNTANT: 2,
  STAFF: 1
}

const normalizeTenantRole = (role?: string | null): TenantRole | null => {
  if (!role) return null
  const upper = role.toUpperCase()
  return LEGACY_TENANT_ROLE_MAP[upper] ?? null
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
    const priority = TENANT_ROLE_PRIORITY[role] ?? 0
    if (priority > bestPriority) {
      primary = role
      bestPriority = priority
    }
  })

  return primary
}

// Хук для получения tenant-специфичных данных
export const useTenant = (): {
  salonId: string | null;
  tenantId: string | null;
  token: null;
  isAuthenticated: boolean;
  tenantSlug: string | null;
  tenantName: string;
  tenantStatus: string;
  tenantRole: TenantRole | null;
  role: TenantRole | null;
  tenants: TenantMembership[];
} => {
  const { user, isAuthenticated } = useAuthContext()

  return React.useMemo(() => {
    const tenants = (user?.tenants ?? []) as TenantMembership[]
    const tenantId = user?.tenantId ?? tenants[0]?.tenantId ?? null
    const activeTenant = tenantId
      ? tenants.find((tenant: typeof tenants[0]) => tenant.tenantId === tenantId) ?? tenants[0]
      : tenants[0]

    const tenantSlug = activeTenant?.slug ?? user?.tenant?.slug ?? null
    const tenantName = activeTenant?.tenantName ?? user?.tenant?.name ?? 'Beauty CRM'
    const tenantStatus = user?.tenant?.status ?? 'ACTIVE'
    const combinedRoles = dedupeRoles([
      ...(Array.isArray(activeTenant?.roles) ? activeTenant.roles : []),
      ...normalizeTenantRoles(activeTenant?.role ?? null),
      ...normalizeTenantRoles(user?.tenantRoles ?? null),
      ...normalizeTenantRoles(user?.tenantRole ?? null),
      ...normalizeTenantRoles(user?.role ?? null)
    ])
    const tenantRole = pickPrimaryRole(combinedRoles) ?? null
    const primaryRole: TenantRole | null = tenantRole ?? (user?.role ? normalizeTenantRole(user.role) : null)

    return {
      salonId: tenantId,
      tenantId,
      token: null,
      isAuthenticated,
      tenantSlug,
      tenantName,
      tenantStatus,
      tenantRole,
      role: primaryRole,
      tenants
    }
  }, [user, isAuthenticated]);
};
