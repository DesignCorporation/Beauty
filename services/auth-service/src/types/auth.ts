// Beauty Platform Auth Service Types
// JWT payload, request types, and authentication interfaces

import { UserRole, TenantRole } from '@prisma/client'

// JWT Payload Structure (РАСШИРЕНО для multi-tenant архитектуры)
export interface JWTPayload {
  // User identity
  userId?: string    // Optional для OAuth клиентов
  email: string

  // Current active tenant (если выбран)
  tenantId?: string  // null для SUPER_ADMIN или когда не выбран tenant
  role: UserRole     // Legacy role для обратной совместимости
  tenantRole?: TenantRole  // NEW: Роль в текущем tenant (OWNER, MANAGER, STAFF, etc.)

  // Multi-Tenant Support (NEW)
  tenants?: Array<{
    tenantId: string
    role: TenantRole
    tenantName: string
    slug: string
  }>  // Список всех tenant где user имеет роли

  // Client Profile (NEW)
  isClient?: boolean      // User имеет ClientProfile (был клиентом)
  phoneVerified?: boolean // Для Client Portal
  mfaVerified?: boolean   // SUPER_ADMIN проходил MFA в рамках сессии

  // Optional fields (для Client Portal OAuth)
  firstName?: string
  lastName?: string

  // Device & Permissions (AUTH-3)
  deviceId?: string
  permissions?: string[]

  // JWT metadata
  iat: number
  exp: number
  type: 'access' | 'refresh'
}

// Auth Request Bodies
export interface LoginRequest {
  email: string
  password: string
  tenantSlug?: string  // Optional for tenant-specific login
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  role: UserRole
  tenantId?: string  // Required for non-SUPER_ADMIN users
  invitationCode?: string  // For staff invitations
}

export interface ForgotPasswordRequest {
  email: string
  tenantSlug?: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

// Auth Responses
export interface AuthResponse {
  success: boolean
  accessToken: string
  refreshToken: string
  permissions?: string[]
  deviceId?: string
  onboardingRequired?: boolean
  tenantSelectionRequired?: boolean
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    avatar?: string | null
    role: UserRole
    tenantId: string | undefined
    tenantSlug: string | undefined
    tenantName: string | undefined
    tenants?: Array<{
      tenantId: string
      tenantName: string
      tenantSlug: string
      role: TenantRole
      logoUrl?: string | null
    }>
  }
  expiresIn: number
}

export interface AuthError {
  success: false
  error: string
  code: string
  details?: any
  // MFA-specific fields
  mfaRequired?: boolean
  userId?: string
  email?: string
  role?: string
}

export interface AuthResponseWithMFA extends AuthResponse {
  mfaSetupRequired?: boolean
}

export interface AuthDeviceContext {
  deviceId: string
  userAgent?: string | null
  ipAddress?: string | null
  deviceName?: string | null
}

// Permission System
export interface Permission {
  resource: string    // 'appointments', 'clients', 'services', etc.
  action: string      // 'create', 'read', 'update', 'delete'
  scope: 'own' | 'tenant' | 'all'  // Own records, tenant records, or all records
}

// Role-based permissions mapping
export const RolePermissions: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    // Full access to everything
    { resource: '*', action: '*', scope: 'all' }
  ],
  
  SALON_OWNER: [
    // Full access to tenant data
    { resource: '*', action: '*', scope: 'tenant' },
    // Can manage staff
    { resource: 'users', action: '*', scope: 'tenant' },
    // Can view analytics
    { resource: 'analytics', action: 'read', scope: 'tenant' }
  ],
  
  MANAGER: [
    // Most tenant operations except user management
    { resource: 'appointments', action: '*', scope: 'tenant' },
    { resource: 'clients', action: '*', scope: 'tenant' },
    { resource: 'services', action: '*', scope: 'tenant' },
    { resource: 'analytics', action: 'read', scope: 'tenant' },
    { resource: 'users', action: 'read', scope: 'tenant' }
  ],
  
  STAFF_MEMBER: [
    // Can manage own appointments and clients
    { resource: 'appointments', action: '*', scope: 'own' },
    { resource: 'clients', action: 'read', scope: 'tenant' },
    { resource: 'clients', action: 'create', scope: 'tenant' },
    { resource: 'services', action: 'read', scope: 'tenant' },
    { resource: 'users', action: 'read', scope: 'own' }
  ],
  
  RECEPTIONIST: [
    // Can manage all appointments and clients
    { resource: 'appointments', action: '*', scope: 'tenant' },
    { resource: 'clients', action: '*', scope: 'tenant' },
    { resource: 'services', action: 'read', scope: 'tenant' },
    { resource: 'users', action: 'read', scope: 'tenant' }
  ],
  
  ACCOUNTANT: [
    // Financial data access
    { resource: 'analytics', action: 'read', scope: 'tenant' },
    { resource: 'payments', action: 'read', scope: 'tenant' },
    { resource: 'appointments', action: 'read', scope: 'tenant' },
    { resource: 'clients', action: 'read', scope: 'tenant' }
  ],
  
  CLIENT: [
    // Can only access own bookings
    { resource: 'appointments', action: 'read', scope: 'own' },
    { resource: 'appointments', action: 'create', scope: 'own' },
    { resource: 'services', action: 'read', scope: 'tenant' },
    { resource: 'users', action: 'read', scope: 'own' }
  ]
}

// Rate limiting interface
export interface RateLimitInfo {
  limit: number
  remaining: number
  resetTime: Date
}

// Login attempt tracking
export interface LoginAttempt {
  email: string
  ip: string
  timestamp: Date
  success: boolean
  userAgent?: string
}

// Multi-factor authentication
export interface MFASetupResponse {
  qrCode: string
  secret: string
  backupCodes: string[]
}

export interface MFAVerifyRequest {
  token: string
  code: string
}

// Session information
export interface SessionInfo {
  id: string
  userId: string
  tenantId?: string
  ip: string
  userAgent: string
  createdAt: Date
  lastActivity: Date
  isActive: boolean
}
