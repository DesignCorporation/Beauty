// Beauty Platform Seed Data
// Создание тестовых данных для разработки

import { PrismaClient, UserRole, EntityStatus, Language, Currency, AppointmentStatus, SalonType, ScheduleExceptionType } from '@prisma/client'
import bcrypt from 'bcrypt'
import { seedDefaultRoles } from '../src/seeds/permissions'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Beauty Platform database...')

  // Очистка существующих данных
  await prisma.auditLog.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.service.deleteMany()
  await prisma.serviceSubcategory.deleteMany()
  await prisma.serviceCategory.deleteMany()
  await prisma.client.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.device.deleteMany()
  await prisma.user.deleteMany()
  await prisma.tenant.deleteMany()

  await seedDefaultRoles(prisma)
  console.log('✅ Seeded default roles and permissions')

  // 1. Создание тестового салона (Tenant)
  const salon = await prisma.tenant.create({
    data: {
      slug: 'beauty-test-salon',
      name: 'Beauty Test Salon',
      description: 'Тестовый салон красоты для разработки',
      email: 'info@beauty-test-salon.ru',
      phone: '+7 (495) 123-45-67',
      country: 'Россия',
      city: 'Москва',
      address: 'ул. Тестовая, д. 1',
      postalCode: '123456',
      currency: Currency.RUB,
      language: Language.RU,
      timezone: 'Europe/Moscow',
      status: EntityStatus.ACTIVE,
      isActive: true,
      salonType: SalonType.HAIR
    }
  })

  console.log(`✅ Created salon: ${salon.name}`)

  // 2. Создание Super Admin (через переменные окружения)
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'info@designcorp.eu'
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'CHANGE_ME_NOW'

  if (superAdminPassword === 'CHANGE_ME_NOW') {
    console.warn('⚠️  SUPER_ADMIN_PASSWORD не задан. Используется временный пароль CHANGE_ME_NOW. Задайте переменную окружения!')
  }

  const superAdmin = await prisma.user.create({
    data: {
      email: superAdminEmail,
      password: await bcrypt.hash(superAdminPassword, 10),
      firstName: 'Супер',
      lastName: 'Администратор',
      role: UserRole.SUPER_ADMIN,
      status: EntityStatus.ACTIVE,
      emailVerified: true,
      isActive: true
    }
  })

  console.log(`✅ Created Super Admin: ${superAdmin.email}`)

  // 3. Создание владельца салона
  const salonOwner = await prisma.user.create({
    data: {
      tenantId: salon.id,
      email: 'owner@beauty-test-salon.ru',
      password: await bcrypt.hash('owner123', 10),
      firstName: 'Анна',
      lastName: 'Владелец',
      phone: '+7 (495) 123-45-67',
      role: UserRole.SALON_OWNER,
      status: EntityStatus.ACTIVE,
      emailVerified: true,
      isActive: true
    }
  })

  console.log(`✅ Created Salon Owner: ${salonOwner.email}`)

  // 4. Создание мастеров
  const staff = [
    {
      email: 'master1@beauty-test-salon.ru',
      firstName: 'Мария',
      lastName: 'Иванова',
      color: '#ff6b6b',
      role: UserRole.STAFF_MEMBER
    },
    {
      email: 'master2@beauty-test-salon.ru',
      firstName: 'Елена',
      lastName: 'Петрова', 
      color: '#4ecdc4',
      role: UserRole.STAFF_MEMBER
    },
    {
      email: 'manager@beauty-test-salon.ru',
      firstName: 'Ольга',
      lastName: 'Менеджер',
      color: '#45b7d1',
      role: UserRole.MANAGER
    },
    {
      email: 'reception@beauty-test-salon.ru',
      firstName: 'Светлана',
      lastName: 'Администратор',
      color: '#f9ca24',
      role: UserRole.RECEPTIONIST
    }
  ]

  const createdStaff = []
  for (const member of staff) {
    const staffMember = await prisma.user.create({
      data: {
        tenantId: salon.id,
        email: member.email,
        password: await bcrypt.hash('staff123', 10),
        firstName: member.firstName,
        lastName: member.lastName,
        color: member.color,
        role: member.role,
        status: EntityStatus.ACTIVE,
        emailVerified: true,
        isActive: true
      }
    })
    createdStaff.push(staffMember)
    console.log(`✅ Created ${member.role}: ${staffMember.email}`)
  }

  // Refs for schedule seeding
  const master1 = createdStaff[0]
  const owner = salonOwner

  // 5. Создание клиентов
  const clients = [
    { name: 'Анна Клиентова', email: 'anna@example.com', phone: '+7 (915) 123-11-11' },
    { name: 'Мария Покупатель', email: 'maria@example.com', phone: '+7 (915) 123-22-22' },
    { name: 'Елена Красотка', email: 'elena@example.com', phone: '+7 (915) 123-33-33' },
    { name: 'Ольга Стильная', email: 'olga@example.com', phone: '+7 (915) 123-44-44' },
    { name: 'Светлана Модная', email: 'svetlana@example.com', phone: '+7 (915) 123-55-55' }
  ]

  const createdClients = []
  for (const client of clients) {
    const createdClient = await prisma.client.create({
      data: {
        tenantId: salon.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        status: EntityStatus.ACTIVE
      }
    })
    createdClients.push(createdClient)
  }

  console.log(`✅ Created ${createdClients.length} clients`)

  // 6. Создание категорий и услуг
  const categoryPresets = [
    {
      name: 'Стрижки',
      icon: 'scissors',
      subcategories: ['Женские стрижки', 'Мужские стрижки', 'Детские стрижки']
    },
    {
      name: 'Окрашивание',
      icon: 'palette',
      subcategories: ['Полное окрашивание', 'Мелирование']
    },
    {
      name: 'Уход и укладка',
      icon: 'brush',
      subcategories: ['Уход', 'Укладка']
    }
  ]

  const createdCategories = []
  for (const [idx, preset] of categoryPresets.entries()) {
    const category = await prisma.serviceCategory.create({
      data: {
        tenantId: salon.id,
        name: preset.name,
        icon: preset.icon,
        order: idx,
        isDefault: true,
        subcategories: {
          create: preset.subcategories.map((sub, subIdx) => ({
            name: sub,
            order: subIdx,
            isDefault: true,
            isActive: true
          }))
        }
      },
      include: { subcategories: true }
    })
    createdCategories.push(category)
  }

  const categoryMap = new Map(createdCategories.map(cat => [cat.name, cat]))
  const getSubcategoryId = (categoryName: string, subcategoryName: string) => {
    const category = categoryMap.get(categoryName)
    return category?.subcategories.find(sub => sub.name === subcategoryName)?.id
  }

  const services = [
    {
      name: 'Стрижка женская',
      description: 'Модельная стрижка волос',
      duration: 60,
      price: 2500,
      category: 'Стрижки',
      subcategory: 'Женские стрижки'
    },
    {
      name: 'Стрижка мужская',
      description: 'Стрижка для мужчин',
      duration: 45,
      price: 2000,
      category: 'Стрижки',
      subcategory: 'Мужские стрижки'
    },
    {
      name: 'Окрашивание волос',
      description: 'Полное окрашивание волос',
      duration: 120,
      price: 5000,
      category: 'Окрашивание',
      subcategory: 'Полное окрашивание'
    },
    {
      name: 'Мелирование',
      description: 'Частичное окрашивание',
      duration: 90,
      price: 4200,
      category: 'Окрашивание',
      subcategory: 'Мелирование'
    },
    {
      name: 'Процедура ухода',
      description: 'Уход за волосами с маской',
      duration: 60,
      price: 2800,
      category: 'Уход и укладка',
      subcategory: 'Уход'
    },
    {
      name: 'Праздничная укладка',
      description: 'Укладка для торжеств',
      duration: 45,
      price: 1800,
      category: 'Уход и укладка',
      subcategory: 'Укладка'
    }
  ]

  const createdServices = []
  for (const service of services) {
    const subcategoryId = getSubcategoryId(service.category, service.subcategory)
    const categoryId = categoryMap.get(service.category)?.id

    const serviceData: any = {
      tenantId: salon.id,
      name: service.name,
      description: service.description,
      duration: service.duration,
      price: service.price,
      status: EntityStatus.ACTIVE,
      isDefault: true,
      isActive: true
    }

    // Conditionally add optional fields
    if (categoryId) {
      serviceData.categoryId = categoryId
    }
    if (subcategoryId) {
      serviceData.subcategoryId = subcategoryId
    }

    const createdService = await prisma.service.create({
      data: serviceData
    })
    createdServices.push(createdService)
  }

  console.log(`✅ Created ${createdServices.length} services`)

  // 7. Создание записей на ближайшие дни
  const today = new Date()
  const appointments = []

  for (let day = 0; day < 7; day++) {
    const appointmentDate = new Date(today)
    appointmentDate.setDate(today.getDate() + day)
    appointmentDate.setHours(10, 0, 0, 0) // Начинаем с 10:00

    for (let hour = 0; hour < 6; hour++) {
      const startTime = new Date(appointmentDate)
      startTime.setHours(10 + hour * 2) // Каждые 2 часа

      const service = createdServices[Math.floor(Math.random() * createdServices.length)]
      const client = createdClients[Math.floor(Math.random() * createdClients.length)]
      const staffMember = createdStaff[Math.floor(Math.random() * 2)] // Только мастера

      // Guard checks for possibly undefined values
      if (!service || !client || !staffMember) {
        continue
      }

      const endTime = new Date(startTime)
      endTime.setMinutes(startTime.getMinutes() + service.duration)

      appointments.push({
        appointmentNumber: `BP-${Date.now()}-${appointments.length + 1}`,
        tenantId: salon.id,
        date: appointmentDate,
        startAt: startTime,
        endAt: endTime,
        clientId: client.id,
        serviceId: service.id,
        assignedToId: staffMember.id,
        totalDuration: service.duration,
        totalPrice: service.price,
        status: day === 0 ? AppointmentStatus.IN_PROGRESS :
                day < 3 ? AppointmentStatus.CONFIRMED :
                AppointmentStatus.PENDING,
        notes: `Тестовая запись ${appointments.length + 1}`,
        createdById: salonOwner.id
      })
    }
  }

  const createdAppointments = []
  for (const appointment of appointments) {
    const createdAppointment = await prisma.appointment.create({
      data: appointment
    })
    createdAppointments.push(createdAppointment)
  }

  console.log(`✅ Created ${createdAppointments.length} appointments`)

  // 8. Создание audit логов
  await prisma.auditLog.create({
    data: {
      tenantId: salon.id,
      action: 'CREATE',
      entityType: 'Tenant',
      entityId: salon.id,
      userId: superAdmin.id,
      userRole: UserRole.SUPER_ADMIN,
      newValues: { name: salon.name },
      ipAddress: '127.0.0.1',
      userAgent: 'Seed Script'
    }
  })

  console.log('✅ Created audit logs')

  // 🆕 Schedule Management (Issue #73) - Seed default working hours
  console.log('🕐 Seeding schedule management...')

  // Default salon working hours: 09:00-18:00, Monday-Friday (closed on Saturday/Sunday)
  const workingHoursData = [
    { dayOfWeek: 0, startTime: '10:00', endTime: '18:00', isWorkingDay: true },   // Sunday
    { dayOfWeek: 1, startTime: '09:00', endTime: '19:00', isWorkingDay: true },   // Monday
    { dayOfWeek: 2, startTime: '09:00', endTime: '19:00', isWorkingDay: true },   // Tuesday
    { dayOfWeek: 3, startTime: '09:00', endTime: '19:00', isWorkingDay: true },   // Wednesday
    { dayOfWeek: 4, startTime: '09:00', endTime: '19:00', isWorkingDay: true },   // Thursday
    { dayOfWeek: 5, startTime: '09:00', endTime: '19:00', isWorkingDay: true },   // Friday
    { dayOfWeek: 6, startTime: '09:00', endTime: '15:00', isWorkingDay: true },   // Saturday
  ]

  for (const hours of workingHoursData) {
    await prisma.salonWorkingHour.create({
      data: {
        tenantId: salon.id,
        ...hours
      }
    })
  }

  console.log('✅ Created default salon working hours (09:00-18:00)')

  // Staff working hours for the first master (master1) - same as salon by default, but can be different
  if (master1) {
    for (const hours of workingHoursData) {
      await prisma.staffWorkingHour.create({
        data: {
          tenantId: salon.id,
          staffId: master1.id,
          dayOfWeek: hours.dayOfWeek,
          startTime: hours.startTime,
          endTime: hours.endTime,
          isWorkingDay: hours.isWorkingDay
        }
      })
    }

    console.log('✅ Created staff working hours for master1')
  } else {
    console.log('⚠️  Skipped staff working hours: master1 not created')
  }

  // Example schedule exception (vacation) - using Europe/Warsaw timezone
  const vacationStart = new Date('2025-12-25')  // Christmas
  const vacationEnd = new Date('2025-12-31')    // End of year

  if (master1) {
    await prisma.staffScheduleException.create({
      data: {
        tenantId: salon.id,
        staffId: master1.id,
        startDate: vacationStart,
        endDate: vacationEnd,
        type: 'DAY_OFF',
        reason: 'Holiday vacation',
        createdBy: owner.id,
        // Note: Europe/Warsaw timezone is stored in Tenant.timezone
      }
    })

    console.log('✅ Created example schedule exception (vacation Dec 25-31)')
  } else {
    console.log('⚠️  Skipped schedule exception: master1 not created')
  }

  console.log(`
🎉 Seeding completed successfully!

📊 Created:
   • 1 salon (tenant): ${salon.name}
   • 1 Super Admin: ${superAdminEmail} (password: ${superAdminPassword})
   • 1 Salon Owner: owner@beauty-test-salon.ru (password: owner123)
   • 4 Staff members (password: staff123):
     - master1@beauty-test-salon.ru (Мастер)
     - master2@beauty-test-salon.ru (Мастер)  
     - manager@beauty-test-salon.ru (Менеджер)
     - reception@beauty-test-salon.ru (Администратор)
   • ${createdClients.length} clients
   • ${createdServices.length} services
   • ${createdAppointments.length} appointments
   • 7 salon working hours (09:00-19:00, Monday-Saturday; 10:00-18:00 Sunday)
   • 7 staff working hours for master1
   • 1 schedule exception (vacation Dec 25-31)

🔑 Test Credentials:
   Super Admin: ${superAdminEmail} / ${superAdminPassword}
   Salon Owner: owner@beauty-test-salon.ru / owner123
   Staff: staff123 (for all staff members)

🏢 Tenant ID: ${salon.id}
   Slug: ${salon.slug}
`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
