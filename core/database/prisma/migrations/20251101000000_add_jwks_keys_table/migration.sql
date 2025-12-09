-- CreateTable RSAKey (JWKS Storage for OIDC)
-- Stores RSA public keys for OIDC discovery and token validation
-- Each tenant can have multiple keys (for rotation)

CREATE TABLE IF NOT EXISTS "rsa_key" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kid" TEXT NOT NULL UNIQUE,
  "algorithm" TEXT NOT NULL DEFAULT 'RS256',
  "publicKey" TEXT NOT NULL,
  "privateKey" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "use" TEXT NOT NULL DEFAULT 'sig',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rotatedAt" TIMESTAMP,
  "expiresAt" TIMESTAMP,
  "issuedBy" TEXT,
  "metadata" TEXT
);

-- Create index for kid lookup (JWKS endpoint)
CREATE UNIQUE INDEX "rsa_key_kid_idx" ON "rsa_key"("kid");

-- Create index for active keys lookup
CREATE INDEX "rsa_key_status_idx" ON "rsa_key"("status");

-- Create index for rotation tracking
CREATE INDEX "rsa_key_createdAt_idx" ON "rsa_key"("createdAt" DESC);

-- Table for JWKS endpoint caching (optional, for performance)
-- Some implementations cache the JWKS response
CREATE TABLE IF NOT EXISTS "jwks_cache" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "keys" TEXT NOT NULL,
  "generatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1
);

-- Create index for cache expiration
CREATE INDEX "jwks_cache_expiresAt_idx" ON "jwks_cache"("expiresAt");
