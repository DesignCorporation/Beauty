import type { UserRole, TenantRole } from '@prisma/client'

declare global {
  namespace Express {
    interface User {
      [key: string]: any
      userId?: string
      email?: string
      role?: UserRole
      tenantId?: string | null
      tenantRole?: TenantRole
      tenants?: Array<{
        tenantId: string
        role?: TenantRole
        tenantName?: string
        slug?: string
      }>
      permissions?: string[]
      deviceId?: string
      phoneVerified?: boolean
      firstName?: string
      lastName?: string
    }
  }
}
