-- Salon Invite Codes table for QR/link invitations
CREATE TABLE "salon_invite_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_by" TEXT,
    "max_uses" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "salon_invite_codes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "salon_invite_codes_code_key" ON "salon_invite_codes"("code");
CREATE INDEX "salon_invite_codes_tenant_id_idx" ON "salon_invite_codes"("tenant_id");
