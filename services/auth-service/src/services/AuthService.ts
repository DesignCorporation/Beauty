// Auth Service - Core authentication logic
// Beauty Platform Authentication & Authorization

import bcrypt from 'bcrypt'
import { UserRole, EntityStatus, TenantRole, Prisma } from '@prisma/client'
import { tenantPrisma, prisma } from '@beauty-platform/database'
import { generateTokenPair, verifyRefreshToken, hashToken, getTokenExpiration } from '../utils/jwt'
import { RolePermissions, Permission, AuthDeviceContext } from '../types/auth'
import { securityLogger, SecurityEventType } from '../security/SecurityLogger'
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  AuthError,
  AuthResponseWithMFA,
  RefreshTokenRequest
} from '../types/auth'

export class AuthService {
  private readonly bcryptRounds: number
  private readonly adminTenantId: string | null
  private readonly adminTenantSlug: string
  private readonly adminTenantName: string

  constructor() {
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12')
    this.adminTenantId = process.env.ADMIN_ROOT_TENANT_ID || null
    const slugFromEnv = process.env.ADMIN_ROOT_TENANT_SLUG || null
    this.adminTenantSlug = slugFromEnv || this.adminTenantId || 'global-admin'
    this.adminTenantName = process.env.ADMIN_ROOT_TENANT_NAME || 'Platform Admin'
  }

  private ensureDeviceContext(context?: AuthDeviceContext): AuthDeviceContext {
    if (context?.deviceId) {
      return {
        deviceId: context.deviceId,
        userAgent: context.userAgent ?? null,
        ipAddress: context.ipAddress ?? null,
        deviceName: context.deviceName ?? 'Unknown device'
      }
    }

    const fallbackId = hashToken(`legacy-${Date.now()}-${Math.random()}`)

    return {
      deviceId: fallbackId,
      userAgent: context?.userAgent ?? null,
      ipAddress: context?.ipAddress ?? null,
      deviceName: context?.deviceName ?? 'Unknown device'
    }
  }

  private async upsertDevice(userId: string, context?: AuthDeviceContext) {
    const deviceContext = this.ensureDeviceContext(context)

    const updateData: Record<string, any> = {
      lastUsedAt: new Date(),
      isActive: true
    }

    if (deviceContext.userAgent) {
      updateData.userAgent = deviceContext.userAgent
    }
    if (deviceContext.ipAddress) {
      updateData.ipAddress = deviceContext.ipAddress
    }
    if (deviceContext.deviceName) {
      updateData.deviceName = deviceContext.deviceName
    }

    return prisma.device.upsert({
      where: {
        userId_deviceId: {
          userId,
          deviceId: deviceContext.deviceId
        }
      },
      update: updateData,
      create: {
        userId,
        deviceId: deviceContext.deviceId,
        userAgent: deviceContext.userAgent ?? null,
        ipAddress: deviceContext.ipAddress ?? null,
        deviceName: deviceContext.deviceName ?? null,
        lastUsedAt: new Date(),
        isActive: true
      }
    })
  }

  private async deactivateDeviceIfNoActiveTokens(deviceRecordId: string, userId: string): Promise<void> {
    const activeTokens = await tenantPrisma(null).refreshToken.count({
      where: {
        deviceId: deviceRecordId,
        userId,
        isUsed: false,
        expiresAt: {
          gt: new Date()
        }
      }
    })

    if (activeTokens === 0) {
      try {
        await prisma.device.update({
          where: { id: deviceRecordId },
          data: {
            isActive: false,
            lastUsedAt: new Date()
          }
        })
      } catch (error) {
        console.error('Failed to deactivate device:', error)
      }
    }
  }

  private async getRolePermissionNames(userRole: UserRole): Promise<string[]> {
    try {
      const roleRecord = await prisma.role.findUnique({
        where: { name: userRole },
        include: {
          permissions: {
            select: { name: true }
          }
        }
      })

      if (roleRecord) {
        return roleRecord.permissions
          .map(permission => permission.name)
          .sort((a, b) => a.localeCompare(b))
      }
    } catch (error) {
      console.warn(`Failed to load permissions for role ${userRole} from database:`, error)
    }

    const fallbackPermissions = RolePermissions[userRole] || []
    const uniquePermissions = new Set<string>()

    fallbackPermissions.forEach(permission => {
      uniquePermissions.add(`${permission.resource}.${permission.action}`)
    })

    return Array.from(uniquePermissions).sort((a, b) => a.localeCompare(b))
  }

  public async getUserTenantContext(user: {
    id: string
    role: UserRole
    tenantId: string | null
  }): Promise<{
    tenants: Array<{
      tenantId: string
      tenantName: string
      tenantSlug: string
      role: TenantRole
      logoUrl?: string | null
    }>
    activeTenantId: string | null
    activeTenantRole: TenantRole | null
  }> {
    const memberships = await prisma.userTenantRole.findMany({
      where: {
        userId: user.id,
        isActive: true
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            status: true,
            isActive: true
          }
        }
      }
    })

    const tenants = memberships
      .filter((membership) => membership.tenant?.status === EntityStatus.ACTIVE && membership.tenant?.isActive)
      .map((membership) => ({
        tenantId: membership.tenantId,
        tenantName: membership.tenant!.name,
        tenantSlug: membership.tenant!.slug,
        role: membership.role,
        logoUrl: membership.tenant!.logoUrl
      }))

    let normalizedTenants = [...tenants]

    const identifierCandidates = [
      user.tenantId,
      this.adminTenantId,
      this.adminTenantSlug
    ].filter(Boolean) as string[]

    const matchesIdentifier = (entry: { tenantId: string; tenantSlug: string }) =>
      identifierCandidates.some(
        (identifier) => identifier && (entry.tenantId === identifier || entry.tenantSlug === identifier)
      )

    let fallbackTenant =
      normalizedTenants.find((tenant) => matchesIdentifier(tenant)) ?? null

    if (user.role === UserRole.SUPER_ADMIN) {
      if (!fallbackTenant) {
        const orConditions = identifierCandidates.flatMap((identifier) => [
          { id: identifier },
          { slug: identifier }
        ])

        const whereClause: Prisma.TenantWhereInput = {
          status: EntityStatus.ACTIVE,
          isActive: true
        }

        if (orConditions.length) {
          whereClause.OR = orConditions
        }

        const adminTenantRecord = await tenantPrisma(null).tenant.findFirst({
          where: whereClause,
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true
          }
        })

        if (adminTenantRecord) {
          fallbackTenant = {
            tenantId: adminTenantRecord.id,
            tenantName: adminTenantRecord.name || this.adminTenantName,
            tenantSlug: adminTenantRecord.slug || adminTenantRecord.id,
            role: TenantRole.OWNER,
            logoUrl: adminTenantRecord.logoUrl
          }
        }
      }

      if (!fallbackTenant) {
        fallbackTenant = {
          tenantId: this.adminTenantId ?? this.adminTenantSlug,
          tenantName: this.adminTenantName,
          tenantSlug: this.adminTenantSlug,
          role: TenantRole.OWNER,
          logoUrl: null
        }
      }

      const hasFallback = normalizedTenants.some(
        (tenant) => tenant.tenantId === fallbackTenant!.tenantId
      )

      if (!hasFallback && fallbackTenant) {
        normalizedTenants = [fallbackTenant, ...normalizedTenants]
      }
    }

    const activeTenantId =
      user.tenantId ??
      fallbackTenant?.tenantId ??
      normalizedTenants[0]?.tenantId ??
      null

    const activeTenantRole =
      normalizedTenants.find((tenant) => tenant.tenantId === activeTenantId)?.role ??
      (user.role === UserRole.SUPER_ADMIN && fallbackTenant ? fallbackTenant.role : null)

    return {
      tenants: normalizedTenants,
      activeTenantId,
      activeTenantRole
    }
  }

  private getRefreshExpiryDate(token: string): Date {
    const expiration = getTokenExpiration(token)
    if (expiration) {
      return expiration
    }

    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }

  /**
   * Authenticate user with email and password
   */
  async login(request: LoginRequest, context?: AuthDeviceContext): Promise<AuthResponse | AuthResponseWithMFA | AuthError> {
    try {
      const { email, password, tenantSlug } = request

      // Find user by email with MFA fields (using global prisma for auth)
      let user = await tenantPrisma(null).user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          password: true,
          role: true,
          tenantId: true,
          status: true,
          isActive: true,
          mfaEnabled: true,      // ✅ Добавляем MFA поле!
          mfaSecret: true,       // ✅ Нужно для проверки
          createdAt: true,
          updatedAt: true,
          tenant: {
            select: {
              id: true,
              slug: true,
              name: true,
              status: true,
              isActive: true
            }
          }
        }
      })

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        }
      }

      // Verify password
      console.log('🔑 Password Check:', {
        email: user.email,
        hasPassword: !!user.password,
        passwordLength: user.password?.length
      })
      const isPasswordValid = await bcrypt.compare(password, user.password)
      console.log('🔑 Password Valid:', isPasswordValid)
      
      if (!isPasswordValid) {
        // Log failed attempt
        await this.logLoginAttempt(email, false)
        
        return {
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        }
      }

      // Check user status
      if (user.status !== EntityStatus.ACTIVE || !user.isActive) {
        return {
          success: false,
          error: 'User account is not active',
          code: 'ACCOUNT_INACTIVE'
        }
      }

      if ((user as any).tenant && (!((user as any).tenant).isActive || ((user as any).tenant).status !== EntityStatus.ACTIVE)) {
        return {
          success: false,
          error: 'Salon account is not active',
          code: 'TENANT_INACTIVE'
        }
      }

      // Verify tenant slug matches (if provided)
      if (tenantSlug && (user as any).tenant?.slug !== tenantSlug) {
        return {
          success: false,
          error: 'Invalid salon access',
          code: 'TENANT_MISMATCH'
        }
      }

      // 🛡️ MFA CHECK: Проверяем требуется ли MFA для SUPER_ADMIN
      console.log('🔐 MFA Check:', {
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        shouldRequireMFA: user.role === UserRole.SUPER_ADMIN && user.mfaEnabled
      })
      
      if (user.role === UserRole.SUPER_ADMIN && user.mfaEnabled) {
        console.log('🛡️ MFA REQUIRED: Returning MFA challenge for', user.email)
        
        await this.logLoginAttempt(email, true, user.id, 'MFA_REQUIRED')
        
        return {
          success: false,
          error: 'MFA verification required',
          code: 'MFA_REQUIRED',
          mfaRequired: true,
          userId: user.id,
          email: user.email,
          role: user.role
        }
      }

      const tenantContext = await this.getUserTenantContext({
        id: user.id,
        role: user.role,
        tenantId: user.tenantId ?? null
      })

      const tenants = tenantContext.tenants
      const activeTenantId = tenantContext.activeTenantId
      const activeTenant = tenants.find(tenant => tenant.tenantId === activeTenantId) ?? null
      const tokenTenants = tenants.map(tenant => ({
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        slug: tenant.tenantSlug,
        role: tenant.role
      }))

      const permissions = await this.getRolePermissionNames(user.role)
      const device = await this.upsertDevice(user.id, context)

      const onboardingRequired =
        user.role !== UserRole.SUPER_ADMIN && !activeTenantId
      const tenantSelectionRequired =
        user.role === UserRole.SUPER_ADMIN && !activeTenantId && tenants.length > 0

      const tokenPayloadBase = {
        userId: user.id,
        role: user.role,
        email: user.email,
        tenants: tokenTenants,
        permissions,
        deviceId: device.deviceId,
        ...(activeTenantId != null ? { tenantId: activeTenantId } : {}),
        ...(tenantContext.activeTenantRole ? { tenantRole: tenantContext.activeTenantRole } : {})
      }

      if (user.role === UserRole.SUPER_ADMIN && !user.mfaEnabled) {
        const limitedTokens = await generateTokenPair(tokenPayloadBase)
        const refreshExpiry = this.getRefreshExpiryDate(limitedTokens.refreshToken)

        await tenantPrisma(null).refreshToken.create({
          data: {
            token: hashToken(limitedTokens.refreshToken),
            userId: user.id,
            deviceId: device.id,
            expiresAt: refreshExpiry,
            isUsed: false
          }
        })

        await this.logLoginAttempt(email, true, user.id, 'MFA_SETUP_REQUIRED')

        return {
          success: true,
          accessToken: limitedTokens.accessToken,
          refreshToken: limitedTokens.refreshToken,
          expiresIn: limitedTokens.expiresIn,
          permissions,
          deviceId: device.deviceId,
          onboardingRequired,
          tenantSelectionRequired,
          mfaSetupRequired: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar ?? null,
            role: user.role,
            tenantId: activeTenantId ?? undefined,
            tenantSlug: activeTenant?.tenantSlug ?? (user as any).tenant?.slug,
            tenantName: activeTenant?.tenantName ?? (user as any).tenant?.name,
            tenants
          }
        }
      }

      const tokens = await generateTokenPair(tokenPayloadBase)
      const refreshExpiry = this.getRefreshExpiryDate(tokens.refreshToken)

      await tenantPrisma(null).refreshToken.create({
        data: {
          token: hashToken(tokens.refreshToken),
          userId: user.id,
          deviceId: device.id,
          expiresAt: refreshExpiry,
          isUsed: false
        }
      })

      await this.logLoginAttempt(email, true, user.id)
      await this.logAuditEvent('LOGIN', user.id, activeTenantId ?? user.tenantId, user.role)

      return {
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        permissions,
        deviceId: device.deviceId,
        onboardingRequired,
        tenantSelectionRequired,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar ?? null,
          role: user.role,
          tenantId: activeTenantId ?? undefined,
          tenantSlug: activeTenant?.tenantSlug ?? (user as any).tenant?.slug,
          tenantName: activeTenant?.tenantName ?? (user as any).tenant?.name,
          tenants
        }
      }

    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(request: RefreshTokenRequest, context?: AuthDeviceContext): Promise<AuthResponse | AuthError> {
    try {
      const { refreshToken } = request

      // Verify refresh token
      try {
        await verifyRefreshToken(refreshToken)
      } catch (error) {
        return {
          success: false,
          error: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        }
      }

      const hashedToken = hashToken(refreshToken)

      // Check if refresh token exists in database
      const storedToken = await tenantPrisma(null).refreshToken.findUnique({
        where: { token: hashedToken },
        include: {
          user: {
            include: {
              tenant: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  status: true,
                  isActive: true
                }
              }
            }
          },
          device: true
        }
      })

      if (!storedToken) {
        return {
          success: false,
          error: 'Refresh token expired or not found',
          code: 'REFRESH_TOKEN_EXPIRED'
        }
      }

      if (storedToken.isUsed) {
        // 🚨 REUSE DETECTION: Critical Security Event
        // Invalidate ALL tokens for this device to stop the attack chain
        await tenantPrisma(null).refreshToken.updateMany({
          where: {
            userId: storedToken.userId,
            deviceId: storedToken.deviceId,
            isUsed: false // Only active tokens
          },
          data: {
            isUsed: true,
            usedAt: new Date(), // Mark as used now
            expiresAt: new Date() // Expire immediately
          }
        })

        // Log critical security event
        securityLogger.logSecurityEvent(SecurityEventType.TOKEN_REUSED, {} as any, {
          userId: storedToken.userId,
          email: storedToken.user.email,
          role: storedToken.user.role,
          tenantId: storedToken.user.tenantId,
          riskScore: 90, // Very high risk
          details: {
            tokenHash: hashedToken,
            deviceId: storedToken.deviceId,
            originalUsedAt: storedToken.usedAt,
            userAgent: context?.userAgent || 'Unknown'
          }
        })

        return {
          success: false,
          error: 'Refresh token reuse detected. Security alert triggered.',
          code: 'REFRESH_TOKEN_REUSED'
        }
      }

      if (storedToken.expiresAt < new Date()) {
        return {
          success: false,
          error: 'Refresh token expired or not found',
          code: 'REFRESH_TOKEN_EXPIRED'
        }
      }

      const user = storedToken.user

      // Check user and tenant status
      if (user.status !== EntityStatus.ACTIVE || !user.isActive) {
        return {
          success: false,
          error: 'User account is not active',
          code: 'ACCOUNT_INACTIVE'
        }
      }

      if ((user as any).tenant && (!((user as any).tenant).isActive || ((user as any).tenant).status !== EntityStatus.ACTIVE)) {
        return {
          success: false,
          error: 'Salon account is not active',
          code: 'TENANT_INACTIVE'
        }
      }

      const tenantContext = await this.getUserTenantContext({
        id: user.id,
        role: user.role,
        tenantId: user.tenantId ?? null
      })

      const tenants = tenantContext.tenants
      const activeTenantId = tenantContext.activeTenantId
      const activeTenant = tenants.find(tenant => tenant.tenantId === activeTenantId) ?? null
      const tokenTenants = tenants.map(tenant => ({
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        slug: tenant.tenantSlug,
        role: tenant.role
      }))

      const permissions = await this.getRolePermissionNames(user.role)

      const onboardingRequired =
        user.role !== UserRole.SUPER_ADMIN && !activeTenantId
      const tenantSelectionRequired =
        user.role === UserRole.SUPER_ADMIN && !activeTenantId && tenants.length > 0

      const effectiveContext: AuthDeviceContext = context?.deviceId
        ? context
        : {
            deviceId: storedToken.device.deviceId,
            userAgent: context?.userAgent ?? storedToken.device.userAgent,
            ipAddress: context?.ipAddress ?? storedToken.device.ipAddress,
            deviceName: context?.deviceName ?? storedToken.device.deviceName
          }

      const device = await this.upsertDevice(user.id, effectiveContext)

      await tenantPrisma(null).refreshToken.update({
        where: { id: storedToken.id },
        data: {
          isUsed: true,
          usedAt: new Date()
        }
      })

      const tokens = await generateTokenPair({
        userId: user.id,
        role: user.role,
        email: user.email,
        tenants: tokenTenants,
        permissions,
        deviceId: device.deviceId,
        ...(activeTenantId != null ? { tenantId: activeTenantId } : {}),
        ...(tenantContext.activeTenantRole ? { tenantRole: tenantContext.activeTenantRole } : {})
      })

      const refreshExpiry = this.getRefreshExpiryDate(tokens.refreshToken)

      await tenantPrisma(null).refreshToken.create({
        data: {
          token: hashToken(tokens.refreshToken),
          userId: user.id,
          deviceId: device.id,
          expiresAt: refreshExpiry,
          isUsed: false
        }
      })

      await this.logAuditEvent('REFRESH_TOKEN', user.id, activeTenantId ?? user.tenantId, user.role)

      return {
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        permissions,
        deviceId: device.deviceId,
        onboardingRequired,
        tenantSelectionRequired,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: activeTenantId ?? undefined,
          tenantSlug: activeTenant?.tenantSlug ?? user.tenant?.slug,
          tenantName: activeTenant?.tenantName ?? user.tenant?.name,
          tenants
        }
      }

    } catch (error) {
      console.error('Refresh token error:', error)
      return {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }
    }
  }

  /**
   * Logout user - revoke refresh token
   */
  async logout(refreshToken: string, userId: string, context?: AuthDeviceContext): Promise<{ success: boolean }> {
    try {
      const hashedToken = hashToken(refreshToken)

      const storedToken = await tenantPrisma(null).refreshToken.findFirst({
        where: {
          token: hashedToken,
          userId
        },
        include: {
          device: true
        }
      })

      if (storedToken) {
        await tenantPrisma(null).refreshToken.update({
          where: { id: storedToken.id },
          data: {
            isUsed: true,
            usedAt: new Date()
          }
        })

        if (context?.deviceId && storedToken.device.deviceId !== context.deviceId) {
          await this.upsertDevice(userId, context)
        }

        await this.deactivateDeviceIfNoActiveTokens(storedToken.deviceId, userId)
      }

      // Log audit event
      const user = await tenantPrisma(null).user.findUnique({
        where: { id: userId }
      })
      
      if (user) {
        await this.logAuditEvent('LOGOUT', userId, user.tenantId, user.role)
      }

      return { success: true }
    } catch (error) {
      console.error('Logout error:', error)
      return { success: false }
    }
  }

  /**
   * Revoke all active sessions for user (Global Logout)
   */
  async revokeAllSessions(userId: string, reason: string = 'User requested'): Promise<void> {
    try {
      // Invalidate all active tokens
      const result = await tenantPrisma(null).refreshToken.updateMany({
        where: {
          userId,
          isUsed: false,
          expiresAt: { gt: new Date() }
        },
        data: {
          isUsed: true,
          usedAt: new Date(),
          expiresAt: new Date() // Expire immediately
        }
      })

      // Deactivate all devices
      await prisma.device.updateMany({
        where: { userId },
        data: { isActive: false }
      })

      console.log(`Revoked ${result.count} sessions for user ${userId}`)
      
      await this.logAuditEvent('REVOKE_ALL_SESSIONS', userId, null, null, {
        reason,
        revokedCount: result.count
      })
    } catch (error) {
      console.error('Revoke all sessions error:', error)
      throw new Error('Failed to revoke sessions')
    }
  }

  /**
   * Register new user (staff invitation or client registration)
   */
  async register(request: RegisterRequest, context?: AuthDeviceContext): Promise<AuthResponse | AuthError> {
    try {
      const { email, password, firstName, lastName, phone, role, tenantId } = request

      // Check if user already exists
      const existingUser = await tenantPrisma(null).user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists',
          code: 'USER_EXISTS'
        }
      }

      // Validate tenant for non-SUPER_ADMIN users
      if (role !== UserRole.SUPER_ADMIN && !tenantId) {
        return {
          success: false,
          error: 'Tenant ID is required for non-admin users',
          code: 'TENANT_REQUIRED'
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, this.bcryptRounds)

      // Create user
      const user = await tenantPrisma(null).user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone: phone || null,
          role,
          tenantId: tenantId || null,
          status: role === UserRole.CLIENT ? EntityStatus.ACTIVE : EntityStatus.PENDING,
          emailVerified: false,
          isActive: true
        },
        include: {
          tenant: {
            select: {
              id: true,
              slug: true,
              name: true,
              status: true,
              isActive: true
            }
          }
        }
      })

      // Log audit event
      await this.logAuditEvent('CREATE', user.id, tenantId, role, {
        entityType: 'User',
        entityId: user.id,
        newValues: { email, firstName, lastName, role }
      })

      // For CLIENT role, generate tokens immediately
      if (role === UserRole.CLIENT) {
        const userTenantRoles = await prisma.userTenantRole.findMany({
          where: {
            userId: user.id,
            isActive: true
          },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true
              }
            }
          }
        })

        const tenants = userTenantRoles.map(utr => ({
          tenantId: utr.tenantId,
          tenantName: utr.tenant.name,
          tenantSlug: utr.tenant.slug,
          role: utr.role,
          logoUrl: utr.tenant.logoUrl
        }))

        const tokenTenants = tenants.map(tenant => ({
          tenantId: tenant.tenantId,
          tenantName: tenant.tenantName,
          slug: tenant.tenantSlug,
          role: tenant.role
        }))

        const permissions = await this.getRolePermissionNames(user.role)
        const device = await this.upsertDevice(user.id, context)

        const tokens = await generateTokenPair({
          userId: user.id,
          role: user.role,
          email: user.email,
          tenants: tokenTenants,
          permissions,
          deviceId: device.deviceId,
          ...(user.tenantId ? { tenantId: user.tenantId } : {}),
          ...(tenants[0]?.role ? { tenantRole: tenants[0].role } : {})
        })

        await tenantPrisma(null).refreshToken.create({
          data: {
            token: hashToken(tokens.refreshToken),
            userId: user.id,
            deviceId: device.id,
            expiresAt: this.getRefreshExpiryDate(tokens.refreshToken),
            isUsed: false
          }
        })

        return {
          success: true,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          permissions,
          deviceId: device.deviceId,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            tenantId: user.tenantId ?? undefined,
            tenantSlug: (user as any).tenant?.slug,
            tenantName: (user as any).tenant?.name,
            tenants
          }
        }
      }

      // For staff roles, return success without tokens (awaiting approval)
      return {
        success: true,
        accessToken: '',
        refreshToken: '',
        expiresIn: 0,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId ?? undefined,
          tenantSlug: undefined,
          tenantName: undefined
        }
      }

    } catch (error) {
      console.error('Register error:', error)
      return {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(userRole: UserRole, resource: string, action: string, scope: 'own' | 'tenant' | 'all' = 'tenant'): boolean {
    const permissions = RolePermissions[userRole]
    
    return permissions.some(permission => {
      const resourceMatch = permission.resource === '*' || permission.resource === resource
      const actionMatch = permission.action === '*' || permission.action === action
      const scopeMatch = permission.scope === 'all' || permission.scope === scope
      
      return resourceMatch && actionMatch && scopeMatch
    })
  }

  /**
   * Get user permissions
   */
  getUserPermissions(userRole: UserRole): Permission[] {
    return RolePermissions[userRole] || []
  }

  /**
   * Log login attempt
   */
  private async logLoginAttempt(email: string, success: boolean, _userId?: string, _note?: string): Promise<void> {
    try {
      // In a real implementation, you might want to store login attempts
      // in a separate table for security monitoring
      const note = _note ? ` (${_note})` : ''
      console.log(`Login attempt: ${email} - ${success ? 'SUCCESS' : 'FAILED'}${note}`)
    } catch (error) {
      console.error('Failed to log login attempt:', error)
    }
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(
    action: string, 
    userId: string, 
    tenantId?: string | null, 
    userRole?: UserRole,
    additionalData?: any
  ): Promise<void> {
    try {
      await tenantPrisma(null).auditLog.create({
        data: {
          tenantId: tenantId || null,
          action: action as any,
          entityType: additionalData?.entityType || 'Auth',
          entityId: additionalData?.entityId || userId,
          userId,
          userRole: userRole || null,
          oldValues: additionalData?.oldValues || null,
          newValues: additionalData?.newValues || null,
          ipAddress: '127.0.0.1', // Should come from request
          userAgent: 'Auth Service'
        }
      })
    } catch (error) {
      console.error('Failed to log audit event:', error)
    }
  }
}
