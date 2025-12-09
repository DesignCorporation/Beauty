import { Response, NextFunction } from 'express'
import { assertAuth } from '@beauty/shared'
import type { CRMAuthenticatedRequest } from './auth'

export type TenantRequest = CRMAuthenticatedRequest & {
  tenantId?: string | null
}

export const validateTenant = (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    // ✅ ИСПРАВЛЕНО: Поддержка двух источников tenantId:
    // 1. Для Salon/Admin: из JWT token (req.user.tenantId)
    // 2. Для Client Portal: из x-tenant-id header или query param

    // Ensure user is authenticated (should be set by auth middleware)
    const auth = assertAuth(req)

    const jwtTenantId = auth.tenantId;
    const headerTenantId = (req.headers['x-tenant-id'] as string)?.trim();
    const queryTenantId = (req.query.tenantId as string)?.trim();

    const resolvedTenantId = jwtTenantId || headerTenantId || queryTenantId;

    // ✅ Для CLIENT role tenantId опциональный (клиенты глобальные)
    const isGlobalRole = auth.role === 'SUPER_ADMIN';

    if (!resolvedTenantId && auth.role !== 'CLIENT' && !isGlobalRole) {
      return res.status(403).json({
        success: false,
        error: 'Tenant access denied',
        code: 'TENANT_REQUIRED',
        message: 'No tenant ID found in token or headers (required for salon staff)'
      });
    }

    // Логируем источник tenantId для отладки (если есть)
    if (resolvedTenantId) {
      const tenantSource = jwtTenantId ? 'JWT' : (headerTenantId ? 'header' : 'query');
      console.log(`[TENANT ACCESS] User ${auth.email} accessing tenant ${resolvedTenantId} (from ${tenantSource}) - ${req.method} ${req.path}`);
    } else {
      console.log(`[CLIENT ACCESS] User ${auth.email} (role: ${auth.role}) - ${req.method} ${req.path}`);
    }

    // Добавляем tenantId в request для удобства
    req.tenantId = resolvedTenantId ?? null;

    next();
  } catch (error) {
    console.error('Tenant validation error:', error);

    return res.status(403).json({
      success: false,
      error: 'Tenant validation failed'
    });
  }
  return undefined;
};
