import { Router } from 'express';
import { tenantPrisma } from '@beauty-platform/database';
import { EntityStatus, UserRole } from '@prisma/client';

const router = Router();

// Роли, которые тарифицируются в подписке (без владельца)
const BILLABLE_ROLES: UserRole[] = [
  UserRole.MANAGER,
  UserRole.STAFF_MEMBER,
  UserRole.RECEPTIONIST,
  UserRole.ACCOUNTANT
];

// GET /internal/tenants/:tenantId/billable-staff-count
// Сервисный эндпоинт для расчета числа платных сотрудников
router.get('/tenants/:tenantId/billable-staff-count', async (req, res) => {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'TENANT_ID_REQUIRED',
        message: 'tenantId is required'
      });
    }

    const prisma = tenantPrisma(tenantId);
    const billableStaffCount = await prisma.user.count({
      where: {
        tenantId,
        status: EntityStatus.ACTIVE,
        role: {
          in: BILLABLE_ROLES
        }
      }
    });

    return res.json({
      success: true,
      tenantId,
      billableStaffCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Internal billable staff count error:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to count billable staff'
    });
  }
});

export default router;
