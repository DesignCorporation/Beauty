-- Migration: Add explicit onDelete behaviours for relational integrity
-- Generated manually because local database is unavailable during codex run

-- Users ↔ Tenants
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_tenantId_fkey";
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Clients (legacy) ↔ Tenants
ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_tenantId_fkey";
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Services ↔ Tenants
ALTER TABLE "services" DROP CONSTRAINT IF EXISTS "services_tenantId_fkey";
ALTER TABLE "services" ADD CONSTRAINT "services_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Appointments ↔ Tenants
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_tenantId_fkey";
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Appointments ↔ Clients (preserve audit trail)
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_clientId_fkey";
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Appointments ↔ Services
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_serviceId_fkey";
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Assigned staff (nullable when staff removed)
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_assignedToId_fkey";
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Creator reference (nullable on user removal)
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_createdById_fkey";
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Invitations ↔ Tenants and Users
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_tenantId_fkey";
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_inviterUserId_fkey";
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviterUserId_fkey" FOREIGN KEY ("inviterUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- User salon access ↔ Users, Tenants, Invitations
ALTER TABLE "user_salon_access" DROP CONSTRAINT IF EXISTS "user_salon_access_userId_fkey";
ALTER TABLE "user_salon_access" ADD CONSTRAINT "user_salon_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_salon_access" DROP CONSTRAINT IF EXISTS "user_salon_access_tenantId_fkey";
ALTER TABLE "user_salon_access" ADD CONSTRAINT "user_salon_access_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_salon_access" DROP CONSTRAINT IF EXISTS "user_salon_access_invitationId_fkey";
ALTER TABLE "user_salon_access" ADD CONSTRAINT "user_salon_access_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Payments ↔ Appointments
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_appointment_id_fkey";
ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Refunds ↔ Payments
ALTER TABLE "refunds" DROP CONSTRAINT IF EXISTS "refunds_payment_id_fkey";
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Payment events ↔ Payments / Refunds
ALTER TABLE "payment_events" DROP CONSTRAINT IF EXISTS "payment_events_payment_id_fkey";
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_events" DROP CONSTRAINT IF EXISTS "payment_events_refund_id_fkey";
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
