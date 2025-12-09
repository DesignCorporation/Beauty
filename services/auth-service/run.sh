#!/bin/bash

# Load environment variables from .env file (ignore comments)
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

# Fallback environment variables (if .env is missing)
export JWT_SECRET="${JWT_SECRET:-beauty-platform-super-secret-jwt-key-2025-production-grade}"
export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-beauty-platform-refresh-secret-key-2025-secure}"
export DATABASE_URL="${DATABASE_URL:-postgresql://beauty_platform_user:beauty_platform_2025@localhost:5432/beauty_platform_new}"
export NODE_ENV="${NODE_ENV:-development}"
export PORT="${PORT:-6021}"
export MFA_MASTER_KEY="${MFA_MASTER_KEY:-49dd29bc186073af4bdb05f6fd074317a6045409f1ef540696ed05ad09b38c1b}"

echo "🚀 Starting Beauty Auth Service with environment:"
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"
echo "MFA_MASTER_KEY: ${MFA_MASTER_KEY:0:16}..." # Show only first 16 chars for security

npx tsx src/server.ts