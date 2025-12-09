#!/bin/bash

# 🔍 Beauty Platform - System Status Checker
# Быстрая проверка состояния всех критических сервисов

echo "🚀 Beauty Platform - System Status Check"
echo "========================================"
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция проверки порта
check_port() {
    local port=$1
    local service_name=$2
    local url=$3
    
    if lsof -i :$port >/dev/null 2>&1; then
        if [ -n "$url" ]; then
            if curl -s --max-time 3 "$url" >/dev/null 2>&1; then
                echo -e "${GREEN}✅ $service_name (port $port)${NC} - WORKING"
            else
                echo -e "${YELLOW}⚠️  $service_name (port $port)${NC} - PORT OPEN, NO RESPONSE"
            fi
        else
            echo -e "${GREEN}✅ $service_name (port $port)${NC} - RUNNING"
        fi
        return 0
    else
        echo -e "${RED}❌ $service_name (port $port)${NC} - NOT RUNNING"
        return 1
    fi
}

# Проверка критических сервисов
echo "🔧 BACKEND SERVICES:"
check_port 6020 "API Gateway" "http://localhost:6020/health"
check_port 6021 "Auth Service" "http://localhost:6021/health"
check_port 6022 "CRM API" "http://localhost:6022/health"
check_port 6025 "MCP Server" "http://localhost:6025/health"  
check_port 6026 "Images API" "http://localhost:6026/health"

echo ""
echo "🌐 FRONTEND APPLICATIONS:"
check_port 6001 "Salon CRM" "http://localhost:6001/"
check_port 6002 "Admin Panel" "http://localhost:6002/"
check_port 6003 "Client Portal" "http://localhost:6003/"

echo ""
echo "💾 DATABASE:"
if pg_isready -h localhost -p 6100 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL${NC} - RUNNING"
    
    # Проверка подключения к БД
    if PGPASSWORD=your_secure_password_123 psql -h localhost -U beauty_crm_user -d beauty_platform_new -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database Connection${NC} - WORKING"
    else
        echo -e "${RED}❌ Database Connection${NC} - FAILED"
    fi
else
    echo -e "${RED}❌ PostgreSQL${NC} - NOT RUNNING"
fi

echo ""
echo "📁 PROJECT STRUCTURE:"
if [ -d "/root/beauty-platform" ]; then
    echo -e "${GREEN}✅ New Architecture${NC} - /root/beauty-platform/"
else
    echo -e "${RED}❌ New Architecture${NC} - /root/beauty-platform/ NOT FOUND"
fi

if [ -d "/root/beauty" ]; then
    echo -e "${GREEN}✅ Legacy Docs${NC} - /root/beauty/ (for reference)"
else
    echo -e "${YELLOW}⚠️  Legacy Docs${NC} - /root/beauty/ NOT FOUND"
fi

echo ""
echo "📚 DOCUMENTATION:"
if [ -f "/root/beauty-platform/CLAUDE.md" ]; then
    echo -e "${GREEN}✅ CLAUDE.md${NC} - Main memory file"
else
    echo -e "${RED}❌ CLAUDE.md${NC} - NOT FOUND"
fi

if [ -f "/root/beauty-platform/AI_QUICK_START.md" ]; then
    echo -e "${GREEN}✅ AI_QUICK_START.md${NC} - Quick start guide"
else
    echo -e "${YELLOW}⚠️  AI_QUICK_START.md${NC} - NOT FOUND"
fi

echo ""
echo "🎯 RECOMMENDATIONS:"

# Рекомендации на основе статуса
if ! lsof -i :6025 >/dev/null 2>&1; then
    echo -e "${RED}🚨 CRITICAL: MCP Server not running!${NC}"
    echo "   Fix: cd /root/beauty-mcp-server && node server.js &"
fi

if ! lsof -i :6021 >/dev/null 2>&1; then
    echo -e "${RED}🚨 CRITICAL: Auth Service not running!${NC}"
    echo "   Fix: cd /root/beauty-platform/services/auth-service && npm run dev &"
fi

if ! lsof -i :6002 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Admin Panel not running${NC}"
    echo "   Fix: cd /root/beauty-platform/apps/admin-panel && npm run dev &"
fi

echo ""
echo "⚡ QUICK COMMANDS:"
echo "📖 Read MCP Memory: curl -s http://localhost:6025/memory/current"
echo "🔍 Check Documentation: https://test-admin.beauty.designcorp.eu/documentation"
echo "📝 AI Quick Start: cat /root/beauty-platform/AI_QUICK_START.md"

echo ""
echo -e "${BLUE}🎉 System check completed!${NC}"