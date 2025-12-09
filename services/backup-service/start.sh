#!/bin/bash

# Beauty Platform Backup Service - Quick Start Script

set -e

echo "🔧 Beauty Platform Backup Service - Quick Start"
echo "==============================================="

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the backup-service directory."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Build if needed
if [ ! -d "dist" ]; then
    echo "🔨 Building TypeScript..."
    pnpm run build
fi

# Check environment
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found, using defaults..."
fi

# Start in development mode
echo "🚀 Starting Backup Service in development mode..."
echo "📡 Health check will be available at: http://localhost:6027/health"
echo "🔧 API endpoints at: http://localhost:6027/api/backup/*"
echo "🔌 WebSocket at: ws://localhost:6027/backup-ws"
echo ""
echo "Press Ctrl+C to stop the service"
echo ""

pnpm run dev