#!/bin/bash

# 🤖 AI Agent Onboarding Script
# Автоматическое получение всей необходимой информации для быстрого старта

echo "🤖 AI AGENT ONBOARDING - Beauty Platform"
echo "========================================="
echo ""

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}📚 Step 1: Reading AI Quick Start Guide${NC}"
echo "============================================="
if [ -f "/root/beauty-platform/AI_QUICK_START.md" ]; then
    head -50 /root/beauty-platform/AI_QUICK_START.md
    echo ""
    echo -e "${GREEN}✅ Quick Start Guide loaded${NC}"
else
    echo -e "${RED}❌ AI_QUICK_START.md not found${NC}"
fi

echo ""
echo -e "${BLUE}🧠 Step 2: Reading MCP Memory${NC}"
echo "==============================="
if curl -s --max-time 5 http://localhost:6025/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ MCP Server is running${NC}"
    echo ""
    echo -e "${CYAN}Current Memory:${NC}"
    curl -s http://localhost:6025/memory/current | head -100
    echo ""
else
    echo -e "${RED}❌ MCP Server not responding${NC}"
    echo "Fix: cd /root/beauty-mcp-server && node server.js &"
fi

echo ""
echo -e "${BLUE}🔍 Step 3: System Status Check${NC}"
echo "==================================="
if [ -f "/root/beauty-platform/scripts/check-system-status.sh" ]; then
    /root/beauty-platform/scripts/check-system-status.sh
else
    echo -e "${RED}❌ System status checker not found${NC}"
fi

echo ""
echo -e "${BLUE}🎯 Step 4: Agent Specialization${NC}"
echo "===================================="
echo "Available agent types:"
echo "• backend-dev     - Backend development"  
echo "• frontend-dev    - Frontend development"
echo "• devops-engineer - Infrastructure & deployment"
echo "• database-analyst - Database optimization"
echo "• product-manager - Product planning"
echo "• ui-designer     - UI/UX design"
echo ""
echo "Get your specialized context:"
echo "curl -s http://localhost:6025/memory/agents/YOUR-ROLE"

echo ""
echo -e "${BLUE}📖 Step 5: Documentation Access${NC}"
echo "====================================="
echo "Primary sources:"
echo "1. MCP Memory: http://localhost:6025/memory/current"
echo "2. AI Quick Start: /root/beauty-platform/AI_QUICK_START.md"
echo "3. Main Memory: /root/beauty-platform/CLAUDE.md"
echo "4. Interactive Docs: https://test-admin.beauty.designcorp.eu/documentation"
echo "5. Legacy Search: Use Task tool on /root/beauty/docs/"

echo ""
echo -e "${GREEN}🎉 ONBOARDING COMPLETE!${NC}"
echo ""
echo -e "${YELLOW}⚡ Next Steps:${NC}"
echo "1. Determine your role (backend-dev, frontend-dev, etc.)"
echo "2. Get specialized context: curl -s http://localhost:6025/memory/agents/YOUR-ROLE"
echo "3. Check the task or question you need to work on"
echo "4. Follow the algorithm from AI_QUICK_START.md"
echo ""
echo -e "${CYAN}💡 Remember: 'If it works - don't fix it!'${NC}"