// Tenant Isolation Layer - КРИТИЧЕСКИ ВАЖНО!
// Все запросы к БД должны идти через этот слой

import prisma from './prisma'
import { Prisma, PrismaClient } from '@prisma/client'

export type TenantPrisma = ReturnType<typeof createTenantPrisma>

/**
 * Создает изолированный Prisma клиент для конкретного tenant'а
 * ⚠️ КРИТИЧНО: Все операции с БД должны использовать этот метод!
 * @param tenantId - ID tenant'а или null для глобальных операций
 */
export function tenantPrisma(tenantId: string | null, baseClient: PrismaClient | Prisma.TransactionClient = prisma) {
  return createTenantPrisma(tenantId, baseClient)
}

function createTenantPrisma(tenantId: string | null, baseClient: PrismaClient | Prisma.TransactionClient) {
  const applyTenantFilter = (where?: any) => {
    if (!tenantId) {
      return where;
    }

    if (!where) {
      return { tenantId };
    }

    if (where.tenantId_userId) {
      return {
        ...where,
        tenantId_userId: {
          ...where.tenantId_userId,
          tenantId
        }
      };
    }

    return { ...where, tenantId };
  };

  const applySubcategoryTenantFilter = (where?: any) => {
    if (!tenantId) {
      return where;
    }
    if (!where) {
      return { category: { tenantId } };
    }

    return {
      ...where,
      category: {
        ...(where.category ?? {}),
        tenantId
      }
    };
  };

  return {
    // Tenants - без фильтрации (для админки)
    tenant: baseClient.tenant,
    
    // Users - с опциональной фильтрацией по tenant
    user: {
      findMany: (args?: any) => baseClient.user.findMany({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      }),
      findFirst: (args?: any) => baseClient.user.findFirst({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      }),
      findUnique: (args: any) => baseClient.user.findUnique({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      create: (args: any) => baseClient.user.create({
        ...args,
        data: tenantId ? { ...args.data, tenantId } : args.data
      }),
      update: (args: any) => baseClient.user.update({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      delete: (args: any) => baseClient.user.delete({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      count: (args?: any) => baseClient.user.count({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      })
    },
    
    // RefreshToken - глобальная модель (не привязана к tenant)
    refreshToken: baseClient.refreshToken,

    // ClientProfile - глобальная email-based модель для Client Portal (не привязана к tenant)
    clientProfile: baseClient.clientProfile,
    clientNotification: baseClient.clientNotification,
    salonInviteCode: baseClient.salonInviteCode,

    // Clients с фильтрацией по tenant
    client: {
      findMany: (args?: any) => baseClient.client.findMany({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      }),
      findFirst: (args?: any) => baseClient.client.findFirst({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      }),
      findUnique: (args: any) => baseClient.client.findUnique({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      create: (args: any) => baseClient.client.create({
        ...args,
        data: tenantId ? { ...args.data, tenantId } : args.data
      }),
      upsert: (args: any) => baseClient.client.upsert({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where,
        create: tenantId ? { ...args.create, tenantId } : args.create,
        update: args.update
      }),
      update: (args: any) => baseClient.client.update({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      delete: (args: any) => baseClient.client.delete({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      count: (args?: any) => baseClient.client.count({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      })
    },
    
    // Services с фильтрацией по tenant
    service: {
      findMany: (args?: any) => baseClient.service.findMany({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      }),
      findFirst: (args?: any) => baseClient.service.findFirst({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      }),
      findUnique: (args: any) => baseClient.service.findUnique({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      create: (args: any) => baseClient.service.create({
        ...args,
        data: tenantId ? { ...args.data, tenantId } : args.data
      }),
      upsert: (args: any) => baseClient.service.upsert({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where,
        create: tenantId ? { ...args.create, tenantId } : args.create,
        update: args.update
      }),
      update: (args: any) => baseClient.service.update({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      updateMany: (args?: any) => baseClient.service.updateMany({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      }),
      delete: (args: any) => baseClient.service.delete({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      count: (args?: any) => baseClient.service.count({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      })
    },

    serviceCategory: {
      findMany: (args?: any) => baseClient.serviceCategory.findMany({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      findFirst: (args?: any) => baseClient.serviceCategory.findFirst({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      findUnique: (args: any) => baseClient.serviceCategory.findUnique({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      create: (args: any) => baseClient.serviceCategory.create({
        ...args,
        data: tenantId ? { ...args.data, tenantId } : args.data
      }),
      upsert: (args: any) => baseClient.serviceCategory.upsert({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where,
        create: tenantId ? { ...args.create, tenantId } : args.create,
        update: args.update
      }),
      update: (args: any) => baseClient.serviceCategory.update({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      updateMany: (args?: any) => baseClient.serviceCategory.updateMany({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      delete: (args: any) => baseClient.serviceCategory.delete({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      deleteMany: (args?: any) => baseClient.serviceCategory.deleteMany({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      count: (args?: any) => baseClient.serviceCategory.count({
        ...args,
        where: applyTenantFilter(args?.where)
      })
    },

    serviceSubcategory: {
      findMany: (args?: any) => baseClient.serviceSubcategory.findMany({
        ...args,
        where: applySubcategoryTenantFilter(args?.where)
      }),
      findFirst: (args?: any) => baseClient.serviceSubcategory.findFirst({
        ...args,
        where: applySubcategoryTenantFilter(args?.where)
      }),
      findUnique: (args: any) => baseClient.serviceSubcategory.findUnique(args),
      create: (args: any) => baseClient.serviceSubcategory.create(args),
      upsert: (args: any) => baseClient.serviceSubcategory.upsert(args),
      update: (args: any) => baseClient.serviceSubcategory.update(args),
      updateMany: (args?: any) => baseClient.serviceSubcategory.updateMany({
        ...args,
        where: applySubcategoryTenantFilter(args?.where)
      }),
      delete: (args: any) => baseClient.serviceSubcategory.delete(args),
      deleteMany: (args?: any) => baseClient.serviceSubcategory.deleteMany({
        ...args,
        where: applySubcategoryTenantFilter(args?.where)
      }),
      count: (args?: any) => baseClient.serviceSubcategory.count({
        ...args,
        where: applySubcategoryTenantFilter(args?.where)
      })
    },
    
    // Appointments с фильтрацией по tenant
    appointment: {
      findMany: (args?: any) => baseClient.appointment.findMany({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      }),
      findFirst: (args?: any) => baseClient.appointment.findFirst({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      }),
      findUnique: (args: any) => baseClient.appointment.findUnique({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      create: (args: any) => baseClient.appointment.create({
        ...args,
        data: tenantId ? { ...args.data, tenantId } : args.data
      }),
      upsert: (args: any) => baseClient.appointment.upsert({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where,
        create: tenantId ? { ...args.create, tenantId } : args.create,
        update: args.update
      }),
      update: (args: any) => baseClient.appointment.update({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      delete: (args: any) => baseClient.appointment.delete({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      count: (args?: any) => baseClient.appointment.count({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      })
    },
    
    // Audit logs с фильтрацией по tenant
    auditLog: {
      findMany: (args?: any) => baseClient.auditLog.findMany({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      }),
      create: (args: any) => baseClient.auditLog.create({
        ...args,
        data: tenantId ? { ...args.data, tenantId } : args.data
      })
    },

    // Notifications с фильтрацией по tenant
    notification: {
      findMany: (args?: any) => baseClient.notification.findMany({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      }),
      findFirst: (args?: any) => baseClient.notification.findFirst({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      }),
      findUnique: (args: any) => baseClient.notification.findUnique({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      create: (args: any) => baseClient.notification.create({
        ...args,
        data: tenantId ? { ...args.data, tenantId } : args.data
      }),
      update: (args: any) => baseClient.notification.update({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      updateMany: (args: any) => baseClient.notification.updateMany({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      }),
      delete: (args: any) => baseClient.notification.delete({
        ...args,
        where: tenantId ? { ...args.where, tenantId } : args.where
      }),
      deleteMany: (args: any) => baseClient.notification.deleteMany({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      }),
      count: (args?: any) => baseClient.notification.count({
        ...args,
        where: tenantId ? { ...args?.where, tenantId } : args?.where
      })
    },

    // Notification settings with tenant isolation awareness
    notificationSettings: {
      findMany: (args?: any) => baseClient.notificationSettings.findMany({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      findFirst: (args?: any) => baseClient.notificationSettings.findFirst({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      findUnique: (args: any) => baseClient.notificationSettings.findUnique({
        ...args,
        where: applyTenantFilter(args.where)
      }),
      create: (args: any) => baseClient.notificationSettings.create({
        ...args,
        data: tenantId ? { ...args.data, tenantId } : args.data
      }),
      update: (args: any) => baseClient.notificationSettings.update({
        ...args,
        where: applyTenantFilter(args.where)
      }),
      upsert: (args: any) => baseClient.notificationSettings.upsert({
        ...args,
        where: applyTenantFilter(args.where),
        create: tenantId ? { ...args.create, tenantId } : args.create,
        update: args.update
      }),
      delete: (args: any) => baseClient.notificationSettings.delete({
        ...args,
        where: applyTenantFilter(args.where)
      }),
      count: (args?: any) => baseClient.notificationSettings.count({
        ...args,
        where: applyTenantFilter(args?.where)
      })
    },

    // Working Hours Models - Issue #74
    salonWorkingHour: {
      findMany: (args?: any) => baseClient.salonWorkingHour.findMany({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      findFirst: (args?: any) => baseClient.salonWorkingHour.findFirst({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      findUnique: (args: any) => baseClient.salonWorkingHour.findUnique({
        ...args,
        where: applyTenantFilter(args.where)
      }),
      create: (args: any) => baseClient.salonWorkingHour.create({
        ...args,
        data: tenantId ? { ...args.data, tenantId } : args.data
      }),
      update: (args: any) => baseClient.salonWorkingHour.update({
        ...args,
        where: applyTenantFilter(args.where)
      }),
      upsert: (args: any) => baseClient.salonWorkingHour.upsert({
        ...args,
        where: applyTenantFilter(args.where),
        create: tenantId ? { ...args.create, tenantId } : args.create,
        update: args.update
      }),
      deleteMany: (args?: any) => baseClient.salonWorkingHour.deleteMany({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      delete: (args: any) => baseClient.salonWorkingHour.delete({
        ...args,
        where: applyTenantFilter(args.where)
      }),
      count: (args?: any) => baseClient.salonWorkingHour.count({
        ...args,
        where: applyTenantFilter(args?.where)
      })
    },

    staffWorkingHour: {
      findMany: (args?: any) => baseClient.staffWorkingHour.findMany({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      findFirst: (args?: any) => baseClient.staffWorkingHour.findFirst({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      findUnique: (args: any) => baseClient.staffWorkingHour.findUnique({
        ...args,
        where: applyTenantFilter(args.where)
      }),
      create: (args: any) => baseClient.staffWorkingHour.create({
        ...args,
        data: tenantId ? { ...args.data, tenantId } : args.data
      }),
      update: (args: any) => baseClient.staffWorkingHour.update({
        ...args,
        where: applyTenantFilter(args.where)
      }),
      upsert: (args: any) => baseClient.staffWorkingHour.upsert({
        ...args,
        where: applyTenantFilter(args.where),
        create: tenantId ? { ...args.create, tenantId } : args.create,
        update: args.update
      }),
      delete: (args: any) => baseClient.staffWorkingHour.delete({
        ...args,
        where: applyTenantFilter(args.where)
      }),
      deleteMany: (args?: any) => baseClient.staffWorkingHour.deleteMany({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      count: (args?: any) => baseClient.staffWorkingHour.count({
        ...args,
        where: applyTenantFilter(args?.where)
      })
    },

    staffScheduleException: {
      findMany: (args?: any) => baseClient.staffScheduleException.findMany({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      findFirst: (args?: any) => baseClient.staffScheduleException.findFirst({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      findUnique: (args: any) => baseClient.staffScheduleException.findUnique({
        ...args,
        where: applyTenantFilter(args.where)
      }),
      create: (args: any) => baseClient.staffScheduleException.create({
        ...args,
        data: tenantId ? { ...args.data, tenantId } : args.data
      }),
      update: (args: any) => baseClient.staffScheduleException.update({
        ...args,
        where: applyTenantFilter(args.where)
      }),
      delete: (args: any) => baseClient.staffScheduleException.delete({
        ...args,
        where: applyTenantFilter(args.where)
      }),
      deleteMany: (args?: any) => baseClient.staffScheduleException.deleteMany({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      count: (args?: any) => baseClient.staffScheduleException.count({
        ...args,
        where: applyTenantFilter(args?.where)
      })
    },

    // Staff Service Map - Issue #82 (M:N relationship between staff and services)
    staffServiceMap: {
      findMany: (args?: any) => baseClient.staffServiceMap.findMany({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      findFirst: (args?: any) => baseClient.staffServiceMap.findFirst({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      findUnique: (args: any) => baseClient.staffServiceMap.findUnique({
        ...args,
        where: applyTenantFilter(args.where)
      }),
      create: (args: any) => baseClient.staffServiceMap.create({
        ...args,
        data: tenantId ? { ...args.data, tenantId } : args.data
      }),
      update: (args: any) => baseClient.staffServiceMap.update({
        ...args,
        where: applyTenantFilter(args.where)
      }),
      upsert: (args: any) => baseClient.staffServiceMap.upsert({
        ...args,
        where: applyTenantFilter(args.where),
        create: tenantId ? { ...args.create, tenantId } : args.create,
        update: args.update
      }),
      delete: (args: any) => baseClient.staffServiceMap.delete({
        ...args,
        where: applyTenantFilter(args.where)
      }),
      deleteMany: (args?: any) => baseClient.staffServiceMap.deleteMany({
        ...args,
        where: applyTenantFilter(args?.where)
      }),
      count: (args?: any) => baseClient.staffServiceMap.count({
        ...args,
        where: applyTenantFilter(args?.where)
      })
    },

    // Raw queries с проверкой tenant
    $queryRaw: baseClient.$queryRaw,
    $executeRaw: baseClient.$executeRaw,

    // Transactions
    $transaction: ((...args: Parameters<PrismaClient['$transaction']>) => {
      if (baseClient instanceof PrismaClient) {
        return baseClient.$transaction(...args)
      }
      return prisma.$transaction(...args)
    })
  }
}

// Middleware закомментирован из-за проблем с типами Prisma
// В будущем можно добавить логирование другим способом
