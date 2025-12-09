/**
 * @deprecated This is legacy code. Use @beauty-platform/shared-middleware instead.
 * @see /root/projects/beauty/packages/shared-middleware/
 *
 * Original JWT middleware for core domain. Commented out as it's no longer used
 * in favor of the unified shared middleware package.
 */

// NOTE: Legacy JWT middleware - use shared-middleware package instead
// import { Request, Response, NextFunction } from 'express'
// import jwt from 'jsonwebtoken'
//
// export interface AuthenticatedRequest extends Request {
//   user?: {
//     userId: string
//     tenantId: string
//     role: string
//     permissions: string[]
//   }
// }
//
// // ... rest of middleware code commented out
// // Use @beauty-platform/shared-middleware for JWT validation