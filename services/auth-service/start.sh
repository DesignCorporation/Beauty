#!/bin/bash

# Beauty Platform Auth Service Startup Script
# Direct npm/tsx execution (no PM2)

echo "🔐 Starting Beauty Platform Auth Service..."

# Environment variables
export NODE_ENV=production
export PORT=6021
export JWT_SECRET="your-super-secret-jwt-key-change-in-production-beauty-platform-2025"
export JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production-beauty-platform-2025"
export DATABASE_URL="postgresql://beauty_platform_user:beauty_platform_2025@localhost:5432/beauty_platform_new"

cd /root/beauty-platform/services/auth-service

# Check dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Build if needed
echo "🔨 Building TypeScript..."
pnpm run build

# Kill existing processes
echo "🛑 Stopping existing Auth Service..."
pkill -f "tsx.*auth-service" 2>/dev/null || true
pkill -f "auth-service.*tsx" 2>/dev/null || true
sleep 2

# Start service
echo "🚀 Starting Auth Service..."
./run.sh &

# Health check
sleep 3
if curl -f -s http://localhost:6021/health > /dev/null; then
    echo "✅ Auth Service started successfully!"
    echo "🔗 Health check: http://localhost:6021/health"
else
    echo "❌ Auth Service failed to start!"
    exit 1
fi
