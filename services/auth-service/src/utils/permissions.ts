/**
 * Permission Helpers - Multi-Tenant Role System
 *
 * Утилиты для проверки прав доступа пользователей в multi-tenant архитектуре.
 * Поддерживает сценарии:
 * - Один user владеет несколькими салонами
 * - Один user имеет разные роли в разных салонах
 * - Проверка ownership и role-based access
 */

import { prisma } from '@beauty-platform/database'
import { TenantRole } from '@prisma/client'

/**
 * Проверяет, является ли user владельцем tenant
 *
 * @param userId - ID пользователя
 * @param tenantId - ID салона
 * @returns true если user владеет салоном
 *
 * @example
 * const isOwner = await isTenantOwner('user123', 'tenant456')
 * if (isOwner) {
 *   // User может управлять салоном
 * }
 */
export async function isTenantOwner(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const ownership = await prisma.tenantOwner.findUnique({
    where: {
      tenantId_userId: { tenantId, userId }
    }
  })

  return !!ownership
}

/**
 * Проверяет, имеет ли user конкретную роль в tenant
 *
 * @param userId - ID пользователя
 * @param tenantId - ID салона
 * @param role - Роль для проверки (OWNER, MANAGER, STAFF, RECEPTIONIST, ACCOUNTANT)
 * @returns true если user имеет указанную роль
 *
 * @example
 * const canManage = await hasTenantRole('user123', 'tenant456', 'MANAGER')
 * if (canManage) {
 *   // User может управлять персоналом
 * }
 */
export async function hasTenantRole(
  userId: string,
  tenantId: string,
  role: TenantRole
): Promise<boolean> {
  const userRole = await prisma.userTenantRole.findFirst({
    where: {
      userId,
      tenantId,
      role,
      isActive: true
    }
  })

  return !!userRole
}

/**
 * Получить все активные роли user в конкретном tenant
 *
 * @param userId - ID пользователя
 * @param tenantId - ID салона
 * @returns Массив ролей (может быть пустым)
 *
 * @example
 * const roles = await getUserTenantRoles('user123', 'tenant456')
 * // ['OWNER', 'MANAGER']
 */
export async function getUserTenantRoles(
  userId: string,
  tenantId: string
): Promise<TenantRole[]> {
  const roles = await prisma.userTenantRole.findMany({
    where: {
      userId,
      tenantId,
      isActive: true
    },
    select: { role: true }
  })

  return roles.map(r => r.role)
}

/**
 * Получить все tenant где user имеет активные роли
 *
 * @param userId - ID пользователя
 * @returns Массив объектов с информацией о салонах и ролях
 *
 * @example
 * const tenants = await getUserTenants('user123')
 * // [
 * //   { tenantId: 'abc', tenantName: 'Salon 1', slug: 'salon-1', role: 'OWNER' },
 * //   { tenantId: 'def', tenantName: 'Salon 2', slug: 'salon-2', role: 'STAFF' }
 * // ]
 */
export async function getUserTenants(userId: string) {
  const tenantRoles = await prisma.userTenantRole.findMany({
    where: {
      userId,
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
    },
    orderBy: {
      grantedAt: 'desc' // Сначала последние добавленные
    }
  })

  return tenantRoles.map(tr => ({
    tenantId: tr.tenant.id,
    tenantName: tr.tenant.name,
    slug: tr.tenant.slug,
    logoUrl: tr.tenant.logoUrl,
    role: tr.role,
    grantedAt: tr.grantedAt
  }))
}

/**
 * Получить основную роль user в tenant (самая высокая по приоритету)
 *
 * Приоритет ролей: OWNER > MANAGER > RECEPTIONIST > ACCOUNTANT > STAFF
 *
 * @param userId - ID пользователя
 * @param tenantId - ID салона
 * @returns Роль с наивысшим приоритетом или null
 *
 * @example
 * const primaryRole = await getPrimaryTenantRole('user123', 'tenant456')
 * // 'OWNER' (даже если user также MANAGER)
 */
export async function getPrimaryTenantRole(
  userId: string,
  tenantId: string
): Promise<TenantRole | null> {
  const roles = await getUserTenantRoles(userId, tenantId)

  if (roles.length === 0) return null

  // Определяем приоритет ролей
  const rolePriority: Record<TenantRole, number> = {
    OWNER: 5,
    MANAGER: 4,
    RECEPTIONIST: 3,
    ACCOUNTANT: 2,
    STAFF: 1
  }

  // Сортируем по приоритету и возвращаем первую
  const sortedRoles = roles.sort((a, b) => rolePriority[b] - rolePriority[a])
  return sortedRoles[0] ?? null
}

/**
 * Проверяет, имеет ли user доступ к tenant (любая активная роль)
 *
 * @param userId - ID пользователя
 * @param tenantId - ID салона
 * @returns true если user имеет любую активную роль в салоне
 *
 * @example
 * const hasAccess = await hasAccessToTenant('user123', 'tenant456')
 * if (!hasAccess) {
 *   throw new Error('Access denied')
 * }
 */
export async function hasAccessToTenant(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const roles = await getUserTenantRoles(userId, tenantId)
  return roles.length > 0
}

/**
 * Получить всех владельцев tenant
 *
 * @param tenantId - ID салона
 * @returns Массив владельцев с информацией о долях
 *
 * @example
 * const owners = await getTenantOwners('tenant456')
 * // [
 * //   { userId: 'abc', email: 'owner1@...', isPrimary: true, share: 60 },
 * //   { userId: 'def', email: 'owner2@...', isPrimary: false, share: 40 }
 * // ]
 */
export async function getTenantOwners(tenantId: string) {
  const owners = await prisma.tenantOwner.findMany({
    where: { tenantId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true
        }
      }
    },
    orderBy: [
      { isPrimary: 'desc' }, // Primary owner first
      { createdAt: 'asc' }   // Then by creation date
    ]
  })

  return owners.map(o => ({
    userId: o.user.id,
    email: o.user.email,
    firstName: o.user.firstName,
    lastName: o.user.lastName,
    phone: o.user.phone,
    avatar: o.user.avatar,
    isPrimary: o.isPrimary,
    share: o.share,
    createdAt: o.createdAt
  }))
}

/**
 * Добавить нового владельца к tenant (co-ownership)
 *
 * @param tenantId - ID салона
 * @param userId - ID нового владельца
 * @param share - Доля владения в % (опционально)
 * @returns Созданная запись TenantOwner
 *
 * @example
 * await addTenantOwner('tenant456', 'newOwner123', 30)
 * // Новый владелец получает 30% доли
 */
export async function addTenantOwner(
  tenantId: string,
  userId: string,
  share: number = 50
) {
  // Создать TenantOwner
  const tenantOwner = await prisma.tenantOwner.create({
    data: {
      tenantId,
      userId,
      isPrimary: false, // Новый владелец не может быть primary
      share
    }
  })

  // Выдать роль OWNER если еще нет
  const existingRole = await prisma.userTenantRole.findFirst({
    where: {
      userId,
      tenantId,
      role: 'OWNER'
    }
  })

  if (!existingRole) {
    await prisma.userTenantRole.create({
      data: {
        userId,
        tenantId,
        role: 'OWNER',
        isActive: true
      }
    })
  }

  return tenantOwner
}

/**
 * Выдать роль пользователю в tenant
 *
 * @param userId - ID пользователя
 * @param tenantId - ID салона
 * @param role - Роль для выдачи
 * @param grantedBy - ID пользователя, который выдает роль (опционально)
 * @returns Созданная запись UserTenantRole
 *
 * @example
 * await grantTenantRole('user123', 'tenant456', 'MANAGER', 'owner789')
 */
export async function grantTenantRole(
  userId: string,
  tenantId: string,
  role: TenantRole,
  grantedBy?: string
) {
  // Проверить существующую роль
  const existing = await prisma.userTenantRole.findFirst({
    where: {
      userId,
      tenantId,
      role
    }
  })

  if (existing) {
    // Активировать если деактивирована
    if (!existing.isActive) {
      return await prisma.userTenantRole.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          revokedAt: null,
          revokedBy: null
        }
      })
    }
    return existing
  }

  // Создать новую роль
  return await prisma.userTenantRole.create({
    data: {
      userId,
      tenantId,
      role,
      isActive: true,
      grantedBy: grantedBy ?? null
    }
  })
}

/**
 * Отозвать роль у пользователя в tenant
 *
 * @param userId - ID пользователя
 * @param tenantId - ID салона
 * @param role - Роль для отзыва
 * @param revokedBy - ID пользователя, который отзывает роль (опционально)
 * @returns Обновленная запись UserTenantRole
 *
 * @example
 * await revokeTenantRole('user123', 'tenant456', 'STAFF', 'manager789')
 */
export async function revokeTenantRole(
  userId: string,
  tenantId: string,
  role: TenantRole,
  revokedBy?: string
) {
  const existing = await prisma.userTenantRole.findFirst({
    where: {
      userId,
      tenantId,
      role,
      isActive: true
    }
  })

  if (!existing) {
    throw new Error('Role not found or already revoked')
  }

  return await prisma.userTenantRole.update({
    where: { id: existing.id },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedBy: revokedBy ?? null
    }
  })
}

/**
 * Проверить множественные права доступа (для middleware)
 *
 * @param userId - ID пользователя
 * @param tenantId - ID салона
 * @param requiredRoles - Массив ролей (хотя бы одна должна быть у user)
 * @returns true если user имеет хотя бы одну из указанных ролей
 *
 * @example
 * const canManageStaff = await hasAnyRole('user123', 'tenant456', ['OWNER', 'MANAGER'])
 */
export async function hasAnyRole(
  userId: string,
  tenantId: string,
  requiredRoles: TenantRole[]
): Promise<boolean> {
  const userRoles = await getUserTenantRoles(userId, tenantId)
  return requiredRoles.some(role => userRoles.includes(role))
}
