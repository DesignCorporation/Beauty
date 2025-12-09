/**
 * Schedule Management Routes (Issue #74)
 * Manages salon and staff working hours, exceptions, and available slot calculations
 */

import express, { type NextFunction, type Request, type Response, type Router } from 'express'
import { z } from 'zod'
import { tenantPrisma } from '@beauty-platform/database'
import { assertAuth } from '@beauty/shared'
import type { TenantRequest } from '../middleware/tenant'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const router: Router = express.Router()

const SLOT_INTERVAL_MINUTES = 15
const MINUTES_IN_DAY = 24 * 60

const AUTH_REQUIRED_ERROR = 'Authentication required'

// Enum for slot unavailability reasons
enum SlotUnavailabilityReason {
  APPOINTMENT_CONFLICT = 'APPOINTMENT_CONFLICT',
  SALON_CLOSED = 'SALON_CLOSED',
  STAFF_OFF = 'STAFF_OFF',
  OUTSIDE_WORKING_HOURS = 'OUTSIDE_WORKING_HOURS'
}

// Validation schemas
const TimeFormatRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/

const WorkingHourSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(TimeFormatRegex, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(TimeFormatRegex, 'Invalid time format (HH:mm)'),
  isWorkingDay: z.boolean().default(true)
})

const ScheduleExceptionSchema = z.object({
  staffId: z.string().optional().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  type: z.enum(['DAY_OFF', 'SICK_LEAVE', 'CUSTOM_HOURS']),
  customStartTime: z.string().regex(TimeFormatRegex).optional().nullable(),
  customEndTime: z.string().regex(TimeFormatRegex).optional().nullable(),
  isWorkingDay: z.boolean().optional().nullable(),
  reason: z.string().max(255).optional().nullable()
})

const AvailableSlotsQuerySchema = z.object({
  tenantId: z.string().cuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  staffId: z.string().optional(),
  serviceDurationMinutes: z.coerce.number().min(15).max(480),
  bufferMinutes: z.coerce.number().min(0).max(60).default(0)
})

// Helper functions
const wrapTenantRoute = (
  handler: (req: TenantRequest, res: Response) => Promise<any>
) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req as TenantRequest, res)
    } catch (error) {
      next(error)
    }
  }

const requireTenantContext = (
  req: TenantRequest,
  res: Response
): { tenantId: string } | null => {
  try {
    const auth = assertAuth(req)
    const tenantId = req.tenantId ?? auth.tenantId

    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Tenant ID not found. Please login again.'
      })
      return null
    }

    return { tenantId }
  } catch (error) {
    if (error instanceof Error && error.message === AUTH_REQUIRED_ERROR) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
      return null
    }
    throw error
  }
}

/**
 * Helper: Validate time range
 */
const isValidTimeRange = (startTime: string, endTime: string): boolean => {
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }
  return timeToMinutes(startTime) < timeToMinutes(endTime)
}

/**
 * GET /api/crm/settings/working-hours
 * Get salon working hours for all days of week
 */
router.get(
  '/api/settings/working-hours',
  wrapTenantRoute(async (req: TenantRequest, res: Response) => {
    const context = requireTenantContext(req, res)
    if (!context) return

    const { tenantId } = context
    const prisma = tenantPrisma(tenantId) as any

    const workingHours = await prisma.salonWorkingHour.findMany({
      where: { tenantId },
      orderBy: { dayOfWeek: 'asc' }
    })

    res.json({
      success: true,
      data: workingHours
    })
  })
)

/**
 * PUT /api/crm/settings/working-hours
 * Update salon working hours (all days)
 */
router.put(
  '/api/settings/working-hours',
  wrapTenantRoute(async (req: TenantRequest, res: Response) => {
    const context = requireTenantContext(req, res)
    if (!context) return

    const { tenantId } = context
    const auth = assertAuth(req)
    const prisma = tenantPrisma(tenantId) as any

    // Validate request body
    if (!Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        error: 'Expected array of working hours'
      })
    }

    // Validate each entry
    const validationResult = z.array(WorkingHourSchema).safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid working hours format',
        details: validationResult.error.errors
      })
    }

    const workingHoursData = validationResult.data

    // Validate time ranges
    for (const hours of workingHoursData) {
      if (hours.isWorkingDay && !isValidTimeRange(hours.startTime, hours.endTime)) {
        return res.status(400).json({
          success: false,
          error: `Invalid time range for day ${hours.dayOfWeek}: startTime must be before endTime`
        })
      }
    }

    try {
      // Delete existing working hours and recreate
      await prisma.salonWorkingHour.deleteMany({
        where: { tenantId }
      })

      const created = await Promise.all(
        workingHoursData.map(hours =>
          prisma.salonWorkingHour.create({
            data: {
              tenantId,
              ...hours
            }
          })
        )
      )

      console.log(
        `✅ Updated salon working hours (${created.length} days) for tenant ${tenantId.slice(0, 8)}... by user ${auth.email}`
      )

      res.json({
        success: true,
        message: `Updated ${created.length} working hour records`,
        data: created
      })
    } catch (error) {
      console.error('Error updating working hours:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update working hours'
      })
    }
  })
)

/**
 * GET /api/staff/:id/schedule
 * Get staff member's working hours and exceptions
 */
router.get(
  '/api/staff/:id/schedule',
  wrapTenantRoute(async (req: TenantRequest, res: Response) => {
    const context = requireTenantContext(req, res)
    if (!context) return

    const { tenantId } = context
    const { id: staffId } = req.params
    const prisma = tenantPrisma(tenantId) as any

    try {
      // Get staff member
      const staff = await prisma.user.findUnique({
        where: { id: staffId }
      })

      if (!staff) {
        return res.status(404).json({
          success: false,
          error: 'Staff member not found'
        })
      }

      // Get staff working hours
      const workingHours = await prisma.staffWorkingHour.findMany({
        where: { staffId },
        orderBy: { dayOfWeek: 'asc' }
      })

      // Get staff exceptions
      const exceptions = await prisma.staffScheduleException.findMany({
        where: { staffId },
        orderBy: { startDate: 'asc' }
      })

      res.json({
        success: true,
        data: {
          staffId,
          staffName: `${staff.firstName} ${staff.lastName}`,
          workingHours,
          exceptions
        }
      })
    } catch (error) {
      console.error('Error fetching staff schedule:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch staff schedule'
      })
    }
  })
)

/**
 * PUT /api/staff/:id/schedule
 * Update staff member's working hours
 */
router.put(
  '/api/staff/:id/schedule',
  wrapTenantRoute(async (req: TenantRequest, res: Response) => {
    const context = requireTenantContext(req, res)
    if (!context) return

    const { tenantId } = context
    const { id: staffId } = req.params
    const auth = assertAuth(req)
    const prisma = tenantPrisma(tenantId) as any

    // Validate staff exists
    const staff = await prisma.user.findUnique({
      where: { id: staffId }
    })

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      })
    }

    // Validate request body
    if (!Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        error: 'Expected array of working hours'
      })
    }

    const validationResult = z.array(WorkingHourSchema).safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid working hours format',
        details: validationResult.error.errors
      })
    }

    const workingHoursData = validationResult.data

    // Validate time ranges
    for (const hours of workingHoursData) {
      if (hours.isWorkingDay && !isValidTimeRange(hours.startTime, hours.endTime)) {
        return res.status(400).json({
          success: false,
          error: `Invalid time range for day ${hours.dayOfWeek}`
        })
      }
    }

    try {
      // Delete existing and recreate
      console.log(`🔧 Deleting existing schedules for staff ${staffId}`)
      const deleteResult = await prisma.staffWorkingHour.deleteMany({
        where: { staffId }
      })
      console.log(`✅ Deleted ${deleteResult.count} existing schedules`)

      // Validate data before creation
      console.log(`📝 Creating ${workingHoursData.length} new schedule records`)
      console.log(`📋 Data to create:`, JSON.stringify(workingHoursData, null, 2))

      const created = await Promise.all(
        workingHoursData.map((hours, index) => {
          const createData = {
            tenantId,
            staffId,
            ...hours
          }
          console.log(`[${index + 1}/${workingHoursData.length}] Creating record:`, createData)
          return prisma.staffWorkingHour.create({
            data: createData
          })
        })
      )

      console.log(
        `✅ Updated schedule for staff ${staff.firstName} ${staff.lastName} (${created.length} days) by ${auth.email}`
      )

      res.json({
        success: true,
        message: `Updated ${created.length} schedule records`,
        data: created
      })
    } catch (error: any) {
      console.error('❌ Error updating staff schedule:')
      console.error('Error type:', error?.constructor?.name)
      console.error('Error message:', error?.message)
      console.error('Error code:', error?.code)
      console.error('Error meta:', error?.meta)
      console.error('Full error:', error)

      res.status(500).json({
        success: false,
        error: 'Failed to update staff schedule',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      })
    }
  })
)

/**
 * POST /api/staff/:id/schedule/exceptions
 * Create schedule exception (vacation, sick leave, custom hours)
 */
router.post(
  '/api/staff/:id/schedule/exceptions',
  wrapTenantRoute(async (req: TenantRequest, res: Response) => {
    const context = requireTenantContext(req, res)
    if (!context) return

    const { tenantId } = context
    const { id: staffId } = req.params
    const auth = assertAuth(req)
    const prisma = tenantPrisma(tenantId) as any

    // Validate staff exists
    const staff = await prisma.user.findUnique({
      where: { id: staffId }
    })

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      })
    }

    // Validate request body
    const validationResult = ScheduleExceptionSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exception format',
        details: validationResult.error.errors
      })
    }

    const exceptionData = validationResult.data

    // Validate date range
    const startDate = new Date(exceptionData.startDate)
    const endDate = new Date(exceptionData.endDate)

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date must be before or equal to end date'
      })
    }

    // Validate CUSTOM_HOURS fields
    if (exceptionData.type === 'CUSTOM_HOURS') {
      if (!exceptionData.customStartTime || !exceptionData.customEndTime) {
        return res.status(400).json({
          success: false,
          error: 'CUSTOM_HOURS type requires customStartTime and customEndTime'
        })
      }

      if (!isValidTimeRange(exceptionData.customStartTime, exceptionData.customEndTime)) {
        return res.status(400).json({
          success: false,
          error: 'Custom start time must be before custom end time'
        })
      }
    }

    try {
      const exception = await prisma.staffScheduleException.create({
        data: {
          tenantId,
          staffId,
          startDate,
          endDate,
          type: exceptionData.type,
          customStartTime: exceptionData.customStartTime,
          customEndTime: exceptionData.customEndTime,
          isWorkingDay: exceptionData.isWorkingDay,
          reason: exceptionData.reason,
          createdBy: auth.userId
        }
      })

      console.log(
        `✅ Created schedule exception for ${staff.firstName} ${staff.lastName} (${exceptionData.type}) by ${auth.email}`
      )

      res.status(201).json({
        success: true,
        message: 'Schedule exception created',
        data: exception
      })
    } catch (error) {
      console.error('Error creating schedule exception:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create schedule exception'
      })
    }
  })
)

/**
 * DELETE /api/staff/:id/schedule/exceptions/:exceptionId
 * Delete schedule exception
 */
router.delete(
  '/api/staff/:id/schedule/exceptions/:exceptionId',
  wrapTenantRoute(async (req: TenantRequest, res: Response) => {
    const context = requireTenantContext(req, res)
    if (!context) return

    const { tenantId } = context
    const { id: staffId, exceptionId } = req.params
    const auth = assertAuth(req)
    const prisma = tenantPrisma(tenantId) as any

    try {
      // Verify exception exists and belongs to this staff
      const exception = await prisma.staffScheduleException.findUnique({
        where: { id: exceptionId }
      })

      if (!exception) {
        return res.status(404).json({
          success: false,
          error: 'Exception not found'
        })
      }

      if (exception.staffId !== staffId) {
        return res.status(403).json({
          success: false,
          error: 'Exception does not belong to this staff member'
        })
      }

      await prisma.staffScheduleException.delete({
        where: { id: exceptionId }
      })

      console.log(`✅ Deleted schedule exception ${exceptionId} by ${auth.email}`)

      res.json({
        success: true,
        message: 'Schedule exception deleted'
      })
    } catch (error) {
      console.error('Error deleting schedule exception:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete schedule exception'
      })
    }
  })
)

/**
 * GET /api/crm/schedule/available-slots
 * Get available time slots for booking with proper timezone handling
 *
 * Query params:
 * - date: YYYY-MM-DD
 * - staffId: optional staff member ID
 * - serviceDurationMinutes: service duration in minutes (15-480)
 * - bufferMinutes: buffer between appointments (default: 0, 0-60)
 *
 * Response format: slots with both local and UTC times
 */
export const handleGetAvailableSlots = async (req: Request, res: Response) => {
  const validationResult = AvailableSlotsQuerySchema.safeParse(req.query)
  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid query parameters',
      details: validationResult.error.errors
    })
  }

  const {
    tenantId: queryTenantId,
    date: dateString,
    staffId,
    serviceDurationMinutes,
    bufferMinutes
  } = validationResult.data

  let tenantId = queryTenantId
  if (!tenantId) {
    const context = requireTenantContext(req as TenantRequest, res)
    if (!context) return
    tenantId = context.tenantId
  }

  const prisma = tenantPrisma(tenantId) as any

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { timezone: true }
    })

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      })
    }

    const timezone = tenant.timezone
    const dateUTC = new Date(`${dateString}T00:00:00Z`)
    const dateUTCNext = new Date(dateUTC.getTime() + 24 * 60 * 60 * 1000)
    const zonedDate = toZonedTime(dateUTC, timezone)
    const dayOfWeek = zonedDate.getDay()

    let workingHoursSource: 'staff' | 'salon' = 'salon'
    let workingHours: any[] = []

    if (staffId) {
      const staffHours = await prisma.staffWorkingHour.findMany({
        where: { staffId, dayOfWeek }
      })

      if (staffHours.length > 0) {
        workingHours = staffHours
        workingHoursSource = 'staff'
      } else {
        workingHours = await prisma.salonWorkingHour.findMany({
          where: { tenantId, dayOfWeek }
        })
      }
    } else {
      workingHours = await prisma.salonWorkingHour.findMany({
        where: { tenantId, dayOfWeek }
      })
    }

    const workingHour = workingHours[0] ?? null

    const [salonExceptions, staffExceptions] = await Promise.all([
      prisma.staffScheduleException.findMany({
        where: {
          tenantId,
          staffId: null,
          startDate: { lte: dateUTCNext },
          endDate: { gte: dateUTC }
        }
      }),
      staffId
        ? prisma.staffScheduleException.findMany({
            where: {
              tenantId,
              staffId,
              startDate: { lte: dateUTCNext },
              endDate: { gte: dateUTC }
            }
          })
        : Promise.resolve([])
    ])

    const isDayOffType = (exception: any) =>
      Boolean(exception && (exception.type === 'DAY_OFF' || exception.type === 'SICK_LEAVE'))

    const salonClosedException = salonExceptions.find(isDayOffType)
    const staffOffException = staffExceptions.find(isDayOffType)

    const salonCustomException = salonExceptions.find((exception: any) => exception.type === 'CUSTOM_HOURS')
    const staffCustomException = staffExceptions.find((exception: any) => exception.type === 'CUSTOM_HOURS')

    let hasWorkingTemplate = Boolean(workingHour)
    let effectiveStartTime = workingHour?.startTime ?? '00:00'
    let effectiveEndTime = workingHour?.endTime ?? '00:00'
    let effectiveIsWorkingDay = workingHour ? workingHour.isWorkingDay !== false : false

    const applyCustomException = (custom?: any) => {
      if (!custom) return
      if (custom.customStartTime) {
        effectiveStartTime = custom.customStartTime
        hasWorkingTemplate = true
      }
      if (custom.customEndTime) {
        effectiveEndTime = custom.customEndTime
        hasWorkingTemplate = true
      }
      if (typeof custom.isWorkingDay === 'boolean') {
        effectiveIsWorkingDay = custom.isWorkingDay
      }
    }

    applyCustomException(salonCustomException)
    applyCustomException(staffCustomException)

    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + minutes
    }

    const minutesToTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
    }

    const startMinutes = hasWorkingTemplate ? timeToMinutes(effectiveStartTime) : 0
    const endMinutes = hasWorkingTemplate ? timeToMinutes(effectiveEndTime) : 0
    const hasConfiguredWindow = hasWorkingTemplate && effectiveIsWorkingDay && endMinutes > startMinutes

    let salonScheduleClosed =
      Boolean(salonClosedException) ||
      (!hasWorkingTemplate && workingHoursSource === 'salon') ||
      (workingHour && workingHoursSource === 'salon' && workingHour.isWorkingDay === false) ||
      Boolean(salonCustomException && salonCustomException.isWorkingDay === false)

    if (!staffId && !workingHour) {
      salonScheduleClosed = true
    }

    const staffScheduleClosed =
      Boolean(staffId) &&
      (
        Boolean(staffOffException) ||
        (workingHour && workingHoursSource === 'staff' && workingHour.isWorkingDay === false) ||
        Boolean(staffCustomException && staffCustomException.isWorkingDay === false)
      )

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        date: {
          gte: dateUTC,
          lt: dateUTCNext
        },
        ...(staffId ? { assignedToId: staffId } : {})
      },
      select: {
        startAt: true,
        endAt: true
      }
    })

    const bufferMillis = bufferMinutes * 60 * 1000

    const slots: Array<{
      startLocal: string
      endLocal: string
      startUtc: string
      endUtc: string
      available: boolean
      unavailableReason?: SlotUnavailabilityReason
    }> = []

    if (!hasConfiguredWindow && !salonScheduleClosed && !staffScheduleClosed) {
      // Без настроенных рабочих часов считаем салон закрытым на день
      salonScheduleClosed = true
    }

    const slotWindowStart = 0
    const slotWindowEnd = MINUTES_IN_DAY

    for (
      let slotStart = slotWindowStart;
      slotStart + serviceDurationMinutes <= slotWindowEnd;
      slotStart += SLOT_INTERVAL_MINUTES
    ) {
      const slotEnd = slotStart + serviceDurationMinutes
      const localStartTime = minutesToTime(slotStart)
      const localEndTime = minutesToTime(slotEnd)

      const slotStartUtc = fromZonedTime(
        new Date(`${dateString}T${localStartTime}:00`),
        timezone
      )
      const slotEndUtc = fromZonedTime(
        new Date(`${dateString}T${localEndTime}:00`),
        timezone
      )

      const isInsideWorkingWindow = hasConfiguredWindow && slotStart >= startMinutes && slotEnd <= endMinutes

      let unavailableReason: SlotUnavailabilityReason | undefined

      if (salonScheduleClosed) {
        unavailableReason = SlotUnavailabilityReason.SALON_CLOSED
      } else if (staffScheduleClosed) {
        unavailableReason = SlotUnavailabilityReason.STAFF_OFF
      } else if (!isInsideWorkingWindow) {
        unavailableReason = SlotUnavailabilityReason.OUTSIDE_WORKING_HOURS
      } else {
        const hasConflict = appointments.some((appointment: any) => {
      const appointmentStart = appointment.startAt instanceof Date
        ? appointment.startAt.getTime()
        : new Date(appointment.startAt).getTime()
      const appointmentEnd = appointment.endAt instanceof Date
        ? appointment.endAt.getTime()
        : new Date(appointment.endAt).getTime()

          return (
            slotStartUtc.getTime() < appointmentEnd + bufferMillis &&
            slotEndUtc.getTime() > appointmentStart - bufferMillis
          )
        })

        if (hasConflict) {
          unavailableReason = SlotUnavailabilityReason.APPOINTMENT_CONFLICT
        }
      }

      const available = !unavailableReason

      slots.push({
        startLocal: localStartTime,
        endLocal: localEndTime,
        startUtc: slotStartUtc.toISOString(),
        endUtc: slotEndUtc.toISOString(),
        available,
        ...(unavailableReason && { unavailableReason })
      })
    }

    res.json({
      success: true,
      date: dateString,
      timezone,
      slots
    })
  } catch (error) {
    console.error('Error fetching available slots:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available slots',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}

router.get('/api/schedule/available-slots', handleGetAvailableSlots)

export default router
