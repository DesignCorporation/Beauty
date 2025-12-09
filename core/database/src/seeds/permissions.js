"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDefaultPermissions = seedDefaultPermissions;
exports.seedDefaultRoles = seedDefaultRoles;
const client_1 = require("@prisma/client");
const DEFAULT_PERMISSIONS = [
    {
        name: 'platform.admin',
        description: 'Полный доступ к административным функциям платформы',
        category: 'platform'
    },
    {
        name: 'salons.read',
        description: 'Просмотр информации о салоне и его настройках',
        category: 'salons'
    },
    {
        name: 'salons.update',
        description: 'Изменение настроек салона и брендинга',
        category: 'salons'
    },
    {
        name: 'appointments.read',
        description: 'Просмотр расписания и записей клиентов',
        category: 'appointments'
    },
    {
        name: 'appointments.create',
        description: 'Создание новых записей для клиентов',
        category: 'appointments'
    },
    {
        name: 'appointments.update',
        description: 'Редактирование существующих записей',
        category: 'appointments'
    },
    {
        name: 'appointments.delete',
        description: 'Удаление записей и управление отменами',
        category: 'appointments'
    },
    {
        name: 'clients.read',
        description: 'Просмотр карточек клиентов и их истории',
        category: 'clients'
    },
    {
        name: 'clients.create',
        description: 'Создание новых клиентов и профилей',
        category: 'clients'
    },
    {
        name: 'clients.update',
        description: 'Редактирование данных клиентов',
        category: 'clients'
    },
    {
        name: 'clients.delete',
        description: 'Удаление клиентов и управление архивом',
        category: 'clients'
    },
    {
        name: 'services.read',
        description: 'Просмотр списка услуг и категорий',
        category: 'services'
    },
    {
        name: 'services.manage',
        description: 'Создание и редактирование услуг, категорий и цен',
        category: 'services'
    },
    {
        name: 'staff.read',
        description: 'Просмотр сотрудников и их расписания',
        category: 'staff'
    },
    {
        name: 'staff.manage',
        description: 'Управление сотрудниками, ролями и правами доступа',
        category: 'staff'
    },
    {
        name: 'analytics.read',
        description: 'Просмотр аналитики и отчетов по салону',
        category: 'analytics'
    },
    {
        name: 'billing.read',
        description: 'Просмотр финансовых данных и отчетов',
        category: 'billing'
    },
    {
        name: 'billing.manage',
        description: 'Управление платежами, тарифами и выставлением счетов',
        category: 'billing'
    }
];
const ROLE_DESCRIPTIONS = {
    SUPER_ADMIN: 'Полный административный доступ ко всей платформе',
    SALON_OWNER: 'Владелец салона с расширенным доступом ко всем данным своего бизнеса',
    MANAGER: 'Менеджер салона c доступом к операциям и управлению клиентами',
    STAFF_MEMBER: 'Сотрудник салона с доступом к собственным записям и клиентам',
    RECEPTIONIST: 'Администратор стойки ресепшн с фокусом на записи и клиентах',
    ACCOUNTANT: 'Бухгалтер салона с доступом к финансовым данным',
    CLIENT: 'Клиент платформы с доступом к собственным записям'
};
const ALL_PERMISSION_NAMES = DEFAULT_PERMISSIONS.map(permission => permission.name);
const ROLE_PERMISSION_MAP = {
    SUPER_ADMIN: ALL_PERMISSION_NAMES,
    SALON_OWNER: [
        'salons.read',
        'salons.update',
        'appointments.read',
        'appointments.create',
        'appointments.update',
        'appointments.delete',
        'clients.read',
        'clients.create',
        'clients.update',
        'clients.delete',
        'services.read',
        'services.manage',
        'staff.read',
        'staff.manage',
        'analytics.read',
        'billing.read',
        'billing.manage'
    ],
    MANAGER: [
        'salons.read',
        'appointments.read',
        'appointments.create',
        'appointments.update',
        'clients.read',
        'clients.create',
        'clients.update',
        'services.read',
        'services.manage',
        'staff.read',
        'analytics.read',
        'billing.read'
    ],
    STAFF_MEMBER: [
        'appointments.read',
        'appointments.create',
        'appointments.update',
        'clients.read',
        'clients.create',
        'services.read'
    ],
    RECEPTIONIST: [
        'appointments.read',
        'appointments.create',
        'appointments.update',
        'clients.read',
        'clients.create',
        'clients.update',
        'services.read',
        'staff.read'
    ],
    ACCOUNTANT: [
        'salons.read',
        'appointments.read',
        'clients.read',
        'analytics.read',
        'billing.read',
        'billing.manage'
    ],
    CLIENT: [
        'appointments.read',
        'appointments.create',
        'clients.read',
        'services.read'
    ]
};
async function seedDefaultPermissions(prisma) {
    for (const permission of DEFAULT_PERMISSIONS) {
        await prisma.permission.upsert({
            where: { name: permission.name },
            update: {
                description: permission.description,
                category: permission.category
            },
            create: {
                name: permission.name,
                description: permission.description,
                category: permission.category
            }
        });
    }
}
async function seedDefaultRoles(prisma) {
    await seedDefaultPermissions(prisma);
    for (const roleName of Object.values(client_1.UserRole)) {
        const typedRole = roleName;
        const permissions = ROLE_PERMISSION_MAP[typedRole] || [];
        await prisma.role.upsert({
            where: { name: roleName },
            update: {
                description: ROLE_DESCRIPTIONS[typedRole],
                permissions: {
                    set: [],
                    connect: permissions.map(name => ({ name }))
                }
            },
            create: {
                name: roleName,
                description: ROLE_DESCRIPTIONS[typedRole],
                permissions: {
                    connect: permissions.map(name => ({ name }))
                }
            }
        });
    }
}
