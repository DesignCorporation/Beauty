-- Fix migration for ClientNotificationType enum duplication issue
-- This migration ensures the enum exists with all required values

-- Check if ClientNotificationType exists, if not create it
-- If it exists, ensure all values are present

-- PostgreSQL doesn't support conditional CREATE TYPE, so we'll handle it with ALTER instead
-- First, check and add any missing enum values

-- If the type doesn't exist, this will fail but the previous migration should have created it
-- If it exists, we add any missing values

DO $$
BEGIN
  -- Try to add enum values if they don't exist
  BEGIN
    ALTER TYPE "ClientNotificationType" ADD VALUE 'APPOINTMENT_CONFIRMED' AFTER 'APPOINTMENT_CONFIRMED';
  EXCEPTION WHEN duplicate_object THEN
    -- Value already exists, that's fine
  END;

  -- Additional values that might be needed
  BEGIN
    ALTER TYPE "ClientNotificationType" ADD VALUE 'APPOINTMENT_REMINDER';
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER TYPE "ClientNotificationType" ADD VALUE 'APPOINTMENT_CANCELLED';
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER TYPE "ClientNotificationType" ADD VALUE 'APPOINTMENT_RESCHEDULED';
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER TYPE "ClientNotificationType" ADD VALUE 'LOYALTY_POINTS_EARNED';
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER TYPE "ClientNotificationType" ADD VALUE 'LOYALTY_TIER_UPGRADED';
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER TYPE "ClientNotificationType" ADD VALUE 'BIRTHDAY_REWARD';
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER TYPE "ClientNotificationType" ADD VALUE 'REFERRAL_BONUS';
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER TYPE "ClientNotificationType" ADD VALUE 'MARKETING_PROMOTION';
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER TYPE "ClientNotificationType" ADD VALUE 'PAYMENT_RECEIPT';
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Note: This migration handles the enum duplication gracefully without dropping data
