#!/bin/bash
set -e

# Fix memory issues during build
export NODE_OPTIONS="--max-old-space-size=4096"

echo "🏗️ Building Beauty Platform for Production..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Build shared packages first
echo "🔨 Building shared packages..."
pnpm --filter @beauty-platform/database build
pnpm --filter @beauty/shared build
pnpm --filter @beauty-platform/ui build
pnpm --filter @beauty-platform/client-sdk build
pnpm --filter @beauty-platform/shared-middleware build

# Build backend services
echo "🚀 Building backend services..."
pnpm --filter @beauty-platform/auth-service build
pnpm --filter @beauty-platform/crm-api build
pnpm --filter beauty-platform-api-gateway build
pnpm --filter @beauty-platform/notification-service build
pnpm --filter @beauty-platform/payment-service build
pnpm --filter @beauty-platform/images-api build
pnpm --filter @beauty-platform/backup-service build
# pnpm --filter services/monitoring build  # Disabled: Docker context too large (1.7GB)

# Build frontend apps
echo "🎨 Building frontend apps..."
pnpm --filter salon-crm build
pnpm --filter admin-panel build
pnpm --filter client-booking build
pnpm --filter landing-page build

echo "✅ All builds completed successfully!"
