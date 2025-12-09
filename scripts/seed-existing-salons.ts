#!/usr/bin/env npx tsx
/**
 * Скрипт для инициализации дефолтных категорий услуг для существующих салонов
 *
 * Использование:
 * 1. Для конкретного салона:
 *    pnpm seed-existing-salons --tenantId=xxx --salonType=HAIR_SALON
 *
 * 2. Для всех салонов без категорий:
 *    pnpm seed-existing-salons --all
 */

import { prisma, seedDefaultCategories, seedDefaultServices, SalonType } from '@beauty-platform/database'
import type { Tenant } from '@prisma/client'

interface Args {
  tenantId?: string
  salonType?: SalonType
  all?: boolean
  dry?: boolean
}

function parseArgs(): Args {
  const args: Args = {}

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i]

    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=')

      if (key === 'tenantId') args.tenantId = value
      if (key === 'salonType') args.salonType = value as SalonType
      if (key === 'all') args.all = true
      if (key === 'dry') args.dry = true
    }
  }

  return args
}

async function seedTenant(
  tenantId: string,
  tenant: Tenant,
  dryRun: boolean = false
): Promise<boolean> {
  try {
    // Проверяем есть ли уже категории
    const existingCategories = await prisma.serviceCategory.findMany({
      where: { tenantId },
      select: { id: true }
    })

    if (existingCategories.length > 0) {
      console.log(
        `⏭️  [${tenantId}] ${tenant.name}: Уже содержит ${existingCategories.length} категории, пропускаем`
      )
      return false
    }

    if (dryRun) {
      console.log(
        `🔍 [DRY-RUN] [${tenantId}] ${tenant.name}: Будет инициализирован с типом ${tenant.salonType || 'CUSTOM'}`
      )
      return true
    }

    const salonType = (tenant.salonType as SalonType) || 'CUSTOM'

    console.log(`🌱 [${tenantId}] ${tenant.name}: Инициализирую категории (${salonType})...`)

    // Запускаем сиды в транзакции
    await prisma.$transaction(async (tx) => {
      await seedDefaultCategories(tx, tenantId, salonType)
      await seedDefaultServices(tx, tenantId, salonType, {})
    })

    // Получаем статистику
    const categories = await prisma.serviceCategory.findMany({
      where: { tenantId },
      select: { id: true }
    })

    const services = await prisma.service.findMany({
      where: { tenantId },
      select: { id: true }
    })

    console.log(
      `✅ [${tenantId}] ${tenant.name}: Создано ${categories.length} категорий, ${services.length} услуг`
    )

    return true
  } catch (error) {
    console.error(
      `❌ [${tenantId}] ${tenant.name}: Ошибка -`,
      error instanceof Error ? error.message : error
    )
    return false
  }
}

async function main() {
  const args = parseArgs()

  console.log('🚀 Инициализация категорий услуг для существующих салонов\n')

  if (args.dry) {
    console.log('📋 Режим DRY-RUN (без внесения изменений)\n')
  }

  try {
    if (args.tenantId) {
      // Инициализация конкретного салона
      console.log(`📍 Режим: Конкретный салон (${args.tenantId})\n`)

      const tenant = await prisma.tenant.findUnique({
        where: { id: args.tenantId }
      })

      if (!tenant) {
        console.error(`❌ Салон ${args.tenantId} не найден`)
        process.exit(1)
      }

      const salonType = args.salonType || (tenant.salonType as SalonType) || 'CUSTOM'
      console.log(`📌 Салон: ${tenant.name}`)
      console.log(`📌 Тип: ${salonType}\n`)

      // Обновляем тип если необходимо
      if (args.salonType && !args.dry) {
        await prisma.tenant.update({
          where: { id: args.tenantId },
          data: { salonType: salonType }
        })
      }

      await seedTenant(args.tenantId, tenant, args.dry)
    } else if (args.all) {
      // Инициализация всех салонов
      console.log(`📍 Режим: Все салоны\n`)

      const tenants = await prisma.tenant.findMany({
        select: {
          id: true,
          name: true,
          salonType: true
        }
      })

      console.log(`📊 Найдено ${tenants.length} салонов\n`)

      let initialized = 0
      let skipped = 0

      for (const tenant of tenants) {
        const result = await seedTenant(tenant.id, tenant as any, args.dry)
        if (result) {
          initialized++
        } else {
          skipped++
        }
      }

      console.log(`\n📈 Результаты:`)
      console.log(`   ✅ Инициализировано: ${initialized}`)
      console.log(`   ⏭️  Пропущено: ${skipped}`)
    } else {
      // Помощь
      console.log(`
Использование:

1. Инициализировать конкретный салон:
   pnpm seed-existing-salons --tenantId=xxx --salonType=HAIR_SALON

2. Инициализировать все салоны:
   pnpm seed-existing-salons --all

3. Сухой запуск (без изменений):
   pnpm seed-existing-salons --all --dry

Доступные типы салонов:
   - HAIR_SALON
   - NAIL_SALON
   - MASSAGE_SPA
   - BARBERSHOP
   - PET_GROOMING
   - BEAUTY_CLINIC
   - GYM_FITNESS
   - WELLNESS_CENTER
   - TANNING_STUDIO
   - WAXING_CENTER
   - TATTOO_PIERCING
   - CUSTOM
      `)
      process.exit(0)
    }

    if (args.dry) {
      console.log('\n📋 Это был DRY-RUN режим. Без флага --dry запустите снова для реальных изменений.')
    }

    console.log('\n✨ Готово!')
    process.exit(0)
  } catch (error) {
    console.error('💥 Критическая ошибка:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
