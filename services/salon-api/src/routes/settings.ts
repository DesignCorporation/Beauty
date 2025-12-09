import express, { type NextFunction, type Request, type Response, type Router } from 'express'
import { z } from 'zod'
import { tenantPrisma, Prisma, Currency, SalonType } from '@beauty-platform/database'
import { assertAuth } from '@beauty/shared'
import type { TenantRequest } from '../middleware/tenant'

const router: Router = express.Router()

const normalizeVatNumber = (input?: string | null): string | null => {
  if (!input) return null
  const normalized = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return normalized.length ? normalized : null
}

const isValidVatNumber = (value?: string | null): boolean => {
  const normalized = normalizeVatNumber(value)
  if (!normalized) return false
  return /^\d{10}$/.test(normalized) || /^[A-Z]{2}[0-9A-Z]{2,12}$/.test(normalized)
}

const AUTH_REQUIRED_ERROR = 'Authentication required'

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

// Zod validation schema для обновления настроек
const UpdateSettingsSchema = z.object({
  name: z.string().min(3, 'Название должно содержать минимум 3 символа').max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  logoUrl: z.string().optional().nullable(), // Может быть относительный путь или полный URL
  email: z.string().email('Некорректный email').optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().url('Некорректный URL сайта').optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  currency: z.enum(['EUR', 'USD', 'PLN', 'GBP']).optional(),
  language: z.enum(['RU', 'PL', 'EN', 'UA']).optional(),
  timezone: z.string().optional(),
  salonType: z.enum(['HAIR', 'BEAUTY', 'NAILS', 'SPA', 'MIXED']).optional(),
  billingCompanyName: z.string().min(2).max(150).optional().nullable(),
  billingVatId: z
    .string()
    .optional()
    .nullable()
    .refine(value => !value || isValidVatNumber(value), 'Некорректный формат NIP/VAT'),
  billingUseSalonAddress: z.boolean().optional(),
  billingAddress: z.string().optional().nullable(),
  billingCity: z.string().optional().nullable(),
  billingPostalCode: z.string().optional().nullable(),
  billingCountry: z.string().optional().nullable()
});

/**
 * GET /api/settings
 * Получить настройки салона
 * Требует аутентификации (JWT в httpOnly cookies)
 */
router.get(
  '/',
  wrapTenantRoute(async (req, res) => {
    try {
      const context = requireTenantContext(req, res)
      if (!context) {
        return
      }
      const { tenantId } = context

      const tenant = await tenantPrisma(tenantId).tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          salonNumber: true,
          email: true,
          phone: true,
          website: true,
          address: true,
          city: true,
          country: true,
          postalCode: true,
          currency: true,
          language: true,
          timezone: true,
          salonType: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          billingCompanyName: true,
          billingVatId: true,
          billingUseSalonAddress: true,
          billingAddress: true,
          billingCity: true,
          billingPostalCode: true,
          billingCountry: true
        }
      })

      if (!tenant) {
        res.status(404).json({
          success: false,
          error: 'Salon not found'
        })
        return
      }

      res.json({
        success: true,
        settings: tenant
      })
    } catch (error) {
      console.error('Error fetching salon settings:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch salon settings'
      })
    }
  })
)

/**
 * PATCH /api/settings
 * Обновить настройки салона
 * Требует аутентификации + роль SALON_OWNER или MANAGER
 */
router.patch('/', async (req: Request, res) => {
  try {
    const auth = assertAuth(req);
    const tenantId = req.tenantId ?? auth.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Tenant ID not found. Please login again.'
      });
    }
    const ensuredTenantId = tenantId as string;

    // Проверка прав доступа (только владелец или менеджер могут изменять настройки)
    const userRole = auth.role;
    if (userRole && !['SALON_OWNER', 'MANAGER', 'SUPER_ADMIN'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions. Only salon owners and managers can update settings.'
      });
    }

    // Валидация входных данных
    let validated;
    try {
      validated = UpdateSettingsSchema.parse(req.body);
    } catch (validationError: any) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationError.errors
      });
    }

    // Если нечего обновлять
    if (Object.keys(validated).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    const updateData: Prisma.TenantUpdateInput = {};
    const normalizedVatId =
      validated.billingVatId !== undefined ? normalizeVatNumber(validated.billingVatId) : undefined;
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.logoUrl !== undefined) updateData.logoUrl = validated.logoUrl;
    if (validated.email !== undefined) updateData.email = validated.email;
    if (validated.phone !== undefined) updateData.phone = validated.phone;
    if (validated.website !== undefined) updateData.website = validated.website;
    if (validated.address !== undefined) updateData.address = validated.address;
    if (validated.city !== undefined) updateData.city = validated.city;
    if (validated.country !== undefined) updateData.country = validated.country;
    if (validated.postalCode !== undefined) updateData.postalCode = validated.postalCode;
    if (validated.currency !== undefined) {
      updateData.currency = { set: validated.currency as Currency };
    }
    if (validated.language !== undefined) updateData.language = validated.language;
    if (validated.timezone !== undefined) updateData.timezone = validated.timezone;
    if (validated.salonType !== undefined) {
      updateData.salonType = { set: validated.salonType as SalonType };
    }
    if (validated.billingCompanyName !== undefined) {
      updateData.billingCompanyName = validated.billingCompanyName;
    }
    if (validated.billingVatId !== undefined) {
      updateData.billingVatId = normalizedVatId ?? null;
    }
    if (validated.billingUseSalonAddress !== undefined) {
      updateData.billingUseSalonAddress = validated.billingUseSalonAddress;
    }
    if (validated.billingAddress !== undefined) {
      updateData.billingAddress = validated.billingAddress;
    }
    if (validated.billingCity !== undefined) {
      updateData.billingCity = validated.billingCity;
    }
    if (validated.billingPostalCode !== undefined) {
      updateData.billingPostalCode = validated.billingPostalCode;
    }
    if (validated.billingCountry !== undefined) {
      updateData.billingCountry = validated.billingCountry;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    const updated = await tenantPrisma(ensuredTenantId).tenant.update({
      where: { id: ensuredTenantId },
      data: updateData,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        logoUrl: true,
        email: true,
        phone: true,
        website: true,
        address: true,
        city: true,
        country: true,
        postalCode: true,
        currency: true,
        language: true,
        timezone: true,
        salonType: true,
        updatedAt: true,
        billingCompanyName: true,
        billingVatId: true,
        billingUseSalonAddress: true,
        billingAddress: true,
        billingCity: true,
        billingPostalCode: true,
        billingCountry: true
      }
    });

    console.log(`✅ Salon settings updated for tenant ${ensuredTenantId.slice(0, 8)}... by user ${auth.email || 'unknown'}`);

    res.json({
      success: true,
      message: 'Salon settings updated successfully',
      settings: updated
    });
  } catch (error: any) {
    console.error('Error updating salon settings:', error);

    // Prisma ошибки
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Salon not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update salon settings',
      details: error.message
    });
  }
  return undefined;
});

export default router;
