"use strict";
// Tenant Isolation Layer - КРИТИЧЕСКИ ВАЖНО!
// Все запросы к БД должны идти через этот слой
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantPrisma = tenantPrisma;
const prisma_1 = __importDefault(require("./prisma"));
const client_1 = require("@prisma/client");
/**
 * Создает изолированный Prisma клиент для конкретного tenant'а
 * ⚠️ КРИТИЧНО: Все операции с БД должны использовать этот метод!
 * @param tenantId - ID tenant'а или null для глобальных операций
 */
function tenantPrisma(tenantId, baseClient = prisma_1.default) {
    return createTenantPrisma(tenantId, baseClient);
}
function createTenantPrisma(tenantId, baseClient) {
    const applyTenantFilter = (where) => {
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
    const applySubcategoryTenantFilter = (where) => {
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
            findMany: (args) => baseClient.user.findMany({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            }),
            findFirst: (args) => baseClient.user.findFirst({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            }),
            findUnique: (args) => baseClient.user.findUnique({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            create: (args) => baseClient.user.create({
                ...args,
                data: tenantId ? { ...args.data, tenantId } : args.data
            }),
            update: (args) => baseClient.user.update({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            delete: (args) => baseClient.user.delete({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            count: (args) => baseClient.user.count({
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
            findMany: (args) => baseClient.client.findMany({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            }),
            findFirst: (args) => baseClient.client.findFirst({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            }),
            findUnique: (args) => baseClient.client.findUnique({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            create: (args) => baseClient.client.create({
                ...args,
                data: tenantId ? { ...args.data, tenantId } : args.data
            }),
            upsert: (args) => baseClient.client.upsert({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where,
                create: tenantId ? { ...args.create, tenantId } : args.create,
                update: args.update
            }),
            update: (args) => baseClient.client.update({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            delete: (args) => baseClient.client.delete({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            count: (args) => baseClient.client.count({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            })
        },
        // Services с фильтрацией по tenant
        service: {
            findMany: (args) => baseClient.service.findMany({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            }),
            findFirst: (args) => baseClient.service.findFirst({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            }),
            findUnique: (args) => baseClient.service.findUnique({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            create: (args) => baseClient.service.create({
                ...args,
                data: tenantId ? { ...args.data, tenantId } : args.data
            }),
            upsert: (args) => baseClient.service.upsert({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where,
                create: tenantId ? { ...args.create, tenantId } : args.create,
                update: args.update
            }),
            update: (args) => baseClient.service.update({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            updateMany: (args) => baseClient.service.updateMany({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            }),
            delete: (args) => baseClient.service.delete({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            count: (args) => baseClient.service.count({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            })
        },
        serviceCategory: {
            findMany: (args) => baseClient.serviceCategory.findMany({
                ...args,
                where: applyTenantFilter(args?.where)
            }),
            findFirst: (args) => baseClient.serviceCategory.findFirst({
                ...args,
                where: applyTenantFilter(args?.where)
            }),
            findUnique: (args) => baseClient.serviceCategory.findUnique({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            create: (args) => baseClient.serviceCategory.create({
                ...args,
                data: tenantId ? { ...args.data, tenantId } : args.data
            }),
            upsert: (args) => baseClient.serviceCategory.upsert({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where,
                create: tenantId ? { ...args.create, tenantId } : args.create,
                update: args.update
            }),
            update: (args) => baseClient.serviceCategory.update({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            updateMany: (args) => baseClient.serviceCategory.updateMany({
                ...args,
                where: applyTenantFilter(args?.where)
            }),
            delete: (args) => baseClient.serviceCategory.delete({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            deleteMany: (args) => baseClient.serviceCategory.deleteMany({
                ...args,
                where: applyTenantFilter(args?.where)
            }),
            count: (args) => baseClient.serviceCategory.count({
                ...args,
                where: applyTenantFilter(args?.where)
            })
        },
        serviceSubcategory: {
            findMany: (args) => baseClient.serviceSubcategory.findMany({
                ...args,
                where: applySubcategoryTenantFilter(args?.where)
            }),
            findFirst: (args) => baseClient.serviceSubcategory.findFirst({
                ...args,
                where: applySubcategoryTenantFilter(args?.where)
            }),
            findUnique: (args) => baseClient.serviceSubcategory.findUnique(args),
            create: (args) => baseClient.serviceSubcategory.create(args),
            upsert: (args) => baseClient.serviceSubcategory.upsert(args),
            update: (args) => baseClient.serviceSubcategory.update(args),
            updateMany: (args) => baseClient.serviceSubcategory.updateMany({
                ...args,
                where: applySubcategoryTenantFilter(args?.where)
            }),
            delete: (args) => baseClient.serviceSubcategory.delete(args),
            deleteMany: (args) => baseClient.serviceSubcategory.deleteMany({
                ...args,
                where: applySubcategoryTenantFilter(args?.where)
            }),
            count: (args) => baseClient.serviceSubcategory.count({
                ...args,
                where: applySubcategoryTenantFilter(args?.where)
            })
        },
        // Appointments с фильтрацией по tenant
        appointment: {
            findMany: (args) => baseClient.appointment.findMany({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            }),
            findFirst: (args) => baseClient.appointment.findFirst({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            }),
            findUnique: (args) => baseClient.appointment.findUnique({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            create: (args) => baseClient.appointment.create({
                ...args,
                data: tenantId ? { ...args.data, tenantId } : args.data
            }),
            upsert: (args) => baseClient.appointment.upsert({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where,
                create: tenantId ? { ...args.create, tenantId } : args.create,
                update: args.update
            }),
            update: (args) => baseClient.appointment.update({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            delete: (args) => baseClient.appointment.delete({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            count: (args) => baseClient.appointment.count({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            })
        },
        // Audit logs с фильтрацией по tenant
        auditLog: {
            findMany: (args) => baseClient.auditLog.findMany({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            }),
            create: (args) => baseClient.auditLog.create({
                ...args,
                data: tenantId ? { ...args.data, tenantId } : args.data
            })
        },
        // Notifications с фильтрацией по tenant
        notification: {
            findMany: (args) => baseClient.notification.findMany({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            }),
            findFirst: (args) => baseClient.notification.findFirst({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            }),
            findUnique: (args) => baseClient.notification.findUnique({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            create: (args) => baseClient.notification.create({
                ...args,
                data: tenantId ? { ...args.data, tenantId } : args.data
            }),
            update: (args) => baseClient.notification.update({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            updateMany: (args) => baseClient.notification.updateMany({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            }),
            delete: (args) => baseClient.notification.delete({
                ...args,
                where: tenantId ? { ...args.where, tenantId } : args.where
            }),
            deleteMany: (args) => baseClient.notification.deleteMany({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            }),
            count: (args) => baseClient.notification.count({
                ...args,
                where: tenantId ? { ...args?.where, tenantId } : args?.where
            })
        },
        // Notification settings with tenant isolation awareness
        notificationSettings: {
            findMany: (args) => baseClient.notificationSettings.findMany({
                ...args,
                where: applyTenantFilter(args?.where)
            }),
            findFirst: (args) => baseClient.notificationSettings.findFirst({
                ...args,
                where: applyTenantFilter(args?.where)
            }),
            findUnique: (args) => baseClient.notificationSettings.findUnique({
                ...args,
                where: applyTenantFilter(args.where)
            }),
            create: (args) => baseClient.notificationSettings.create({
                ...args,
                data: tenantId ? { ...args.data, tenantId } : args.data
            }),
            update: (args) => baseClient.notificationSettings.update({
                ...args,
                where: applyTenantFilter(args.where)
            }),
            upsert: (args) => baseClient.notificationSettings.upsert({
                ...args,
                where: applyTenantFilter(args.where),
                create: tenantId ? { ...args.create, tenantId } : args.create,
                update: args.update
            }),
            delete: (args) => baseClient.notificationSettings.delete({
                ...args,
                where: applyTenantFilter(args.where)
            }),
            count: (args) => baseClient.notificationSettings.count({
                ...args,
                where: applyTenantFilter(args?.where)
            })
        },
        // Raw queries с проверкой tenant
        $queryRaw: baseClient.$queryRaw,
        $executeRaw: baseClient.$executeRaw,
        // Transactions
        $transaction: ((...args) => {
            if (baseClient instanceof client_1.PrismaClient) {
                return baseClient.$transaction(...args);
            }
            return prisma_1.default.$transaction(...args);
        })
    };
}
// Middleware закомментирован из-за проблем с типами Prisma
// В будущем можно добавить логирование другим способом
