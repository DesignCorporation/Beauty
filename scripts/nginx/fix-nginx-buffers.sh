#!/bin/bash
# Beauty Platform - Fix nginx buffer settings for JWT tokens (RS256)
# Автоматически добавляет proxy buffer settings во все nginx конфиги

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Please run as root (sudo)${NC}"
  exit 1
fi

# Domains to fix
DOMAINS=(
  "dev-salon.beauty.designcorp.eu"
  "dev-client.beauty.designcorp.eu"
  "dev-crm.beauty.designcorp.eu"
  "salon.beauty.designcorp.eu"
  "client.beauty.designcorp.eu"
  "admin.beauty.designcorp.eu"
  "test-admin.beauty.designcorp.eu"
  "test-crm.beauty.designcorp.eu"
)

# Buffer settings to add (properly escaped for sed)
BUFFER_LINE1='    # JWT tokens buffer size fix (RS256 tokens ~12-16KB) - CRITICAL!'
BUFFER_LINE2='    proxy_buffer_size 16k;'
BUFFER_LINE3='    proxy_buffers 8 16k;'
BUFFER_LINE4='    proxy_busy_buffers_size 32k;'

echo "🔧 Автоматическое исправление nginx buffer settings..."
echo ""

FIXED_COUNT=0
SKIPPED_COUNT=0
ERROR_COUNT=0

for domain in "${DOMAINS[@]}"; do
  config="/etc/nginx/sites-available/$domain"

  if [ ! -f "$config" ]; then
    echo -e "${YELLOW}⏭️${NC}  $domain - конфиг не найден, пропускаем"
    ((SKIPPED_COUNT++))
    continue
  fi

  # Check if already fixed
  if grep -q "proxy_buffer_size 16k" "$config"; then
    echo -e "${GREEN}✅${NC} $domain - уже исправлен"
    ((SKIPPED_COUNT++))
    continue
  fi

  echo -e "${BLUE}🔧${NC} Исправляю $domain..."

  # Backup original config
  backup_file="$config.backup-$(date +%Y%m%d-%H%M%S)"
  cp "$config" "$backup_file"
  echo "   📦 Backup: $backup_file"

  # Find location /api/ block and add buffer settings
  # Strategy: Add after "proxy_set_header X-Forwarded-Host" line
  if grep -q "proxy_set_header X-Forwarded-Host" "$config"; then
    # Add lines one by one (sed multiline hack)
    sed -i "/proxy_set_header X-Forwarded-Host/a\\
\\
$BUFFER_LINE1\\
$BUFFER_LINE2\\
$BUFFER_LINE3\\
$BUFFER_LINE4" "$config"
    echo -e "   ${GREEN}✅${NC} Buffer settings добавлены"
    ((FIXED_COUNT++))
  else
    echo -e "   ${RED}❌${NC} Не найден anchor point (X-Forwarded-Host), нужно вручную"
    # Restore backup
    mv "$backup_file" "$config"
    ((ERROR_COUNT++))
    continue
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Исправлено:${NC} $FIXED_COUNT"
echo -e "${YELLOW}⏭️  Пропущено:${NC} $SKIPPED_COUNT"
echo -e "${RED}❌ Ошибки:${NC} $ERROR_COUNT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FIXED_COUNT -gt 0 ]; then
  echo "🧪 Проверка синтаксиса nginx..."
  if nginx -t 2>&1 | grep -q "test is successful"; then
    echo -e "${GREEN}✅ Синтаксис OK${NC}"
    echo ""
    echo "🔄 Reload nginx для применения изменений? (y/n)"
    read -r answer
    if [ "$answer" = "y" ]; then
      systemctl reload nginx
      echo -e "${GREEN}✅ Nginx reloaded успешно${NC}"
      echo ""
      echo "🎯 Проверьте логи на наличие 502 ошибок:"
      echo "   tail -100 /var/log/nginx/*.error.log | grep '502\\|upstream sent'"
    else
      echo "⏸️  Reload отменён. Для применения изменений выполните:"
      echo "   sudo systemctl reload nginx"
    fi
  else
    echo -e "${RED}❌ ОШИБКА СИНТАКСИСА!${NC}"
    echo ""
    nginx -t
    echo ""
    echo "🚨 Восстановите backup файлы вручную:"
    ls -lt /etc/nginx/sites-available/*.backup-* | head -$FIXED_COUNT
    exit 1
  fi
else
  echo "ℹ️  Нет изменений для применения"
fi

echo ""
echo "📚 Полная документация: /root/projects/beauty/docs/infrastructure/NGINX_BUFFER_SIZE_FIX.md"
