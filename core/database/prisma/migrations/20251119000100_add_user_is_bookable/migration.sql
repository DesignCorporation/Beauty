-- Добавляем флаг доступности для записи (владельцы/админы могут быть не-мастерами)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isBookable" BOOLEAN NOT NULL DEFAULT TRUE;
