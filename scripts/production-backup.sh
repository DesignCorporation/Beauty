#!/bin/bash

# Beauty Platform - Production Backup Script
# Автоматический backup для beta-тестирования

set -e

BACKUP_DIR="/root/beauty-backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="beauty_platform_new"
DB_USER="beauty_crm_user"

echo "🔄 Starting Beauty Platform backup: $DATE"

# Создаем папку для backups
mkdir -p "$BACKUP_DIR/$DATE"

# 1. DATABASE BACKUP
echo "📊 Backing up database..."
PGPASSWORD=your_secure_password_123 pg_dump -h localhost -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/$DATE/database.sql"

# 2. UPLOADED IMAGES BACKUP  
echo "🖼️ Backing up images..."
tar -czf "$BACKUP_DIR/$DATE/images.tar.gz" -C /root/beauty-platform/services/images-api uploaded_images/ || echo "Images folder not found"

# 3. CONFIG FILES BACKUP
echo "⚙️ Backing up configs..."
tar -czf "$BACKUP_DIR/$DATE/configs.tar.gz" -C /root/beauty-platform \
    services/auth-service/.env \
    services/api-gateway/.env \
    services/images-api/.env \
    ecosystem.config.cjs \
    || echo "Some config files not found"

# 4. NGINX CONFIGS
echo "🌐 Backing up nginx..."
tar -czf "$BACKUP_DIR/$DATE/nginx.tar.gz" /etc/nginx/ || echo "Nginx config not found"

# 5. CLEANUP OLD BACKUPS (keep 7 days)
echo "🧹 Cleaning old backups..."
find "$BACKUP_DIR" -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true

echo "✅ Backup completed: $BACKUP_DIR/$DATE"
echo "📦 Files:"
ls -la "$BACKUP_DIR/$DATE/"

# 6. TEST RESTORE (validate backup)
echo "🧪 Testing database backup..."
PGPASSWORD=your_secure_password_123 pg_restore --list "$BACKUP_DIR/$DATE/database.sql" > /dev/null && echo "✅ Database backup is valid" || echo "❌ Database backup is corrupted!"

echo "🎉 Backup process completed successfully!"