#!/bin/bash
#
# Beauty Platform Orchestrator Status Checker
# Удобная обертка для проверки статуса всех сервисов
#
# Usage:
#   ./scripts/orchestrator-status.sh [--json|--services|--warmup]
#

set -euo pipefail

ORCHESTRATOR_URL="http://localhost:6030"
ORCHESTRATOR_API="$ORCHESTRATOR_URL/orchestrator"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if orchestrator is accessible
check_orchestrator() {
    if ! curl -s "$ORCHESTRATOR_URL/health" >/dev/null 2>&1; then
        echo -e "${RED}❌ Orchestrator не доступен на $ORCHESTRATOR_URL${NC}"
        echo "💡 Запустите: ./scripts/start-orchestrator.sh start"
        exit 1
    fi
}

# Function to display service status in table format
display_services_table() {
    local data="$1"

    echo -e "${BLUE}📊 Статус сервисов Beauty Platform${NC}"
    echo "======================================================"

    # Parse orchestrator info
    local version uptime running total healthy
    version=$(echo "$data" | jq -r '.data.orchestrator.version // "unknown"')
    uptime=$(echo "$data" | jq -r '.data.orchestrator.uptime // 0')
    running=$(echo "$data" | jq -r '.data.orchestrator.servicesRunning // 0')
    total=$(echo "$data" | jq -r '.data.orchestrator.servicesTotal // 0')
    healthy=$(echo "$data" | jq -r '.data.orchestrator.servicesHealthy // 0')

    # Convert uptime to human readable
    local uptime_human
    if [[ $uptime =~ ^[0-9]+$ ]] && [[ $uptime -gt 60 ]]; then
        uptime_human="$((uptime / 60))m $((uptime % 60))s"
    else
        uptime_human="${uptime}s"
    fi

    echo -e "${GREEN}🎯 Orchestrator${NC}: v$version, Uptime: $uptime_human"
    echo -e "${GREEN}📈 Сервисы${NC}: $running/$total запущено, $healthy здоровых"
    echo ""

    # Services table header
    printf "%-20s %-12s %-8s %-8s %-15s\n" "SERVICE" "STATE" "HEALTH" "PORT" "WARMUP"
    echo "----------------------------------------------------------------------"

    # Parse and display each service
    echo "$data" | jq -r '.data.services[] |
        [.serviceId, .state, (.health.isHealthy | if . then "✅" else "❌" end),
         (.registry.port // "—"),
         (if .warmup.isInWarmup then "\(.warmup.progress)%" else "—" end)] |
        @tsv' | \
    while IFS=$'\t' read -r service state health port warmup; do
        # Color code the state
        case "$state" in
            "running")     state_colored="${GREEN}$state${NC}" ;;
            "starting")    state_colored="${YELLOW}$state${NC}" ;;
            "stopped")     state_colored="${RED}$state${NC}" ;;
            "external")    state_colored="${BLUE}$state${NC}" ;;
            *)             state_colored="$state" ;;
        esac

        printf "%-30s %-20s %-8s %-8s %-15s\n" "$service" "$state_colored" "$health" "$port" "$warmup"
    done
}

# Function to show only services in starting/warmup
display_warmup_services() {
    local data="$1"

    echo -e "${YELLOW}🔄 Сервисы в процессе запуска/прогрева${NC}"
    echo "=============================================="

    local has_warmup=false
    echo "$data" | jq -r '.data.services[] |
        select(.state == "starting" or .warmup.isInWarmup) |
        [.serviceId, .state,
         (if .warmup.isInWarmup then "\(.warmup.successfulChecks)/\(.warmup.requiredChecks) (\(.warmup.progress)%)" else "—" end)] |
        @tsv' | \
    while IFS=$'\t' read -r service state warmup; do
        has_warmup=true
        printf "%-20s %-12s %s\n" "$service" "$state" "$warmup"
    done

    if [[ "$has_warmup" != "true" ]]; then
        echo "Все сервисы завершили запуск ✅"
    fi
}

# Main function
main() {
    local mode="${1:-table}"

    # Check orchestrator availability
    check_orchestrator

    # Get orchestrator status
    local status_data
    status_data=$(curl -s "$ORCHESTRATOR_API/status-all")

    case "$mode" in
        "--json")
            echo "$status_data" | jq '.'
            ;;
        "--services")
            echo "$status_data" | jq -r '.data.services[] | .serviceId' | sort
            ;;
        "--warmup")
            display_warmup_services "$status_data"
            ;;
        *)
            display_services_table "$status_data"
            ;;
    esac
}

# Run main function
main "$@"