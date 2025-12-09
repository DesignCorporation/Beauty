import type { Request } from 'express'
import { assertAuth, type AuthenticatedRequest } from '@beauty/shared'
import type { JWTPayload } from '../types/auth'

export function getAuthContext(req: Request): JWTPayload {
  return assertAuth(req as AuthenticatedRequest<JWTPayload>)
}
