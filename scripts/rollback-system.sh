#!/bin/bash

# Beauty Platform - Emergency Rollback System
# Быстрый откат к предыдущей стабильной версии

set -e

BACKUP_DIR="/root/beauty-backups"
DB_NAME="beauty_platform_new"
DB_USER="beauty_crm_user"

show_usage() {
    echo "🔄 Beauty Platform Rollback System"
    echo ""
    echo "Usage:"
    echo "  $0 list                    # Показать доступные backups"
    echo "  $0 rollback YYYYMMDD_HHMMSS # Откат к указанной версии"
    echo "  $0 emergency               # Экстренный откат к последнему backup"
    echo ""
    exit 1
}

list_backups() {
    echo "📦 Available backups:"
    echo ""
    ls -la "$BACKUP_DIR" | grep "^d" | grep -E "[0-9]{8}_[0-9]{6}" | while read -r line; do
        backup_date=$(echo "$line" | awk '{print $9}')
        backup_size=$(du -sh "$BACKUP_DIR/$backup_date" | awk '{print $1}')
        echo "  📅 $backup_date (Size: $backup_size)"
    done
    echo ""
}

emergency_rollback() {
    echo "🚨 EMERGENCY ROLLBACK - Finding latest backup..."
    
    latest_backup=$(ls -1 "$BACKUP_DIR" | grep -E "[0-9]{8}_[0-9]{6}" | sort -r | head -1)
    
    if [ -z "$latest_backup" ]; then
        echo "❌ No backups found!"
        exit 1
    fi
    
    echo "🔄 Rolling back to: $latest_backup"
    perform_rollback "$latest_backup"
}

perform_rollback() {
    local backup_version="$1"
    local backup_path="$BACKUP_DIR/$backup_version"
    
    if [ ! -d "$backup_path" ]; then
        echo "❌ Backup not found: $backup_path"
        exit 1
    fi
    
    echo "🛑 STARTING ROLLBACK TO: $backup_version"
    echo "⚠️  WARNING: This will replace current data!"
    echo "⏰ You have 10 seconds to cancel (Ctrl+C)..."
    sleep 10
    
    # 1. Stop services
    echo "🛑 Stopping services..."
    pm2 stop all || true
    
    # 2. Create emergency backup of current state
    emergency_backup_dir="/root/emergency-backup-$(date +%Y%m%d_%H%M%S)"
    echo "💾 Creating emergency backup: $emergency_backup_dir"
    mkdir -p "$emergency_backup_dir"
    PGPASSWORD=your_secure_password_123 pg_dump -h localhost -U $DB_USER -d $DB_NAME > "$emergency_backup_dir/current_database.sql" || true
    
    # 3. Restore database
    echo "📊 Restoring database..."
    if [ -f "$backup_path/database.sql" ]; then
        # Drop and recreate database
        PGPASSWORD=your_secure_password_123 psql -h localhost -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME}_temp;" || true
        PGPASSWORD=your_secure_password_123 psql -h localhost -U $DB_USER -d postgres -c "CREATE DATABASE ${DB_NAME}_temp;" || true
        PGPASSWORD=your_secure_password_123 psql -h localhost -U $DB_USER -d ${DB_NAME}_temp < "$backup_path/database.sql" || true
        
        # Swap databases
        PGPASSWORD=your_secure_password_123 psql -h localhost -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME}_old;" || true
        PGPASSWORD=your_secure_password_123 psql -h localhost -U $DB_USER -d postgres -c "ALTER DATABASE $DB_NAME RENAME TO ${DB_NAME}_old;" || true
        PGPASSWORD=your_secure_password_123 psql -h localhost -U $DB_USER -d postgres -c "ALTER DATABASE ${DB_NAME}_temp RENAME TO $DB_NAME;" || true
        
        echo "✅ Database restored"
    else
        echo "⚠️ Database backup not found, skipping..."
    fi
    
    # 4. Restore images
    echo "🖼️ Restoring images..."
    if [ -f "$backup_path/images.tar.gz" ]; then
        cd /root/beauty-platform/services/images-api
        rm -rf uploaded_images/ || true
        tar -xzf "$backup_path/images.tar.gz" || true
        echo "✅ Images restored"
    else
        echo "⚠️ Images backup not found, skipping..."
    fi
    
    # 5. Restore configs
    echo "⚙️ Restoring configs..."
    if [ -f "$backup_path/configs.tar.gz" ]; then
        cd /root/beauty-platform
        tar -xzf "$backup_path/configs.tar.gz" || true
        echo "✅ Configs restored"
    else
        echo "⚠️ Configs backup not found, skipping..."
    fi
    
    # 6. Restart services
    echo "🚀 Restarting services..."
    cd /root/beauty-platform
    pm2 restart all || pm2 start ecosystem.config.cjs
    
    # 7. Health check
    echo "🔍 Running health check..."
    sleep 10
    /root/beauty-platform/scripts/health-monitor.sh
    
    echo ""
    echo "🎉 ROLLBACK COMPLETED!"
    echo "📅 Rolled back to: $backup_version"
    echo "💾 Emergency backup saved to: $emergency_backup_dir"
    echo "🔍 Check health status above"
    echo ""
}

case "$1" in
    "list")
        list_backups
        ;;
    "rollback")
        if [ -z "$2" ]; then
            echo "❌ Please specify backup version"
            show_usage
        fi
        perform_rollback "$2"
        ;;
    "emergency")
        emergency_rollback
        ;;
    *)
        show_usage
        ;;
esac