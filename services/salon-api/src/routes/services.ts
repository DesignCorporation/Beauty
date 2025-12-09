import express, { type NextFunction, type Request, type Response, type Router } from 'express'
import { z } from 'zod'
import { tenantPrisma } from '@beauty-platform/database'
import type { TenantRequest } from '../middleware/tenant'

const router: Router = express.Router()

const wrapTenantRoute = (
  handler: (req: TenantRequest, res: Response) => Promise<void>
) =>
  async (req: Request, res: Response, next: NextFunction) => {
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
      error: 'TENANT_REQUIRED',
      message: 'Tenant context is required for service operations'
    })
    return undefined
  }

  return {
    tenantId,
    prisma: tenantPrisma(tenantId)
  }
}

const CreateServiceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().optional(),
  duration: z.number().min(1, 'Duration must be at least 1 minute'),
  price: z.number().min(0, 'Price must be non-negative'),
  categoryId: z.string().min(1).optional().nullable(),
  subcategoryId: z.string().min(1).optional().nullable(),
  isActive: z.boolean().optional()
})

const UpdateServiceSchema = CreateServiceSchema.partial()

const serviceSelect = {
  id: true,
  name: true,
  description: true,
  duration: true,
  price: true,
  categoryId: true,
  subcategoryId: true,
  status: true,
  isDefault: true,
  isActive: true,
  category: {
    select: {
      id: true,
      name: true,
      icon: true,
      order: true,
      isDefault: true
    }
  },
  subcategory: {
    select: {
      id: true,
      name: true,
      order: true,
      isDefault: true,
      categoryId: true
    }
  },
  createdAt: true,
  updatedAt: true
} as const

const serializeService = (service: any) => ({
  ...service,
  price: Number(service.price),
  categoryId: service.categoryId ?? service.category?.id ?? null,
  subcategoryId: service.subcategoryId ?? service.subcategory?.id ?? null
})

router.get(
  '/',
  wrapTenantRoute(async (req, res) => {
    try {
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { prisma, tenantId } = context
      const { page = '1', limit = '50', search, status = 'ALL', isActive } = req.query
      const pageNumber = Math.max(Number(page), 1)
      const pageSize = Math.min(Math.max(Number(limit), 1), 200)
      const offset = (pageNumber - 1) * pageSize

      const where: Record<string, unknown> = {
        tenantId
      }

      if (typeof status === 'string' && status.length > 0 && status.toUpperCase() !== 'ALL') {
        where.status = status.toUpperCase()
      }

      if (typeof isActive !== 'undefined') {
        where.isActive = String(isActive).toLowerCase() === 'true'
      }

      if (search && typeof search === 'string') {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }

      const [services, totalCount] = await Promise.all([
        prisma.service.findMany({
          where,
          orderBy: [{ name: 'asc' }],
          take: pageSize,
          skip: offset,
          select: serviceSelect
        }),
        prisma.service.count({ where })
      ])

      const payload = services.map(serializeService)

      res.json({
        success: true,
        data: payload,
        pagination: {
          page: pageNumber,
          limit: pageSize,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSize)
        }
      })
    } catch (error) {
      console.error('Error fetching services:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch services'
      })
    }
  })
)

router.get(
  '/:id',
  wrapTenantRoute(async (req, res) => {
    try {
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context

      const service = await prisma.service.findFirst({
        where: {
          id: req.params.id,
          tenantId
        },
      select: {
        ...serviceSelect,
        appointments: {
          where: { status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
          orderBy: { date: 'desc' },
          take: 10,
          select: {
            id: true,
            date: true,
            startTime: true,
            status: true,
            client: {
              select: { name: true, phone: true }
            },
            assignedTo: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      }
      })

      if (!service) {
        res.status(404).json({
          success: false,
          error: 'Service not found'
        })
        return
      }

      res.json({
        success: true,
        data: serializeService(service)
      })
    } catch (error) {
      console.error('Error fetching service:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch service'
      })
    }
  })
)

router.post(
  '/',
  wrapTenantRoute(async (req, res) => {
    try {
      const payload = CreateServiceSchema.parse(req.body)
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context

      const existingService = await prisma.service.findFirst({
        where: {
          name: payload.name,
          tenantId
        }
      })

      if (existingService) {
        res.status(400).json({
          success: false,
          error: 'Service with this name already exists'
        })
        return
      }

      let categoryId: string | null = null
      let subcategoryId: string | null = null

      if (payload.subcategoryId) {
        const subcategory = await prisma.serviceSubcategory.findFirst({
          where: {
            id: payload.subcategoryId,
            category: {
              tenantId
            }
          },
          select: {
            id: true,
            categoryId: true
          }
        })

        if (!subcategory) {
          res.status(404).json({
            success: false,
            error: 'Subcategory not found'
          })
          return
        }

        subcategoryId = subcategory.id
        categoryId = subcategory.categoryId
      } else if (payload.categoryId) {
        const category = await prisma.serviceCategory.findFirst({
          where: {
            id: payload.categoryId,
            tenantId
          },
          select: { id: true }
        })

        if (!category) {
          res.status(404).json({
            success: false,
            error: 'Category not found'
          })
          return
        }

        categoryId = category.id
      }

      const service = await prisma.service.create({
        data: {
          tenantId,
          name: payload.name,
          description: payload.description,
          duration: payload.duration,
          price: payload.price,
          categoryId,
          subcategoryId,
          status: payload.isActive === false ? 'INACTIVE' : 'ACTIVE',
          isActive: payload.isActive ?? true,
          isDefault: false
        },
        select: serviceSelect
      })

      res.status(201).json({
        success: true,
        data: serializeService(service),
        message: 'Service created successfully'
      })
    } catch (error) {
      console.error('Error creating service:', error)

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors
        })
        return
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create service'
      })
    }
  })
)

router.put(
  '/:id',
  wrapTenantRoute(async (req, res) => {
    try {
      const payload = UpdateServiceSchema.parse(req.body)
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context

      const existingService = await prisma.service.findFirst({
        where: {
          id: req.params.id,
          tenantId
        }
      })

      if (!existingService) {
        res.status(404).json({
          success: false,
          error: 'Service not found'
        })
        return
      }

      if (payload.name && payload.name !== existingService.name) {
        const nameExists = await prisma.service.findFirst({
          where: {
            name: payload.name,
            tenantId,
            id: { not: req.params.id }
          }
        })

        if (nameExists) {
          res.status(400).json({
            success: false,
            error: 'Service with this name already exists'
          })
          return
        }
      }

      let categoryId: string | null | undefined = payload.categoryId ?? undefined
      let subcategoryId: string | null | undefined = payload.subcategoryId ?? undefined

      if (subcategoryId !== undefined) {
        if (subcategoryId === null) {
          categoryId = categoryId ?? null
        } else {
          const subcategory = await prisma.serviceSubcategory.findFirst({
            where: {
              id: subcategoryId,
              category: {
                tenantId
              }
            },
            select: {
              id: true,
              categoryId: true
            }
          })

          if (!subcategory) {
            res.status(400).json({
              success: false,
              error: 'Subcategory not found'
            })
            return
          }

          if (categoryId && categoryId !== subcategory.categoryId) {
            res.status(400).json({
              success: false,
              error: 'Subcategory does not belong to the specified category'
            })
            return
          }

          subcategoryId = subcategory.id
          categoryId = subcategory.categoryId
        }
      }

      if (categoryId !== undefined && categoryId !== null && subcategoryId === undefined) {
        const category = await prisma.serviceCategory.findFirst({
          where: {
            id: categoryId,
            tenantId
          },
          select: { id: true }
        })

        if (!category) {
          res.status(400).json({
            success: false,
            error: 'Category not found'
          })
          return
        }
      }

      const service = await prisma.service.update({
        where: { id: req.params.id },
        data: {
          name: payload.name ?? undefined,
          description: payload.description ?? undefined,
          duration: payload.duration ?? undefined,
          price: payload.price ?? undefined,
          isActive: typeof payload.isActive !== 'undefined' ? payload.isActive : undefined,
          status:
            typeof payload.isActive !== 'undefined'
              ? payload.isActive
                ? 'ACTIVE'
                : 'INACTIVE'
              : undefined,
          categoryId: categoryId ?? (categoryId === null ? null : undefined),
          subcategoryId: subcategoryId ?? (subcategoryId === null ? null : undefined),
          updatedAt: new Date()
        },
        select: serviceSelect
      })

      res.json({
        success: true,
        data: serializeService(service),
        message: 'Service updated successfully'
      })
    } catch (error) {
      console.error('Error updating service:', error)

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors
        })
        return
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update service'
      })
    }
  })
)

router.delete(
  '/:id',
  wrapTenantRoute(async (req, res) => {
    try {
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context

      const service = await prisma.service.findFirst({
        where: {
          id: req.params.id,
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

      const activeAppointments = await prisma.appointment.count({
        where: {
          serviceId: req.params.id,
          status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] }
        }
      })

      if (activeAppointments > 0) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete service with active appointments'
        })
        return
      }

      await prisma.service.update({
        where: { id: req.params.id },
        data: {
          status: 'INACTIVE',
          isActive: false
        }
      })

      res.json({
        success: true,
        message: 'Service deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting service:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete service'
      })
    }
  })
)

export default router;
