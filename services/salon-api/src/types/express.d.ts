import type { UserRole, TenantRole } from '@prisma/client'

declare global {
  namespace Express {
    interface User {
      userId?: string
      email?: string
      role?: UserRole
      tenantId?: string | null
      tenantRole?: TenantRole
      tenants?: Array<{
        tenantId: string
        tenantName?: string
        slug?: string
        role?: TenantRole
      }>
      permissions?: string[]
      deviceId?: string
      phoneVerified?: boolean
      firstName?: string
      lastName?: string
    }
  }
}
