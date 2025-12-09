// Shared authentication middleware for Beauty Platform
// Combines patterns from auth-service and crm-api with improvements

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { JWTPayload, TenantInfo, AuthError, MiddlewareConfig } from './types';

class AuthMiddleware {
  private jwtSecret: string;
  private logPath?: string;
  private serviceName: string;
  private enableLogging: boolean;

  constructor(config: MiddlewareConfig = {}) {
    this.jwtSecret = config.jwtSecret || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-beauty-platform-2025';
    this.logPath = config.logPath;
    this.serviceName = config.serviceName || 'unknown-service';
    this.enableLogging = config.enableLogging ?? true;
  }

  private writeLog(data: Record<string, unknown>): void {
    if (!this.enableLogging || !this.logPath) return;

    try {
      const logLine = JSON.stringify({
        timestamp: new Date().toISOString(),
        service: this.serviceName,
        ...data
      });

      // Ensure directory exists
      const logDir = path.dirname(this.logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      fs.appendFileSync(this.logPath, `${logLine}\n`);
    } catch (error) {
      console.error(`[${this.serviceName}] Failed to write auth log:`, error);
    }
  }

  private extractToken(req: Request): string | null {
    // Priority 1: httpOnly cookies (most secure)
    if (req.cookies?.beauty_access_token) {
      return req.cookies.beauty_access_token;
    }

    // Priority 2: Client portal specific cookie
    if (req.cookies?.beauty_client_access_token) {
      return req.cookies.beauty_client_access_token;
    }

    // Priority 3: Legacy cookie name (backward compatibility)
    if (req.cookies?.beauty_token) {
      return req.cookies.beauty_token;
    }

    // Priority 4: Authorization header (for API clients)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  private verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);

      if (typeof decoded === 'string') {
        throw new Error('Invalid token payload format');
      }

      const payload = decoded as jwt.JwtPayload & Partial<JWTPayload>;

      // Validate required fields
      if (!payload.userId || !payload.role || !payload.email) {
        throw new Error('Token missing required fields');
      }

      return {
        userId: payload.userId,
        tenantId: payload.tenantId,
        role: payload.role,
        email: payload.email,
        type: payload.type || 'access',
        mfaVerified: payload.mfaVerified
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  private createAuthError(code: string, message: string, details?: Record<string, unknown>): AuthError {
    return {
      success: false,
      error: message,
      code,
      details
    };
  }

  /**
   * Standard authentication middleware
   * Requires valid JWT token
   */
  authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const token = this.extractToken(req);

      if (!token) {
        const error = this.createAuthError('MISSING_TOKEN', 'Authentication required');
        this.writeLog({ error: 'No token provided', path: req.path, method: req.method });
        res.status(401).json(error);
        return;
      }

      const payload = this.verifyToken(token);
      req.user = payload;

      // Set tenant info if available
      if (payload.tenantId) {
        req.tenant = {
          id: payload.tenantId,
          slug: '' // Can be populated from database if needed
        };
      }

      // Log successful authentication
      this.writeLog({
        userId: payload.userId,
        tenantId: payload.tenantId,
        role: payload.role,
        email: payload.email,
        path: req.path,
        method: req.method,
        source: req.cookies?.beauty_access_token ? 'cookie' : 'header'
      });

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      const authError = this.createAuthError('AUTH_FAILED', errorMessage);

      this.writeLog({
        error: errorMessage,
        path: req.path,
        method: req.method
      });

      if (errorMessage === 'Token expired') {
        res.status(401).json({ ...authError, code: 'TOKEN_EXPIRED' });
      } else if (errorMessage === 'Invalid token') {
        res.status(401).json({ ...authError, code: 'INVALID_TOKEN' });
      } else {
        res.status(401).json(authError);
      }
    }
  };

  /**
   * Optional authentication middleware
   * Sets user if token is provided, continues without error if not
   */
  optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    const token = this.extractToken(req);

    if (!token) {
      next();
      return;
    }

    try {
      const payload = this.verifyToken(token);
      req.user = payload;

      if (payload.tenantId) {
        req.tenant = {
          id: payload.tenantId,
          slug: ''
        };
      }

      this.writeLog({
        userId: payload.userId,
        tenantId: payload.tenantId,
        role: payload.role,
        email: payload.email,
        path: req.path,
        method: req.method,
        source: 'optional'
      });
    } catch (error) {
      // Ignore errors in optional auth
      this.writeLog({
        warning: 'Optional auth failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method
      });
    }

    next();
  };

  /**
   * Tenant isolation middleware
   * Ensures user has tenant access (except SUPER_ADMIN)
   */
  requireTenant = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(this.createAuthError('AUTH_REQUIRED', 'Authentication required'));
      return;
    }

    // SUPER_ADMIN can access all tenants
    if (req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    // All other roles must have a tenant
    if (!req.user.tenantId) {
      const error = this.createAuthError('TENANT_REQUIRED', 'Tenant access required');
      this.writeLog({
        error: 'User missing tenantId',
        userId: req.user.userId,
        role: req.user.role,
        path: req.path,
        method: req.method
      });
      res.status(403).json(error);
      return;
    }

    next();
  };

  /**
   * Validate tenant access for specific tenant operations
   * Checks if user belongs to the tenant specified in request
   */
  validateTenantAccess = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(this.createAuthError('AUTH_REQUIRED', 'Authentication required'));
      return;
    }

    // SUPER_ADMIN can access all tenants
    if (req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    // Get tenant ID from request (params, body, or query)
    const requestTenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;

    if (requestTenantId && req.user.tenantId !== requestTenantId) {
      const error = this.createAuthError('TENANT_ACCESS_DENIED', 'Tenant access denied', {
        userTenant: req.user.tenantId,
        requestedTenant: requestTenantId
      });

      this.writeLog({
        error: 'Tenant access denied',
        userId: req.user.userId,
        userTenant: req.user.tenantId,
        requestedTenant: requestTenantId,
        path: req.path,
        method: req.method
      });

      res.status(403).json(error);
      return;
    }

    next();
  };
}

export { AuthMiddleware };
export * from './types';