export interface JWTPayload {
  userId?: string;
  tenantId?: string | null;
  role: string;
  email: string;
  permissions?: string[];
  tenants?: Array<{
    tenantId: string;
    tenantName: string;
    slug: string;
    role: string;
  }>;
  tenantRole?: string;
  isClient?: boolean;
  phoneVerified?: boolean;
  firstName?: string;
  lastName?: string;
  deviceId?: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface RequestContext {
  user: JWTPayload;
  tenantId: string | null;
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
    }
  }
}
