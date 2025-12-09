// Shared types for Beauty Platform middleware
import { Request } from 'express';

export interface JWTPayload {
  userId: string;
  tenantId?: string;
  role: string;
  email: string;
  type?: 'access' | 'refresh';
  mfaVerified?: boolean;
}

export interface TenantInfo {
  id: string;
  slug?: string;
}

// Extend Express.Request with JWT payload and tenant metadata
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      tenant?: TenantInfo;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
  tenant?: TenantInfo;
}

export interface MiddlewareConfig {
  jwtSecret?: string;
  logPath?: string;
  serviceName?: string;
  enableLogging?: boolean;
}

export interface AuthError {
  success: false;
  error: string;
  code: string;
  message?: string;
  details?: Record<string, unknown>;
}
