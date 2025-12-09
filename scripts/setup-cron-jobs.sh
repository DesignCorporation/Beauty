#!/bin/bash

# Beauty Platform - Setup Production Cron Jobs
# Настройка автоматических задач для production

echo "⚙️ Setting up Beauty Platform cron jobs..."

# Создаем crontab конфигурацию
CRON_FILE="/tmp/beauty-crontab"

cat > "$CRON_FILE" << 'EOF'
# Beauty Platform Production Cron Jobs

# Daily backup at 3 AM
0 3 * * * /root/beauty-platform/scripts/production-backup.sh >> /var/log/beauty-backup.log 2>&1

# Health monitoring every 2 minutes
*/2 * * * * /root/beauty-platform/scripts/health-monitor.sh

# Weekly log cleanup on Sundays at 2 AM
0 2 * * 0 find /var/log -name "beauty-*" -mtime +7 -delete

# Database optimization weekly on Sundays at 4 AM
0 4 * * 0 PGPASSWORD=your_secure_password_123 psql -h localhost -U beauty_crm_user -d beauty_platform_new -c "VACUUM ANALYZE;" >> /var/log/beauty-maintenance.log 2>&1

# Check disk space hourly and alert if > 85%
0 * * * * df / | awk 'NR==2 {if ($5+0 > 85) print "Disk space alert: " $5 " used"}' >> /var/log/beauty-disk-alerts.log

# PM2 resurrection check every 5 minutes (restart if needed)
*/5 * * * * /usr/local/bin/pm2 resurrect >> /var/log/beauty-pm2-resurrect.log 2>&1

# SSL certificate renewal check (monthly)
0 0 1 * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx" >> /var/log/beauty-ssl-renewal.log 2>&1

EOF

# Устанавливаем crontab
crontab "$CRON_FILE"

# Удаляем временный файл
rm "$CRON_FILE"

echo "✅ Cron jobs installed successfully!"
echo ""
echo "📋 Installed jobs:"
echo "  - Daily backups (3:00 AM)"
echo "  - Health monitoring (every 2 minutes)"
echo "  - Log cleanup (weekly)"
echo "  - Database optimization (weekly)"
echo "  - Disk space monitoring (hourly)"
echo "  - PM2 resurrection (every 5 minutes)"
echo "  - SSL renewal (monthly)"
echo ""
echo "🔍 To view current crontab: crontab -l"
echo "📊 To view logs: ls -la /var/log/beauty-*"