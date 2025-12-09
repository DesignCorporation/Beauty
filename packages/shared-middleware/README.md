# @beauty-platform/shared-middleware

Shared authentication and authorization middleware for Beauty Platform microservices.

## Features

- 🔐 **JWT Authentication** - Supports both httpOnly cookies and Authorization headers
- 🏢 **Tenant Isolation** - Automatic tenant validation and access control
- 📝 **Centralized Logging** - Consistent auth logging across all services
- 🔄 **Flexible Configuration** - Easy setup for different service requirements
- 🛡️ **Security First** - Built with security best practices

## Installation

```bash
cd /root/beauty-platform/packages/shared-middleware
npm install
npm run build
```

## Quick Start

```typescript
import express from 'express';
import cookieParser from 'cookie-parser';
import { setupAuth } from '@beauty-platform/shared-middleware';

const app = express();
app.use(cookieParser());

// Setup authentication for your service
const auth = setupAuth('notification-service');

// Use middleware
app.get('/protected', auth.authenticate, (req, res) => {
  // req.user and req.tenant are now available
  res.json({ user: req.user, tenant: req.tenant });
});

// Tenant-isolated endpoint
app.get('/data', auth.requireTenantAuth, (req, res) => {
  // Automatically enforces tenant isolation
  res.json({ message: 'Tenant-specific data' });
});
```

## Available Middleware

### Basic Authentication
- `authenticate` - Requires valid JWT token
- `optionalAuth` - Sets user if token provided, continues if not

### Tenant Isolation
- `requireTenant` - Ensures user has tenant access
- `validateTenantAccess` - Validates tenant ID in request matches user's tenant

### Combined Middleware
- `requireTenantAuth` - Authentication + tenant requirement
- `strictTenantAuth` - Authentication + tenant requirement + validation

## Configuration

```typescript
import { AuthMiddleware } from '@beauty-platform/shared-middleware';

const auth = new AuthMiddleware({
  serviceName: 'my-service',
  logPath: '/path/to/auth.log',
  enableLogging: true,
  jwtSecret: process.env.JWT_SECRET
});
```

## Token Sources (Priority Order)

1. `beauty_access_token` cookie (httpOnly)
2. `beauty_client_access_token` cookie (client portal)
3. `beauty_token` cookie (legacy compatibility)
4. `Authorization: Bearer <token>` header

## Error Response Format

```json
{
  "success": false,
  "error": "Authentication required",
  "code": "MISSING_TOKEN",
  "details": {}
}
```

## Error Codes

- `MISSING_TOKEN` - No authentication token provided
- `INVALID_TOKEN` - Token format or signature invalid
- `TOKEN_EXPIRED` - Token has expired
- `TENANT_REQUIRED` - User missing tenant access
- `TENANT_ACCESS_DENIED` - User cannot access requested tenant

## Usage in Services

### Notification Service Example
```typescript
import { setupAuth } from '@beauty-platform/shared-middleware';

const auth = setupAuth('notification-service');

// Send notification (requires tenant isolation)
app.post('/send', auth.strictTenantAuth, async (req, res) => {
  const { tenantId } = req.user;
  // Send notification logic with tenant isolation
});
```

### Payment Service Example
```typescript
import { setupAuth } from '@beauty-platform/shared-middleware';

const auth = setupAuth('payment-service');

// Create payment (strict tenant validation)
app.post('/payments', auth.strictTenantAuth, async (req, res) => {
  const { tenantId, userId } = req.user;
  // Payment logic with tenant isolation
});

// Webhook (no auth required)
app.post('/webhooks/stripe', (req, res) => {
  // Webhook processing without authentication
});
```

## Security Features

- **httpOnly Cookies** - Primary authentication method for web clients
- **Tenant Isolation** - Prevents cross-tenant data access
- **Request Logging** - All auth attempts logged for security monitoring
- **Multiple Token Sources** - Flexible authentication for different clients
- **Error Standardization** - Consistent error responses across services

## Development

```bash
# Build the package
npm run build

# Watch for changes
npm run dev

# Clean build directory
npm run clean
```

## Integration with Existing Services

This middleware is designed to replace existing auth middleware in:
- `notification-service` (new)
- `payment-service` (new)
- Future microservices

It follows the same patterns as existing auth implementations but provides better reusability and consistency.