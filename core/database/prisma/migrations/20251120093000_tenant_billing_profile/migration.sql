ALTER TABLE "tenants"
  ADD COLUMN "billing_company_name" TEXT,
  ADD COLUMN "billing_vat_id" TEXT,
  ADD COLUMN "billing_use_salon_address" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "billing_address" TEXT,
  ADD COLUMN "billing_city" TEXT,
  ADD COLUMN "billing_postal_code" TEXT,
  ADD COLUMN "billing_country" TEXT;
