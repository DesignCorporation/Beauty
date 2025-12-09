import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleGetAvailableSlots } from '../src/routes/schedule'

type WorkingHourRecord = {
  id: string
  tenantId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isWorkingDay: boolean
  staffId?: string
}

type ScheduleExceptionRecord = {
  id: string
  tenantId: string
  staffId: string | null
  type: 'DAY_OFF' | 'SICK_LEAVE' | 'CUSTOM_HOURS'
  startDate: Date
  endDate: Date
  customStartTime?: string | null
  customEndTime?: string | null
  isWorkingDay?: boolean | null
}

type AppointmentRecord = {
  id: string
  tenantId: string
  staffId?: string
  date: Date
  startTime: Date
  endTime: Date
}

type TenantStore = {
  tenant: { id: string; timezone: string }
  salonWorkingHours: WorkingHourRecord[]
  staffWorkingHours: WorkingHourRecord[]
  exceptions: ScheduleExceptionRecord[]
  appointments: AppointmentRecord[]
}

const tenantStores = new Map<string, TenantStore>()

const lookupStore = (tenantId: string) => {
  const store = tenantStores.get(tenantId)
  if (!store) {
    throw new Error(`Tenant store not found for ${tenantId}`)
  }
  return store
}

const createMockPrismaClient = (tenantId: string) => {
  return {
    tenant: {
      findUnique: async ({ where }: any) => {
        const store = lookupStore(tenantId)
        if (where?.id !== store.tenant.id) {
          return null
        }
        return store.tenant
      }
    },
    salonWorkingHour: {
      findMany: async ({ where }: any) => {
        const store = lookupStore(tenantId)
        return store.salonWorkingHours.filter(record => {
          if (where?.tenantId && record.tenantId !== where.tenantId) return false
          if (typeof where?.dayOfWeek === 'number' && record.dayOfWeek !== where.dayOfWeek) return false
          return true
        })
      }
    },
    staffWorkingHour: {
      findMany: async ({ where }: any) => {
        const store = lookupStore(tenantId)
        return store.staffWorkingHours.filter(record => {
          if (where?.staffId && record.staffId !== where.staffId) return false
          if (typeof where?.dayOfWeek === 'number' && record.dayOfWeek !== where.dayOfWeek) return false
          return true
        })
      }
    },
    staffScheduleException: {
      findMany: async ({ where }: any) => {
        const store = lookupStore(tenantId)
        return store.exceptions.filter(exception => {
          if (where?.tenantId && exception.tenantId !== where.tenantId) return false
          if (where?.staffId === null && exception.staffId !== null) return false
          if (typeof where?.staffId === 'string' && exception.staffId !== where.staffId) return false
          const startLte = where?.startDate?.lte as Date | undefined
          const endGte = where?.endDate?.gte as Date | undefined
          if (startLte && exception.startDate > startLte) return false
          if (endGte && exception.endDate < endGte) return false
          return true
        })
      }
    },
    appointment: {
      findMany: async ({ where }: any) => {
        const store = lookupStore(tenantId)
        return store.appointments
          .filter(appointment => {
            if (where?.tenantId && appointment.tenantId !== where.tenantId) return false
            if (where?.assignedToId && appointment.staffId !== where.assignedToId) return false
            const gte = where?.date?.gte as Date | undefined
            const lt = where?.date?.lt as Date | undefined
            if (gte && appointment.date < gte) return false
            if (lt && appointment.date >= lt) return false
            return true
          })
          .map(appointment => ({
            startAt: appointment.startTime,
            endAt: appointment.endTime
          }))
      }
    }
  }
}

vi.mock('@beauty-platform/database', () => ({
  tenantPrisma: (tenantId: string) => createMockPrismaClient(tenantId)
}))

const TENANT_ID = 'cmhqftgym0005b9vnofzs3u0v'
const STAFF_ID = 'cmhqfth2v001bb9vnaso1wh6h'

const buildDate = (value: string) => new Date(value)

const workingHour = (overrides: Partial<WorkingHourRecord> = {}): WorkingHourRecord => ({
  id: `wh-${overrides.dayOfWeek ?? 1}-${overrides.staffId ?? 'salon'}`,
  tenantId: TENANT_ID,
  dayOfWeek: overrides.dayOfWeek ?? 1,
  startTime: overrides.startTime ?? '09:00',
  endTime: overrides.endTime ?? '17:00',
  isWorkingDay: overrides.isWorkingDay ?? true,
  ...overrides
})

const scheduleException = (overrides: Partial<ScheduleExceptionRecord>): ScheduleExceptionRecord => ({
  id: overrides.id ?? `exc-${Math.random().toString(36).slice(2)}`,
  tenantId: TENANT_ID,
  staffId: overrides.staffId ?? null,
  type: overrides.type ?? 'DAY_OFF',
  startDate: overrides.startDate ?? buildDate('2025-12-15T00:00:00Z'),
  endDate: overrides.endDate ?? buildDate('2025-12-15T23:59:59Z'),
  customStartTime: overrides.customStartTime ?? null,
  customEndTime: overrides.customEndTime ?? null,
  isWorkingDay: overrides.isWorkingDay ?? undefined
})

const appointment = (overrides: Partial<AppointmentRecord>): AppointmentRecord => ({
  id: overrides.id ?? `apt-${Math.random().toString(36).slice(2)}`,
  tenantId: TENANT_ID,
  staffId: overrides.staffId,
  date: overrides.date ?? buildDate('2025-11-20T09:00:00Z'),
  startTime: overrides.startTime ?? buildDate('2025-11-20T09:00:00Z'),
  endTime: overrides.endTime ?? buildDate('2025-11-20T10:00:00Z')
})

const seedTenantStore = (data: Partial<TenantStore>) => {
  tenantStores.set(TENANT_ID, {
    tenant: { id: TENANT_ID, timezone: 'Europe/Warsaw' },
    salonWorkingHours: [],
    staffWorkingHours: [],
    exceptions: [],
    appointments: [],
    ...data
  })
}

const createRequest = (query: Record<string, string>): Request => {
  return {
    query
  } as unknown as Request
}

const createResponse = () => {
  const res: Partial<Response> & { statusCode: number; body: any } = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code
      return this as Response
    },
    json(payload: any) {
      this.body = payload
      return this as Response
    }
  }
  return res as Response & { statusCode: number; body: any }
}

const executeRequest = async (query: Record<string, string>) => {
  const req = createRequest(query)
  const res = createResponse()
  await handleGetAvailableSlots(req, res)
  return res
}

describe('GET /api/schedule/available-slots', () => {
  beforeEach(() => {
    tenantStores.clear()
  })

  it('marks every slot as STAFF_OFF during vacation', async () => {
    seedTenantStore({
      salonWorkingHours: [workingHour({ dayOfWeek: 1 })],
      staffWorkingHours: [workingHour({ dayOfWeek: 1, staffId: STAFF_ID })],
      exceptions: [
        scheduleException({
          staffId: STAFF_ID,
          type: 'DAY_OFF',
          startDate: buildDate('2025-12-15T00:00:00Z'),
          endDate: buildDate('2025-12-20T23:59:59Z')
        })
      ]
    })

    const res = await executeRequest({
      tenantId: TENANT_ID,
      date: '2025-12-15',
      staffId: STAFF_ID,
      serviceDurationMinutes: '60',
      bufferMinutes: '0'
    })

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.slots.length).toBeGreaterThan(0)
    expect(res.body.slots.every((slot: any) => slot.unavailableReason === 'STAFF_OFF')).toBe(true)
  })

  it('restores availability once vacation ends', async () => {
    seedTenantStore({
      salonWorkingHours: [workingHour({ dayOfWeek: 0, startTime: '09:00', endTime: '17:00' })],
      staffWorkingHours: [workingHour({ dayOfWeek: 0, staffId: STAFF_ID, startTime: '09:00', endTime: '17:00' })],
      exceptions: []
    })

    const res = await executeRequest({
      tenantId: TENANT_ID,
      date: '2025-12-21',
      staffId: STAFF_ID,
      serviceDurationMinutes: '60',
      bufferMinutes: '0'
    })

    expect(res.body.success).toBe(true)
    const availableSlots = res.body.slots.filter((slot: any) => slot.available)
    expect(availableSlots.length).toBeGreaterThan(0)
  })

  it('uses custom hours window for the requested day', async () => {
    seedTenantStore({
      salonWorkingHours: [workingHour({ dayOfWeek: 4, startTime: '08:00', endTime: '20:00' })],
      staffWorkingHours: [workingHour({ dayOfWeek: 4, staffId: STAFF_ID, startTime: '08:00', endTime: '20:00' })],
      exceptions: [
        scheduleException({
          staffId: STAFF_ID,
          type: 'CUSTOM_HOURS',
          startDate: buildDate('2025-12-25T00:00:00Z'),
          endDate: buildDate('2025-12-25T23:59:59Z'),
          customStartTime: '10:00',
          customEndTime: '14:00',
          isWorkingDay: true
        })
      ]
    })

    const res = await executeRequest({
      tenantId: TENANT_ID,
      date: '2025-12-25',
      staffId: STAFF_ID,
      serviceDurationMinutes: '60',
      bufferMinutes: '0'
    })

    const availableSlots = res.body.slots.filter((slot: any) => slot.available)
    expect(availableSlots.length).toBeGreaterThan(0)
    expect(availableSlots.at(0)?.startLocal).toBe('10:00')
    expect(availableSlots.at(-1)?.startLocal).toBe('13:00')
  })

  it('marks conflicts and respects buffer minutes', async () => {
    seedTenantStore({
      salonWorkingHours: [workingHour({ dayOfWeek: 4 })],
      staffWorkingHours: [workingHour({ dayOfWeek: 4, staffId: STAFF_ID })],
      appointments: [
        appointment({
          staffId: STAFF_ID,
          date: buildDate('2025-11-20T09:00:00Z'),
          startTime: buildDate('2025-11-20T09:00:00Z'),
          endTime: buildDate('2025-11-20T10:00:00Z')
        })
      ]
    })

    const res = await executeRequest({
      tenantId: TENANT_ID,
      date: '2025-11-20',
      staffId: STAFF_ID,
      serviceDurationMinutes: '60',
      bufferMinutes: '15'
    })

    const slots = res.body.slots
    const byTime = (time: string) => slots.find((slot: any) => slot.startLocal === time)

    expect(byTime('10:00')?.unavailableReason).toBe('APPOINTMENT_CONFLICT')
    expect(byTime('10:15')?.unavailableReason).toBe('APPOINTMENT_CONFLICT')
    expect(byTime('11:00')?.unavailableReason).toBe('APPOINTMENT_CONFLICT')
    expect(byTime('11:15')?.available).toBe(true)
  })

  it('marks early slots as outside working hours', async () => {
    seedTenantStore({
      salonWorkingHours: [workingHour({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' })],
      staffWorkingHours: []
    })

    const res = await executeRequest({
      tenantId: TENANT_ID,
      date: '2025-12-15',
      serviceDurationMinutes: '30',
      bufferMinutes: '0'
    })

    const earlySlots = res.body.slots.filter(
      (slot: any) => slot.startLocal < '09:00'
    )

    expect(earlySlots.length).toBeGreaterThan(0)
    expect(
      earlySlots.every((slot: any) => slot.unavailableReason === 'OUTSIDE_WORKING_HOURS')
    ).toBe(true)
  })

  it('blocks the entire day when the salon is closed', async () => {
    seedTenantStore({
      salonWorkingHours: [workingHour({ dayOfWeek: 4 })],
      staffWorkingHours: [],
      exceptions: [
        scheduleException({
          staffId: null,
          type: 'DAY_OFF',
          startDate: buildDate('2025-12-25T00:00:00Z'),
          endDate: buildDate('2025-12-25T23:59:59Z')
        })
      ]
    })

    const res = await executeRequest({
      tenantId: TENANT_ID,
      date: '2025-12-25',
      serviceDurationMinutes: '30',
      bufferMinutes: '0'
    })

    expect(res.body.slots.length).toBeGreaterThan(0)
    expect(
      res.body.slots.every((slot: any) => slot.unavailableReason === 'SALON_CLOSED')
    ).toBe(true)
  })
})
