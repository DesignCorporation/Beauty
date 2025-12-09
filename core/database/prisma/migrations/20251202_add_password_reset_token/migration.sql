-- Add password reset fields to users
ALTER TABLE "users" ADD COLUMN "password_reset_token" TEXT;
ALTER TABLE "users" ADD COLUMN "password_reset_expires_at" TIMESTAMP(3);

-- Ensure uniqueness of reset token when present
CREATE UNIQUE INDEX "users_password_reset_token_key"
ON "users"("password_reset_token")
WHERE "password_reset_token" IS NOT NULL;
