import express, { type NextFunction, type Request, type Response, type Router } from 'express'
import { tenantPrisma } from '@beauty-platform/database'
import type { TenantRequest } from '../middleware/tenant'

const router: Router = express.Router()

const wrapTenantRoute = (
  handler: (req: TenantRequest, res: Response) => Promise<void>
) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req as TenantRequest, res)
    } catch (error) {
      next(error)
    }
  }

const resolveTenantContext = (req: TenantRequest, res: Response) => {
  const tenantId = req.tenantId

  if (!tenantId) {
    res.status(403).json({
      success: false,
      error: 'TENANT_REQUIRED'
    })
    return undefined
  }

  return {
    tenantId,
    prisma: tenantPrisma(tenantId)
  }
}

interface StaffPayload {
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  color?: string | null
  isBookable?: boolean
  // Issue #82: Specialization & Languages (updated for multi-select)
  specializations?: string[] // Multi-select array
  languages?: string[]
}

interface StaffUpdatePayload extends Partial<StaffPayload> {
  isActive?: boolean
  // Issue #82 (updated for multi-select)
  specializations?: string[] // Multi-select array
  languages?: string[]
}

// GET /api/staff - Получить всех сотрудников салона
router.get(
  '/',
  wrapTenantRoute(async (req, res) => {
    try {
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context
      const roleFilter = typeof req.query.role === 'string' ? req.query.role : undefined
      const bookableOnly = req.query.bookableOnly !== 'false'
      // Issue #82: Filters (updated for multi-select specializations)
      const specializationFilter = typeof req.query.specialization === 'string' ? req.query.specialization : undefined
      const languagesFilter = typeof req.query.languages === 'string' ? req.query.languages.split(',') : undefined
      const serviceFilter = typeof req.query.serviceId === 'string' ? req.query.serviceId : undefined

      const where = {
        tenantId,
        status: 'ACTIVE' as const,
        role: roleFilter ?? undefined,
        NOT: { role: 'CLIENT' as const },
        isBookable: bookableOnly ? true : undefined,
        // Issue #82: Add filters (specializations is now array with hasSome)
        ...(specializationFilter && {
          specializations: {
            hasSome: [specializationFilter]
          }
        }),
        ...(serviceFilter && {
          servicesAvailable: {
            some: {
              serviceId: serviceFilter,
              isActive: true
            }
          }
        })
      }

      const staffRaw = await prisma.user.findMany({
        where,
        orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: true,
          role: true,
          color: true,
          status: true,
          isActive: true,
          isBookable: true,
          // Issue #82: Include new fields (updated for multi-select)
          specializations: true,
          languages: true,
          createdAt: true,
          // Issue #82: Include assigned services for FE filtering
          servicesAvailable: {
            where: {
              isActive: true
            },
            select: {
              id: true,
              serviceId: true,
              service: {
                select: {
                  id: true,
                  name: true,
                  duration: true
                }
              }
            }
          }
        }
      })

      const staff = staffRaw.map((member) => ({
        ...member,
        avatar: member.avatar ?? null,
        avatarUrl: member.avatar ?? null
      }))

      res.json({
        success: true,
        data: staff
      })
    } catch (error) {
      console.error('Error fetching staff:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch staff'
      })
    }
  })
)

// GET /api/staff/working-hours - Получить рабочие часы салона (заглушка)
router.get(
  '/working-hours',
  wrapTenantRoute(async (_req, res) => {
    try {
      const workingHours = [
        { dayOfWeek: 1, isWorkingDay: true, startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 2, isWorkingDay: true, startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 3, isWorkingDay: true, startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 4, isWorkingDay: true, startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 5, isWorkingDay: true, startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 6, isWorkingDay: true, startTime: '10:00', endTime: '16:00' },
        { dayOfWeek: 0, isWorkingDay: false, startTime: null, endTime: null }
      ]

      res.json({
        success: true,
        data: workingHours
      })
    } catch (error) {
      console.error('Error fetching working hours:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch working hours'
      })
    }
  })
)

// POST /api/staff - Создать нового мастера
router.post(
  '/',
  wrapTenantRoute(async (req, res) => {
    try {
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context
      const { firstName, lastName, email, phone, color, specializations, languages } = (req.body ?? {}) as StaffPayload

      if (!firstName || !lastName || !email) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'firstName, lastName, and email are required'
        })
        return
      }

      const newStaffRaw = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          phone: phone ?? null,
          color: color ?? '#6366f1',
          role: 'STAFF_MEMBER',
          status: 'ACTIVE',
          tenantId,
          password: 'temporary-password-123',
          isActive: true,
          isBookable: req.body?.isBookable !== undefined ? Boolean(req.body.isBookable) : true,
          emailVerified: false,
          // Issue #82: Specialization & Languages (updated for multi-select)
          specializations: specializations ?? [],
          languages: languages ?? []
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: true,
          role: true,
          color: true,
          status: true,
          isBookable: true,
          isActive: true,
          // Issue #82: Include new fields (updated for multi-select)
          specializations: true,
          languages: true,
          createdAt: true
        }
      })

      const newStaff = {
        ...newStaffRaw,
        avatar: newStaffRaw.avatar ?? null,
        avatarUrl: newStaffRaw.avatar ?? null
      }

      res.status(201).json({
        success: true,
        data: newStaff,
        message: 'Staff member created successfully'
      })
    } catch (error: any) {
      console.error('Error creating staff:', error)

      if (error?.code === 'P2002') {
        res.status(409).json({
          success: false,
          error: 'Email already exists',
          message: 'A user with this email already exists'
        })
        return
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create staff member'
      })
    }
  })
)

// PUT /api/staff/:id - Обновить мастера
router.put(
  '/:id',
  wrapTenantRoute(async (req, res) => {
    try {
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context
      const payload = (req.body ?? {}) as StaffUpdatePayload

      const updatedStaffRaw = await prisma.user.update({
        where: {
          id: req.params.id,
          tenantId,
          NOT: {
            role: 'CLIENT'
          }
        },
        data: {
          firstName: payload.firstName ?? undefined,
          lastName: payload.lastName ?? undefined,
          email: payload.email ?? undefined,
          phone: payload.phone ?? undefined,
          color: payload.color ?? undefined,
          isActive: payload.isActive ?? undefined,
          isBookable: payload.isBookable ?? undefined,
          // Issue #82: Specialization & Languages (updated for multi-select)
          specializations: payload.specializations ?? undefined,
          languages: payload.languages ?? undefined,
          status:
            typeof payload.isActive === 'boolean'
              ? payload.isActive
                ? 'ACTIVE'
                : 'INACTIVE'
              : undefined
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: true,
          role: true,
          color: true,
          status: true,
          isBookable: true,
          isActive: true,
          // Issue #82: Include new fields (updated for multi-select)
          specializations: true,
          languages: true,
          createdAt: true
        }
      })

      const updatedStaff = {
        ...updatedStaffRaw,
        avatar: updatedStaffRaw.avatar ?? null,
        avatarUrl: updatedStaffRaw.avatar ?? null
      }

      res.json({
        success: true,
        data: updatedStaff,
        message: 'Staff member updated successfully'
      })
    } catch (error: any) {
      console.error('Error updating staff:', error)

      if (error?.code === 'P2025') {
        res.status(404).json({
          success: false,
          error: 'Staff member not found'
        })
        return
      }

      if (error?.code === 'P2002') {
        res.status(409).json({
          success: false,
          error: 'Email already exists'
        })
        return
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update staff member'
      })
    }
  })
)

// DELETE /api/staff/:id - Удалить мастера (soft delete)
router.delete(
  '/:id',
  wrapTenantRoute(async (req, res) => {
    try {
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context

      const deletedStaff = await prisma.user.update({
        where: {
          id: req.params.id,
          tenantId,
          role: 'STAFF_MEMBER'
        },
        data: {
          isActive: false,
          status: 'INACTIVE'
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      })

      res.json({
        success: true,
        data: deletedStaff,
        message: 'Staff member deactivated successfully'
      })
    } catch (error: any) {
      console.error('Error deleting staff:', error)

      if (error?.code === 'P2025') {
        res.status(404).json({
          success: false,
          error: 'Staff member not found'
        })
        return
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete staff member'
      })
    }
  })
)

// Issue #82: POST /:id/services - Assign service to staff
router.post(
  '/:id/services',
  wrapTenantRoute(async (req, res) => {
    try {
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context
      const { serviceId, notes } = req.body

      if (!serviceId) {
        res.status(400).json({
          success: false,
          error: 'serviceId is required'
        })
        return
      }

      // Verify staff exists
      const staff = await prisma.user.findFirst({
        where: {
          id: req.params.id,
          tenantId,
          NOT: { role: 'CLIENT' }
        }
      })

      if (!staff) {
        res.status(404).json({
          success: false,
          error: 'Staff member not found'
        })
        return
      }

      // Verify service exists in tenant
      const service = await prisma.service.findFirst({
        where: {
          id: serviceId,
          tenantId
        }
      })

      if (!service) {
        res.status(404).json({
          success: false,
          error: 'Service not found'
        })
        return
      }

      // Create StaffServiceMap
      const staffServiceMap = await prisma.staffServiceMap.create({
        data: {
          tenantId,
          staffId: req.params.id,
          serviceId,
          notes: notes ?? null,
          isActive: true
        },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              duration: true,
              price: true
            }
          }
        }
      })

      res.status(201).json({
        success: true,
        data: staffServiceMap,
        message: 'Service assigned to staff successfully'
      })
    } catch (error: any) {
      console.error('Error assigning service to staff:', error)

      // Handle unique constraint violation
      if (error?.code === 'P2002') {
        res.status(409).json({
          success: false,
          error: 'Staff member already has this service assigned'
        })
        return
      }

      res.status(500).json({
        success: false,
        error: 'Failed to assign service to staff'
      })
    }
  })
)

// Issue #82: GET /:id/services - Get all services assigned to staff
router.get(
  '/:id/services',
  wrapTenantRoute(async (req, res) => {
    try {
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context

      // Verify staff exists
      const staff = await prisma.user.findFirst({
        where: {
          id: req.params.id,
          tenantId,
          NOT: { role: 'CLIENT' }
        }
      })

      if (!staff) {
        res.status(404).json({
          success: false,
          error: 'Staff member not found'
        })
        return
      }

      // Get all services assigned to staff
      const services = await prisma.staffServiceMap.findMany({
        where: {
          tenantId,
          staffId: req.params.id,
          isActive: true
        },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              duration: true,
              price: true,
              category: true
            }
          }
        },
        orderBy: {
          service: {
            name: 'asc'
          }
        }
      })

      res.json({
        success: true,
        data: services,
        count: services.length
      })
    } catch (error) {
      console.error('Error fetching staff services:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch staff services'
      })
    }
  })
)

// Issue #82: DELETE /:id/services/:serviceId - Remove service from staff
router.delete(
  '/:id/services/:serviceId',
  wrapTenantRoute(async (req, res) => {
    try {
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context

      // Remove service from staff
      const deleted = await prisma.staffServiceMap.deleteMany({
        where: {
          tenantId,
          staffId: req.params.id,
          serviceId: req.params.serviceId
        }
      })

      if (deleted.count === 0) {
        res.status(404).json({
          success: false,
          error: 'Service assignment not found'
        })
        return
      }

      res.json({
        success: true,
        message: 'Service removed from staff successfully'
      })
    } catch (error) {
      console.error('Error removing service from staff:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to remove service from staff'
      })
    }
  })
)

export default router
