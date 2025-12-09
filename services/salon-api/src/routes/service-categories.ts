import express, { type NextFunction, type Request, type Response, type Router } from 'express'
import { z } from 'zod'
import { tenantPrisma, seedDefaultCategories, seedDefaultServices, SalonType, prisma, Prisma } from '@beauty-platform/database'
import type { TenantRequest } from '../middleware/tenant'

const categoryRouter: Router = express.Router()
const subcategoryRouter: Router = express.Router()

const wrapTenantRoute =
  (handler: (req: TenantRequest, res: Response) => Promise<void>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req as TenantRequest, res)
    } catch (error) {
      next(error)
    }
  }

const resolveTenantContext = (
  req: TenantRequest,
  res: Response
): { tenantId: string; prisma: ReturnType<typeof tenantPrisma> } | undefined => {
  const tenantId = req.tenantId ?? undefined

  if (!tenantId) {
    res.status(403).json({
      success: false,
      error: 'TENANT_REQUIRED',
      message: 'Tenant context is required for service category management'
    })
    return undefined
  }

  return {
    tenantId,
    prisma: tenantPrisma(tenantId)
  }
}

const CategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  icon: z.string().optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional()
});

const CategoryUpdateSchema = CategorySchema.partial();

const SubcategorySchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Subcategory name is required'),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional()
});

const SubcategoryUpdateSchema = SubcategorySchema.partial().omit({ categoryId: true });

const ReorderSchema = z.array(
  z.object({
    id: z.string().min(1),
    order: z.number().int().min(0)
  })
);

const categorySelect = Prisma.validator<Prisma.ServiceCategorySelect>()({
  id: true,
  name: true,
  icon: true,
  order: true,
  isDefault: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  subcategories: {
    select: {
      id: true,
      name: true,
      order: true,
      isDefault: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { order: 'asc' }
  },
  services: {
    select: {
      id: true,
      name: true,
      isDefault: true,
      isActive: true,
      duration: true,
      price: true,
      subcategoryId: true
    },
    orderBy: { name: 'asc' }
  }
});

type CategoryPayload = Prisma.ServiceCategoryGetPayload<{
  select: typeof categorySelect;
}>;

categoryRouter.get(
  '/',
  wrapTenantRoute(async (req, res) => {
    try {
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context

      const categories = (await prisma.serviceCategory.findMany({
        where: { tenantId },
        orderBy: { order: 'asc' },
        select: categorySelect
      })) as unknown as CategoryPayload[]

      const payload = categories.map((category) => ({
        ...category,
        services: category.services.map((service) => ({
          ...service,
          price: Number(service.price)
        }))
      }))

      res.json({
        success: true,
        data: payload
      })
    } catch (error) {
      console.error('Error fetching categories:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch service categories'
      })
    }
  })
)

categoryRouter.get(
  '/:id',
  wrapTenantRoute(async (req, res) => {
    try {
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context
      const category = (await prisma.serviceCategory.findFirst({
        where: {
          id: req.params.id,
          tenantId
        },
        select: categorySelect
      })) as unknown as CategoryPayload | null

      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found'
        })
        return
      }

      const payload = {
        ...category,
        services: category.services.map((service) => ({
          ...service,
          price: Number(service.price)
        }))
      }

      res.json({
        success: true,
        data: payload
      })
    } catch (error) {
      console.error('Error fetching category:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch category'
      })
    }
  })
)

categoryRouter.post(
  '/',
  wrapTenantRoute(async (req, res) => {
    try {
      const data = CategorySchema.parse(req.body)
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context

      const duplicate = await prisma.serviceCategory.findFirst({
        where: {
          tenantId,
          name: data.name
        }
      })

      if (duplicate) {
        res.status(400).json({
          success: false,
          error: 'Category with this name already exists'
        })
        return
      }

      const order =
        typeof data.order === 'number'
          ? data.order
          : await prisma.serviceCategory.count({ where: { tenantId } })

      const category = await prisma.serviceCategory.create({
        data: {
          tenantId,
          name: data.name,
          icon: data.icon,
          order,
          isActive: data.isActive ?? true,
          isDefault: false
        },
        select: categorySelect
      })

      res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully'
      })
    } catch (error) {
      console.error('Error creating category:', error)

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
        error: 'Failed to create category'
      })
    }
  })
)

categoryRouter.put(
  '/:id',
  wrapTenantRoute(async (req, res) => {
    try {
      const updateData = CategoryUpdateSchema.parse(req.body)
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context

      const category = await prisma.serviceCategory.findFirst({
        where: {
          id: req.params.id,
          tenantId
        }
      })

      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found'
        })
        return
      }

      if (updateData.name && updateData.name !== category.name) {
        const duplicate = await prisma.serviceCategory.findFirst({
          where: {
            tenantId,
            name: updateData.name,
            id: { not: req.params.id }
          }
        })

        if (duplicate) {
          res.status(400).json({
            success: false,
            error: 'Category with this name already exists'
          })
          return
        }
      }

      const updated = (await prisma.serviceCategory.update({
        where: { id: req.params.id },
        data: {
          name: updateData.name ?? undefined,
          icon: updateData.icon !== undefined ? updateData.icon : undefined,
          order: typeof updateData.order === 'number' ? updateData.order : undefined,
          isActive: typeof updateData.isActive !== 'undefined' ? updateData.isActive : undefined
        },
        select: categorySelect
      })) as unknown as CategoryPayload

      const payload = {
        ...updated,
        services: updated.services.map((service) => ({
          ...service,
          price: Number(service.price)
        }))
      }

      res.json({
        success: true,
        data: payload,
        message: 'Category updated successfully'
      })
    } catch (error) {
      console.error('Error updating category:', error)

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
        error: 'Failed to update category'
      })
    }
  })
)

categoryRouter.delete(
  '/:id',
  wrapTenantRoute(async (req, res) => {
    try {
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context
      const category = await prisma.serviceCategory.findFirst({
        where: {
          id: req.params.id,
          tenantId
        }
      })

      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found'
        })
        return
      }

      if (category.isDefault) {
        res.status(400).json({
          success: false,
          error: 'Default categories cannot be deleted'
        })
        return
      }

      await prisma.service.updateMany({
        where: {
          tenantId,
          categoryId: category.id
        },
        data: {
          categoryId: null,
          subcategoryId: null
        }
      })

      await prisma.serviceSubcategory.deleteMany({
        where: {
          categoryId: category.id
        }
      })

      await prisma.serviceCategory.delete({
        where: {
          id: category.id
        }
      })

      res.json({
        success: true,
        message: 'Category deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting category:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete category'
      })
    }
  })
)

categoryRouter.post(
  '/reorder',
  wrapTenantRoute(async (req, res) => {
    try {
      const reorderPayload = ReorderSchema.parse(req.body)
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context

      for (const item of reorderPayload) {
        const category = await prisma.serviceCategory.findFirst({
          where: {
            id: item.id,
            tenantId
          },
          select: { id: true }
        })

        if (!category) {
          res.status(404).json({
            success: false,
            error: `Category ${item.id} not found`
          })
          return
        }

        await prisma.serviceCategory.update({
          where: { id: category.id },
          data: { order: item.order }
        })
      }

      res.json({
        success: true,
        message: 'Categories reordered successfully'
      })
    } catch (error) {
      console.error('Error reordering categories:', error)

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
        error: 'Failed to reorder categories'
      })
    }
  })
)

categoryRouter.get(
  '/:categoryId/subcategories',
  wrapTenantRoute(async (req, res) => {
    try {
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context
      const category = (await prisma.serviceCategory.findFirst({
        where: {
          id: req.params.categoryId,
          tenantId
        },
        select: categorySelect
      })) as unknown as CategoryPayload | null

      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found'
        })
        return
      }

      res.json({
        success: true,
        data: category.subcategories
      })
    } catch (error) {
      console.error('Error fetching subcategories:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subcategories'
      })
    }
  })
)

subcategoryRouter.post(
  '/',
  wrapTenantRoute(async (req, res) => {
    try {
      const data = SubcategorySchema.parse(req.body)
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context

      const category = await prisma.serviceCategory.findFirst({
        where: {
          id: data.categoryId,
          tenantId
        }
      })

      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Category not found'
        })
        return
      }

      const duplicate = await prisma.serviceSubcategory.findFirst({
        where: {
          categoryId: category.id,
          name: data.name
        }
      })

      if (duplicate) {
        res.status(400).json({
          success: false,
          error: 'Subcategory with this name already exists in the category'
        })
        return
      }

      const order =
        typeof data.order === 'number'
          ? data.order
          : await prisma.serviceSubcategory.count({ where: { categoryId: category.id } })

      const subcategory = await prisma.serviceSubcategory.create({
        data: {
          categoryId: category.id,
          name: data.name,
          order,
          isActive: data.isActive ?? true,
          isDefault: false
        }
      })

      res.status(201).json({
        success: true,
        data: subcategory,
        message: 'Subcategory created successfully'
      })
    } catch (error) {
      console.error('Error creating subcategory:', error)

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
        error: 'Failed to create subcategory'
      })
    }
  })
)

subcategoryRouter.put(
  '/:id',
  wrapTenantRoute(async (req, res) => {
    try {
      const updateData = SubcategoryUpdateSchema.parse(req.body)
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context

      const subcategory = await prisma.serviceSubcategory.findFirst({
        where: {
          id: req.params.id,
          category: {
            tenantId
          }
        },
        include: {
          category: true
        }
      })

      if (!subcategory) {
        res.status(404).json({
          success: false,
          error: 'Subcategory not found'
        })
        return
      }

      if (updateData.name && updateData.name !== subcategory.name) {
        const duplicate = await prisma.serviceSubcategory.findFirst({
          where: {
            categoryId: subcategory.categoryId,
            name: updateData.name,
            id: { not: req.params.id }
          }
        })

        if (duplicate) {
          res.status(400).json({
            success: false,
            error: 'Subcategory with this name already exists in the category'
          })
          return
        }
      }

      const updated = await prisma.serviceSubcategory.update({
        where: {
          id: req.params.id
        },
        data: {
          name: updateData.name ?? undefined,
          order: typeof updateData.order === 'number' ? updateData.order : undefined,
          isActive: typeof updateData.isActive !== 'undefined' ? updateData.isActive : undefined
        }
      })

      res.json({
        success: true,
        data: updated,
        message: 'Subcategory updated successfully'
      })
    } catch (error) {
      console.error('Error updating subcategory:', error)

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
        error: 'Failed to update subcategory'
      })
    }
  })
)

subcategoryRouter.delete(
  '/:id',
  wrapTenantRoute(async (req, res) => {
    try {
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context

      const subcategory = await prisma.serviceSubcategory.findFirst({
        where: {
          id: req.params.id,
          category: {
            tenantId
          }
        }
      })

      if (!subcategory) {
        res.status(404).json({
          success: false,
          error: 'Subcategory not found'
        })
        return
      }

      if (subcategory.isDefault) {
        res.status(400).json({
          success: false,
          error: 'Default subcategories cannot be deleted'
        })
        return
      }

      await prisma.service.updateMany({
        where: {
          tenantId,
          subcategoryId: subcategory.id
        },
        data: {
          subcategoryId: null
        }
      })

      await prisma.serviceSubcategory.delete({
        where: { id: subcategory.id }
      })

      res.json({
        success: true,
        message: 'Subcategory deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting subcategory:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete subcategory'
      })
    }
  })
)

subcategoryRouter.post(
  '/reorder',
  wrapTenantRoute(async (req, res) => {
    try {
      const reorderPayload = ReorderSchema.parse(req.body)
      const context = resolveTenantContext(req, res)
      if (!context) {
        return
      }

      const { tenantId, prisma } = context

      for (const item of reorderPayload) {
        const subcategory = await prisma.serviceSubcategory.findFirst({
          where: {
            id: item.id,
            category: {
              tenantId
            }
          },
          select: { id: true }
        })

        if (!subcategory) {
          res.status(404).json({
            success: false,
            error: `Subcategory ${item.id} not found`
          })
          return
        }

        await prisma.serviceSubcategory.update({
          where: { id: subcategory.id },
          data: { order: item.order }
        })
      }

      res.json({
        success: true,
        message: 'Subcategories reordered successfully'
      })
    } catch (error) {
      console.error('Error reordering subcategories:', error)

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
        error: 'Failed to reorder subcategories'
      })
    }
  })
)

/**
 * POST /initialize-default-categories
 *
 * Инициализирует дефолтные категории и услуги для существующего салона
 * (для салонов, которые были созданы до внедрения системы категорий).
 *
 * Body (optional):
 * - salonType: SalonType (default: CUSTOM)
 * - selectedCategories?: string[] (список категорий для включения)
 */
categoryRouter.post('/initialize-default-categories', async (req: Request, res) => {
  const { tenantId } = req.query as { tenantId: string };
  const { salonType = 'CUSTOM' } = req.body;

  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: 'tenantId is required'
    });
  }

  try {
    // 1. Проверим что категории еще не созданы
    const existingCategories = await tenantPrisma(tenantId).serviceCategory.findMany();

    if (existingCategories.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Categories already exist for this salon',
        details: {
          categoriesCount: existingCategories.length,
          message: 'Run this endpoint only once per salon'
        }
      });
    }

    // 2. Запустим сиды для категорий и услуг
    console.log(`[SEED] Initializing categories for tenant ${tenantId} with type ${salonType}`);

    await prisma.$transaction(async (tx) => {
      await seedDefaultCategories(tx, tenantId, salonType as SalonType);
      await seedDefaultServices(tx, tenantId, salonType as SalonType, {});
    });

    // 3. Вернем созданные категории
    const categories = await tenantPrisma(tenantId).serviceCategory.findMany({
      include: {
        subcategories: true,
        _count: {
          select: { services: true }
        }
      },
      orderBy: { displayOrder: 'asc' }
    });

    const services = await tenantPrisma(tenantId).service.findMany({
      select: {
        id: true,
        name: true,
        categoryId: true,
        isDefault: true,
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      message: `Initialized ${categories.length} categories with ${services.length} services`,
      data: {
        categories,
        services,
        salonType
      }
    });
  } catch (error) {
    console.error('[SEED ERROR]', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  return undefined;
});

export { categoryRouter as serviceCategoriesRouter, subcategoryRouter as serviceSubcategoriesRouter };
