-- ========================================
-- Client Portal Notifications System
-- ========================================

-- 1. Enum с типами уведомлений клиентского портала
CREATE TYPE "ClientNotificationType" AS ENUM (
    'APPOINTMENT_CONFIRMED',
    'APPOINTMENT_REMINDER',
    'APPOINTMENT_CANCELLED',
    'APPOINTMENT_RESCHEDULED',
    'LOYALTY_POINTS_EARNED',
    'LOYALTY_TIER_UPGRADED',
    'BIRTHDAY_REWARD',
    'REFERRAL_BONUS',
    'MARKETING_PROMOTION',
    'PAYMENT_RECEIPT'
);

-- 2. Таблица для in-app уведомлений клиентского портала
CREATE TABLE "client_notifications" (
    "id" TEXT NOT NULL,
    "client_email" TEXT NOT NULL,
    "type" "ClientNotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "read_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    CONSTRAINT "client_notifications_pkey" PRIMARY KEY ("id")
);

-- 3. Индексы для быстрого поиска и подсчёта непрочитанных
CREATE INDEX "client_notifications_client_email_read_at_idx"
    ON "client_notifications" ("client_email", "read_at");

CREATE INDEX "client_notifications_client_email_created_at_idx"
    ON "client_notifications" ("client_email", "created_at");

-- 4. Внешний ключ на ClientProfile (email)
ALTER TABLE "client_notifications"
    ADD CONSTRAINT "client_notifications_client_email_fkey"
    FOREIGN KEY ("client_email") REFERENCES "client_profiles"("email")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Комментарии для документации
COMMENT ON TABLE "client_notifications" IS 'In-app уведомления клиентского портала (Client Portal)';
COMMENT ON COLUMN "client_notifications"."client_email" IS 'Email из ClientProfile (tenant-agnostic)';
