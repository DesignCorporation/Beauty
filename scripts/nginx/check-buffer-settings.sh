#!/bin/bash
# Beauty Platform - Check nginx buffer settings for all domains
# Проверяет какие домены требуют исправления buffer size для JWT tokens

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Domains to check
DOMAINS=(
  "dev-salon.beauty.designcorp.eu"
  "dev-client.beauty.designcorp.eu"
  "dev-admin.beauty.designcorp.eu"
  "dev-crm.beauty.designcorp.eu"
  "salon.beauty.designcorp.eu"
  "client.beauty.designcorp.eu"
  "admin.beauty.designcorp.eu"
  "test-admin.beauty.designcorp.eu"
  "test-crm.beauty.designcorp.eu"
)

echo "🔍 Проверка nginx buffer settings для JWT tokens (RS256)..."
echo ""

NEEDS_FIX=()
ALREADY_FIXED=()
NOT_FOUND=()

for domain in "${DOMAINS[@]}"; do
  config="/etc/nginx/sites-available/$domain"

  if [ ! -f "$config" ]; then
    NOT_FOUND+=("$domain")
    echo -e "${YELLOW}❓${NC} $domain - конфиг не найден"
    continue
  fi

  if grep -q "proxy_buffer_size 16k" "$config"; then
    ALREADY_FIXED+=("$domain")
    echo -e "${GREEN}✅${NC} $domain - buffer settings OK"
  else
    NEEDS_FIX+=("$domain")
    echo -e "${RED}⚠️${NC}  $domain - ТРЕБУЕТ ИСПРАВЛЕНИЯ!"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Уже исправлено:${NC} ${#ALREADY_FIXED[@]}"
echo -e "${RED}⚠️  Требуют исправления:${NC} ${#NEEDS_FIX[@]}"
echo -e "${YELLOW}❓ Не найдено:${NC} ${#NOT_FOUND[@]}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ${#NEEDS_FIX[@]} -gt 0 ]; then
  echo -e "${YELLOW}Домены требующие исправления:${NC}"
  for domain in "${NEEDS_FIX[@]}"; do
    echo "  - $domain"
  done
  echo ""
  echo "🔧 Запустить автоматическое исправление?"
  echo "   ./fix-nginx-buffers.sh"
fi

exit 0
