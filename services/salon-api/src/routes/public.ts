import express, { type Router } from 'express';
import { tenantPrisma, Prisma } from '@beauty-platform/database';

const router: Router = express.Router();

const categorySelect = Prisma.validator<Prisma.ServiceCategorySelect>()({
  id: true,
  name: true,
  icon: true,
  order: true,
  subcategories: {
    where: { isActive: true },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      name: true,
      order: true
    }
  },
  services: {
    where: {
      isActive: true,
      status: 'ACTIVE'
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      duration: true,
      price: true,
      description: true,
      subcategoryId: true
    }
  }
});

type PublicCategory = Prisma.ServiceCategoryGetPayload<{
  select: typeof categorySelect;
}>;

router.get('/salons/:tenantId/service-categories', async (req, res) => {
  try {
    const { tenantId } = req.params;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required'
      });
    }

    const prisma = tenantPrisma(tenantId);

    const categories = (await prisma.serviceCategory.findMany({
      where: {
        isActive: true
      },
      orderBy: { order: 'asc' },
      select: categorySelect
    })) as unknown as PublicCategory[];

    const payload = categories.map((category) => {
      const subcategories = category.subcategories.map((subcategory) => ({
        id: subcategory.id,
        name: subcategory.name,
        order: subcategory.order,
        services: category.services
          .filter((service) => service.subcategoryId === subcategory.id)
          .map((service) => ({
            id: service.id,
            name: service.name,
            duration: service.duration,
            price: Number(service.price),
            description: service.description ?? null
          }))
      }));

      const servicesWithoutSubcategory = category.services
        .filter((service) => service.subcategoryId == null)
        .map((service) => ({
          id: service.id,
          name: service.name,
          duration: service.duration,
          price: Number(service.price),
          description: service.description ?? null
        }));

      return {
        id: category.id,
        name: category.name,
        icon: category.icon,
        order: category.order,
        subcategories,
        services: servicesWithoutSubcategory
      };
    });

    res.json({
      success: true,
      data: payload
    });
  } catch (error) {
    console.error('Error fetching public service categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service categories'
    });
  }
  return undefined;
});

export default router;
