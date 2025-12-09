-- Issue #79: Support Multiple Services per Appointment

-- Step 1: Add new columns to appointments table
ALTER TABLE "appointments" ADD COLUMN "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "appointments" ADD COLUMN "endAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "appointments" ADD COLUMN "totalDuration" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "appointments" ADD COLUMN "totalPrice" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "appointments" ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'PLN';

-- Step 2: Update startAt and endAt from existing startTime and endTime
UPDATE "appointments" SET "startAt" = "startTime", "endAt" = "endTime" WHERE "startTime" IS NOT NULL;

-- Step 3: Create appointment_services M:N table
CREATE TABLE "appointment_services" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "appointmentId" TEXT NOT NULL,
  "serviceId" TEXT,
  "name" VARCHAR(255) NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "duration" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'PLN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "appointment_services_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE,
  CONSTRAINT "appointment_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL,
  CONSTRAINT "appointment_services_appointmentId_serviceId_key" UNIQUE("appointmentId", "serviceId")
);

-- Step 4: Migrate existing serviceId to appointment_services table
INSERT INTO "appointment_services" ("id", "appointmentId", "serviceId", "name", "price", "duration", "currency", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  a."id",
  a."serviceId",
  COALESCE(s."name", 'Unknown Service'),
  COALESCE(s."price", 0),
  COALESCE(s."duration", 0),
  'PLN',
  a."createdAt",
  a."updatedAt"
FROM "appointments" a
LEFT JOIN "services" s ON a."serviceId" = s."id"
WHERE a."serviceId" IS NOT NULL;

-- Step 5: Update totalDuration and totalPrice from migrated services
UPDATE "appointments" a
SET
  "totalDuration" = (
    SELECT COALESCE(SUM(appsvc."duration"), 0)
    FROM "appointment_services" appsvc
    WHERE appsvc."appointmentId" = a."id"
  ),
  "totalPrice" = (
    SELECT COALESCE(SUM(appsvc."price"), 0)
    FROM "appointment_services" appsvc
    WHERE appsvc."appointmentId" = a."id"
  )
WHERE EXISTS (
  SELECT 1 FROM "appointment_services" WHERE "appointmentId" = a."id"
);

-- Step 6: Create indexes for appointment_services
CREATE INDEX "appointment_services_appointmentId_idx" ON "appointment_services"("appointmentId");
CREATE INDEX "appointment_services_serviceId_idx" ON "appointment_services"("serviceId");

-- Step 7: Add index to appointments for faster queries by date
CREATE INDEX "appointments_tenantId_startAt_idx" ON "appointments"("tenantId", "startAt");
