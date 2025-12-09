-- Subscription pricing & lifecycle enhancements

ALTER TABLE "subscriptions"
  ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'PLN',
  ADD COLUMN "base_price_cents" INTEGER NOT NULL DEFAULT 10000,
  ADD COLUMN "staff_seat_price_cents" INTEGER NOT NULL DEFAULT 2500,
  ADD COLUMN "staff_seat_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "discount_percent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "discount_ends_at" TIMESTAMPTZ,
  ADD COLUMN "net_amount_cents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "gross_amount_cents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "vat_rate_bps" INTEGER NOT NULL DEFAULT 2300,
  ADD COLUMN "past_due_since" TIMESTAMPTZ,
  ADD COLUMN "grace_period_ends_at" TIMESTAMPTZ,
  ADD COLUMN "last_billing_date" TIMESTAMPTZ,
  ADD COLUMN "last_warning_sent_at" TIMESTAMPTZ;
