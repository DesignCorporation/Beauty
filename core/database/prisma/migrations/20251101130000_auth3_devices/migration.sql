-- AUTH-3: Device tracking & refresh token rotation migration

-- 1. Create roles table
CREATE TABLE "roles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_name_key" ON "roles" ("name");

-- 2. Create permissions table
CREATE TABLE "permissions" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "permissions_name_key" ON "permissions" ("name");

-- 3. Join table for roles ↔ permissions
CREATE TABLE "_PermissionToRole" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "_PermissionToRole_AB_unique" ON "_PermissionToRole" ("A", "B");
CREATE INDEX "_PermissionToRole_B_index" ON "_PermissionToRole" ("B");

ALTER TABLE "_PermissionToRole"
  ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_PermissionToRole"
  ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Create devices table
CREATE TABLE "devices" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "user_agent" TEXT,
  "ip_address" TEXT,
  "device_name" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "devices_user_id_device_id_key" ON "devices" ("user_id", "device_id");

ALTER TABLE "devices"
  ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Extend refresh tokens table
ALTER TABLE "refresh_tokens"
  ADD COLUMN "device_id" TEXT,
  ADD COLUMN "is_used" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "used_at" TIMESTAMP(3);

-- 6. Seed legacy devices for existing refresh tokens
INSERT INTO "devices" ("id", "user_id", "device_id", "device_name", "is_active", "last_used_at", "created_at")
SELECT DISTINCT ON (rt."user_id")
  'dev_' || substr(md5(rt."user_id" || ':' || rt."id"), 1, 24),
  rt."user_id",
  'legacy-' || rt."user_id",
  'Legacy Device',
  TRUE,
  COALESCE(rt."created_at", CURRENT_TIMESTAMP),
  COALESCE(rt."created_at", CURRENT_TIMESTAMP)
FROM "refresh_tokens" rt
WHERE NOT EXISTS (
  SELECT 1 FROM "devices" d WHERE d."user_id" = rt."user_id" AND d."device_id" = 'legacy-' || rt."user_id"
)
ORDER BY rt."user_id", rt."created_at" DESC;

UPDATE "refresh_tokens" rt
SET "device_id" = d."id"
FROM "devices" d
WHERE d."user_id" = rt."user_id"
  AND d."device_id" = 'legacy-' || rt."user_id";

-- 7. Add constraints & indexes after backfill
ALTER TABLE "refresh_tokens"
  ALTER COLUMN "device_id" SET NOT NULL;

ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" ("user_id");
CREATE INDEX "refresh_tokens_device_id_idx" ON "refresh_tokens" ("device_id");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens" ("expires_at");
