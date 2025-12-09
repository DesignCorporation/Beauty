#!/bin/bash

# Beauty Platform - Health Monitoring для Production
# Проверка всех сервисов каждые 2 минуты

SERVICES=(
    "Auth Service:6021:/health"
    "Admin Panel:6002:"
    "Salon CRM:6001:"
    "Client Portal:6003:"
    "Images API:6026:/health"
    "API Gateway:6020:/health"
    "VS Code Server:6080:"
)

TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN"  # Замените на реальный токен
TELEGRAM_CHAT_ID="YOUR_CHAT_ID"     # Замените на реальный chat_id

LOG_FILE="/var/log/beauty-platform-health.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] 🔍 Health check started" | tee -a "$LOG_FILE"

send_alert() {
    local message="$1"
    echo "[$DATE] 🚨 ALERT: $message" | tee -a "$LOG_FILE"
    
    # Отправка в Telegram (если настроен)
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ "$TELEGRAM_BOT_TOKEN" != "YOUR_BOT_TOKEN" ]; then
        curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
            -d chat_id="$TELEGRAM_CHAT_ID" \
            -d text="🚨 Beauty Platform Alert: $message" \
            -d parse_mode="HTML" > /dev/null
    fi
}

all_healthy=true

for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r name port endpoint <<< "$service_info"
    
    if [ -n "$endpoint" ]; then
        # API endpoint check
        url="http://localhost:$port$endpoint"
        if curl -s -f --max-time 10 "$url" > /dev/null 2>&1; then
            echo "[$DATE] ✅ $name ($port) - healthy" | tee -a "$LOG_FILE"
        else
            echo "[$DATE] ❌ $name ($port) - DOWN" | tee -a "$LOG_FILE"
            send_alert "$name service is DOWN (port $port)"
            all_healthy=false
        fi
    else
        # HTTP check для фронтенд приложений
        if curl -s -f --max-time 10 "http://localhost:$port" | grep -q "html\|<!DOCTYPE" 2>/dev/null; then
            echo "[$DATE] ✅ $name ($port) - healthy" | tee -a "$LOG_FILE"
        else
            echo "[$DATE] ❌ $name ($port) - DOWN" | tee -a "$LOG_FILE"
            send_alert "$name frontend is DOWN (port $port)"
            all_healthy=false
        fi
    fi
done

# Database check
if PGPASSWORD=your_secure_password_123 psql -h localhost -U beauty_crm_user -d beauty_platform_new -c "SELECT 1;" > /dev/null 2>&1; then
    echo "[$DATE] ✅ Database - healthy" | tee -a "$LOG_FILE"
else
    echo "[$DATE] ❌ Database - DOWN" | tee -a "$LOG_FILE"
    send_alert "Database is DOWN!"
    all_healthy=false
fi

# Disk space check
disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -gt 85 ]; then
    send_alert "Disk space is running low: ${disk_usage}% used"
    all_healthy=false
fi

if $all_healthy; then
    echo "[$DATE] 🎉 All systems healthy!" | tee -a "$LOG_FILE"
else
    echo "[$DATE] 🚨 Some systems are DOWN - check logs!" | tee -a "$LOG_FILE"
fi

# Rotate logs (keep 7 days)
find /var/log -name "beauty-platform-health.log*" -mtime +7 -delete 2>/dev/null || true