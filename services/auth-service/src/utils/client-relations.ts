import { prisma } from '@beauty-platform/database'
import { EntityStatus } from '@prisma/client'

interface EnsureClientSalonRelationOptions {
  tenantId?: string | null
}

interface EnsureClientSalonRelationResult {
  tenantId: string | null
  relationId: string | null
  created: boolean
}

/**
 * Ensures that a client has an active salon relation and returns the resolved tenantId.
 * - If tenantId provided, upserts relation for that salon.
 * - Otherwise tries to reuse existing primary relation.
 * - If still not found, falls back to the first active salon in the system.
 */
export async function ensureClientSalonRelation(
  email: string,
  options: EnsureClientSalonRelationOptions = {}
): Promise<EnsureClientSalonRelationResult> {
  const candidateTenantId = options.tenantId?.trim() || null
  const normalizedEmail = email.toLowerCase().trim()

  return prisma.$transaction(async tx => {
    const existingRelations = await tx.clientSalonRelation.findMany({
      where: { clientEmail: normalizedEmail },
      orderBy: [
        { isPrimary: 'desc' },
        { joinedSalonAt: 'asc' }
      ],
      select: {
        id: true,
        tenantId: true,
        isPrimary: true
      }
    })

    let relation =
      existingRelations.find(rel => rel.isPrimary) ??
      existingRelations[0] ??
      null

    let resolvedTenantId = candidateTenantId || relation?.tenantId || null
    let relationCreated = false

    if (!resolvedTenantId) {
      const fallbackTenant = await tx.tenant.findFirst({
        where: {
          isActive: true,
          status: EntityStatus.ACTIVE
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true }
      })

      resolvedTenantId = fallbackTenant?.id || null
    }

    if (!resolvedTenantId) {
      return {
        tenantId: relation?.tenantId ?? null,
        relationId: relation?.id ?? null,
        created: false
      }
    }

    const relationExisted = existingRelations.some(rel => rel.tenantId === resolvedTenantId)

    relation = await tx.clientSalonRelation.upsert({
      where: {
        clientEmail_tenantId: {
          clientEmail: normalizedEmail,
          tenantId: resolvedTenantId
        }
      },
      update: {
        isActive: true
      },
      create: {
        clientEmail: normalizedEmail,
        tenantId: resolvedTenantId,
        isPrimary: existingRelations.length === 0,
        isActive: true
      },
      select: {
        id: true,
        tenantId: true,
        isPrimary: true
      }
    })

    relationCreated = !relationExisted

    if (!relation.isPrimary) {
      const hasPrimary = await tx.clientSalonRelation.findFirst({
        where: {
          clientEmail: normalizedEmail,
          isPrimary: true,
          id: { not: relation.id }
        },
        select: { id: true }
      })

      if (!hasPrimary) {
        relation = await tx.clientSalonRelation.update({
          where: { id: relation.id },
          data: { isPrimary: true },
          select: {
            id: true,
            tenantId: true,
            isPrimary: true
          }
        })
      }
    }

    return {
      tenantId: relation.tenantId,
      relationId: relation.id,
      created: relationCreated
    }
  })
}
