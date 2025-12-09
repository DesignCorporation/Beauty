-- CreateEnum: TenantRole для новой multi-role системы
CREATE TYPE "TenantRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF', 'RECEPTIONIST', 'ACCOUNTANT');

-- ============================================================
-- STEP 1: Создать новые таблицы для multi-tenant роли
-- ============================================================

-- TenantOwner: Many-to-Many связь User ↔ Tenant для владения салонами
CREATE TABLE "tenant_owners" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "share" INTEGER DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_owners_pkey" PRIMARY KEY ("id")
);

-- UserTenantRole: Роли пользователя в разных tenant
CREATE TABLE "user_tenant_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "user_tenant_roles_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- STEP 2: Добавить userId к ClientProfile (связь с User account)
-- ============================================================

ALTER TABLE "client_profiles" ADD COLUMN "user_id" TEXT;

-- ============================================================
-- STEP 3: Создать индексы для производительности
-- ============================================================

-- TenantOwner indexes
CREATE UNIQUE INDEX "tenant_owners_tenantId_userId_key" ON "tenant_owners"("tenantId", "userId");
CREATE INDEX "tenant_owners_userId_idx" ON "tenant_owners"("userId");
CREATE INDEX "tenant_owners_tenantId_idx" ON "tenant_owners"("tenantId");

-- UserTenantRole indexes
CREATE UNIQUE INDEX "user_tenant_roles_userId_tenantId_role_key" ON "user_tenant_roles"("userId", "tenantId", "role");
CREATE INDEX "user_tenant_roles_userId_idx" ON "user_tenant_roles"("userId");
CREATE INDEX "user_tenant_roles_tenantId_idx" ON "user_tenant_roles"("tenantId");
CREATE INDEX "user_tenant_roles_userId_isActive_idx" ON "user_tenant_roles"("userId", "isActive");

-- ClientProfile userId index
CREATE UNIQUE INDEX "client_profiles_user_id_key" ON "client_profiles"("user_id");

-- ============================================================
-- STEP 4: Добавить Foreign Keys
-- ============================================================

-- TenantOwner foreign keys
ALTER TABLE "tenant_owners" ADD CONSTRAINT "tenant_owners_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_owners" ADD CONSTRAINT "tenant_owners_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserTenantRole foreign keys
ALTER TABLE "user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_tenant_roles" ADD CONSTRAINT "user_tenant_roles_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ClientProfile userId foreign key
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- STEP 5: Мигрировать существующие данные (КРИТИЧНО!)
-- ============================================================

-- Для каждого tenant с tenantId в User - создать TenantOwner + UserTenantRole
-- ТОЛЬКО для users с role = SALON_OWNER
INSERT INTO "tenant_owners" ("id", "tenantId", "userId", "isPrimary", "share", "createdAt", "updatedAt")
SELECT
    'to_' || gen_random_uuid(),
    "tenantId",
    "id" as "userId",
    true as "isPrimary",
    100 as "share",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users"
WHERE "tenantId" IS NOT NULL
  AND "role" = 'SALON_OWNER';

-- Выдать роль OWNER для всех существующих владельцев
INSERT INTO "user_tenant_roles" ("id", "userId", "tenantId", "role", "isActive", "grantedAt", "grantedBy")
SELECT
    'utr_' || gen_random_uuid(),
    "id" as "userId",
    "tenantId",
    'OWNER'::"TenantRole" as "role",
    true as "isActive",
    CURRENT_TIMESTAMP,
    NULL
FROM "users"
WHERE "tenantId" IS NOT NULL
  AND "role" = 'SALON_OWNER';

-- ============================================================
-- STEP 6: Комментарии и финализация
-- ============================================================

COMMENT ON TABLE "tenant_owners" IS 'Multi-tenant ownership: один user может владеть несколькими салонами';
COMMENT ON TABLE "user_tenant_roles" IS 'Tenant-specific роли: user может иметь разные роли в разных салонах';
COMMENT ON COLUMN "client_profiles"."user_id" IS 'Связь ClientProfile с User account (для multi-role архитектуры)';

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Следующие шаги (НЕ АВТОМАТИЧЕСКИ):
-- 1. Проверить что данные мигрировали корректно
-- 2. Обновить auth-service для использования TenantOwner + UserTenantRole
-- 3. Deprecated: tenantId в User (оставляем для обратной совместимости)
-- 4. В будущем: убрать tenantId из User после полного перехода на новую систему
