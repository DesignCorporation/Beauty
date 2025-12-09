#!/bin/bash

# TypeScript Error Analysis Script
# Анализирует вывод tsc --noEmit и генерирует отчёт

set -euo pipefail

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Директории проекта
PROJECT_ROOT="/root/projects/beauty"
TEMP_FILE=$(mktemp)
REPORT_FILE="${PROJECT_ROOT}/typescript-errors-report.json"

echo -e "${BLUE}=== TypeScript Error Analysis ===${NC}"
echo ""

# Запускаем TypeScript компиляцию и сохраняем вывод
cd "$PROJECT_ROOT"
echo -e "${YELLOW}Запуск TypeScript компиляции...${NC}"
npx tsc --noEmit 2>&1 | tee "$TEMP_FILE" || true

# Подсчёт общего количества ошибок
TOTAL_ERRORS=$(grep -c "error TS" "$TEMP_FILE" || echo "0")

echo ""
echo -e "${BLUE}=== Анализ результатов ===${NC}"
echo -e "Total Errors: ${RED}${TOTAL_ERRORS}${NC}"
echo ""

# Анализ по типам ошибок
echo -e "${YELLOW}Error Distribution:${NC}"

# TS6133 - неиспользуемые переменные
TS6133=$(grep -c "error TS6133:" "$TEMP_FILE" || echo "0")
TS6133_PCT=$((TOTAL_ERRORS > 0 ? TS6133 * 100 / TOTAL_ERRORS : 0))
echo -e "  TS6133 (unused variables/imports): ${RED}${TS6133}${NC} (${TS6133_PCT}%)"

# TS2345 - неправильные типы аргументов
TS2345=$(grep -c "error TS2345:" "$TEMP_FILE" || echo "0")
TS2345_PCT=$((TOTAL_ERRORS > 0 ? TS2345 * 100 / TOTAL_ERRORS : 0))
echo -e "  TS2345 (argument type mismatch): ${RED}${TS2345}${NC} (${TS2345_PCT}%)"

# TS2322 - type mismatch
TS2322=$(grep -c "error TS2322:" "$TEMP_FILE" || echo "0")
TS2322_PCT=$((TOTAL_ERRORS > 0 ? TS2322 * 100 / TOTAL_ERRORS : 0))
echo -e "  TS2322 (type mismatch): ${RED}${TS2322}${NC} (${TS2322_PCT}%)"

# TS2375 - type mismatch в return
TS2375=$(grep -c "error TS2375:" "$TEMP_FILE" || echo "0")
TS2375_PCT=$((TOTAL_ERRORS > 0 ? TS2375 * 100 / TOTAL_ERRORS : 0))
echo -e "  TS2375 (return type mismatch): ${RED}${TS2375}${NC} (${TS2375_PCT}%)"

# TS7030 - not all code paths return
TS7030=$(grep -c "error TS7030:" "$TEMP_FILE" || echo "0")
TS7030_PCT=$((TOTAL_ERRORS > 0 ? TS7030 * 100 / TOTAL_ERRORS : 0))
echo -e "  TS7030 (not all paths return): ${RED}${TS7030}${NC} (${TS7030_PCT}%)"

# TS18046 - possibly undefined
TS18046=$(grep -c "error TS18046:" "$TEMP_FILE" || echo "0")
TS18046_PCT=$((TOTAL_ERRORS > 0 ? TS18046 * 100 / TOTAL_ERRORS : 0))
echo -e "  TS18046 (possibly undefined): ${RED}${TS18046}${NC} (${TS18046_PCT}%)"

# TS2339 - property does not exist
TS2339=$(grep -c "error TS2339:" "$TEMP_FILE" || echo "0")
TS2339_PCT=$((TOTAL_ERRORS > 0 ? TS2339 * 100 / TOTAL_ERRORS : 0))
echo -e "  TS2339 (property does not exist): ${RED}${TS2339}${NC} (${TS2339_PCT}%)"

# Прочие ошибки
OTHERS=$((TOTAL_ERRORS - TS6133 - TS2345 - TS2322 - TS2375 - TS7030 - TS18046 - TS2339))
OTHERS_PCT=$((TOTAL_ERRORS > 0 ? OTHERS * 100 / TOTAL_ERRORS : 0))
echo -e "  Others: ${RED}${OTHERS}${NC} (${OTHERS_PCT}%)"

echo ""
echo -e "${YELLOW}Top 10 Files with Most Errors:${NC}"

# Извлекаем имена файлов и подсчитываем ошибки
grep "error TS" "$TEMP_FILE" | cut -d'(' -f1 | sort | uniq -c | sort -rn | head -10 | while read count file; do
    # Убираем PROJECT_ROOT из пути для короткого отображения
    short_file=$(echo "$file" | sed "s|${PROJECT_ROOT}/||g" | xargs)
    echo -e "  ${RED}${count}${NC} errors - ${short_file}"
done

echo ""
echo -e "${BLUE}=== Recommendations ===${NC}"

if [ "$TS6133" -gt 0 ]; then
    echo -e "  ${GREEN}✓${NC} Run auto-fix for unused imports: ${YELLOW}pnpm fix:typescript --type=unused${NC}"
fi

if [ "$TS2322" -gt 0 ] || [ "$TS2345" -gt 0 ]; then
    echo -e "  ${GREEN}✓${NC} Run auto-fix for type mismatches: ${YELLOW}pnpm fix:typescript --type=types${NC}"
fi

if [ "$TS7030" -gt 0 ]; then
    echo -e "  ${GREEN}✓${NC} Run auto-fix for missing returns: ${YELLOW}pnpm fix:typescript --type=returns${NC}"
fi

if [ "$TOTAL_ERRORS" -gt 0 ]; then
    echo -e "  ${GREEN}✓${NC} Run full auto-fix: ${YELLOW}pnpm fix:typescript${NC}"
    echo -e "  ${GREEN}✓${NC} Review changes: ${YELLOW}git diff${NC}"
    echo -e "  ${GREEN}✓${NC} Verify progress: ${YELLOW}npx tsc --noEmit${NC}"
fi

# Генерируем JSON отчёт
echo ""
echo -e "${YELLOW}Generating JSON report...${NC}"

cat > "$REPORT_FILE" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "totalErrors": $TOTAL_ERRORS,
  "errorDistribution": {
    "TS6133": { "count": $TS6133, "percentage": $TS6133_PCT, "description": "unused variables/imports" },
    "TS2345": { "count": $TS2345, "percentage": $TS2345_PCT, "description": "argument type mismatch" },
    "TS2322": { "count": $TS2322, "percentage": $TS2322_PCT, "description": "type mismatch" },
    "TS2375": { "count": $TS2375, "percentage": $TS2375_PCT, "description": "return type mismatch" },
    "TS7030": { "count": $TS7030, "percentage": $TS7030_PCT, "description": "not all paths return" },
    "TS18046": { "count": $TS18046, "percentage": $TS18046_PCT, "description": "possibly undefined" },
    "TS2339": { "count": $TS2339, "percentage": $TS2339_PCT, "description": "property does not exist" },
    "others": { "count": $OTHERS, "percentage": $OTHERS_PCT, "description": "other errors" }
  },
  "topFiles": $(grep "error TS" "$TEMP_FILE" | cut -d'(' -f1 | sort | uniq -c | sort -rn | head -10 | awk '{print "{\"errors\": "$1", \"file\": \""$2"\"}"}' | jq -s .)
}
EOF

echo -e "${GREEN}Report saved to: ${REPORT_FILE}${NC}"

# Очистка
rm -f "$TEMP_FILE"

echo ""
echo -e "${BLUE}=== Analysis Complete ===${NC}"

exit 0
