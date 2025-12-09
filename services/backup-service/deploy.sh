#!/bin/bash

# Beauty Platform Backup Service - Deployment Script

set -e

echo "🔧 Beauty Platform Backup Service - Deployment"
echo "============================================="

# Configuration
SERVICE_NAME="backup-service"
SERVICE_DIR="/root/beauty-platform/services/backup-service"
PORT=6027

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    error "package.json not found. Please run this script from the backup-service directory."
fi

log "Starting deployment process..."

# 1. Install dependencies
log "Installing dependencies..."
pnpm install

# 2. Build TypeScript
log "Building TypeScript..."
pnpm run build

# 3. Check if backup script exists
log "Checking backup script..."
if [ ! -f "/root/SCRIPTS/production-backup.sh" ]; then
    error "Production backup script not found at /root/SCRIPTS/production-backup.sh"
fi

# 4. Check backup directory
log "Checking backup directory..."
if [ ! -d "/root/BACKUPS/production" ]; then
    warn "Backup directory not found, creating..."
    mkdir -p /root/BACKUPS/production
fi

# 5. Create log directories
log "Creating log directories..."
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# 6. Check JWT secret
log "Checking environment configuration..."
if [ ! -f ".env" ]; then
    warn ".env file not found, creating from template..."
    cp .env.example .env 2>/dev/null || warn "No .env.example found"
fi

# 7. Stop existing service if running
log "Stopping existing service..."
pm2 delete $SERVICE_NAME 2>/dev/null || log "Service was not running"

# 8. Start service with PM2
log "Starting service with PM2..."
pm2 start ecosystem.config.js --env production

# 9. Save PM2 configuration
log "Saving PM2 configuration..."
pm2 save

# 10. Setup PM2 startup
log "Setting up PM2 startup..."
pm2 startup | grep -E "^sudo" | bash || warn "PM2 startup setup failed"

# 11. Wait for service to start
log "Waiting for service to start..."
sleep 5

# 12. Test service
log "Testing service..."
if curl -f "http://localhost:$PORT/health" > /dev/null 2>&1; then
    log "✅ Service is responding on port $PORT"
else
    error "❌ Service is not responding on port $PORT"
fi

# 13. Show service status
log "Service status:"
pm2 status $SERVICE_NAME

# 14. Show logs
log "Recent logs:"
pm2 logs $SERVICE_NAME --lines 10 --nostream

echo ""
log "🎉 Backup Service deployment completed successfully!"
echo ""
echo "📡 Health check: http://135.181.156.117:$PORT/health"
echo "🔧 API endpoints: http://135.181.156.117:$PORT/api/backup/*"
echo "🔌 WebSocket: ws://135.181.156.117:$PORT/backup-ws"
echo ""
echo "Commands:"
echo "  pm2 status $SERVICE_NAME     - Check service status"
echo "  pm2 logs $SERVICE_NAME       - View logs"
echo "  pm2 restart $SERVICE_NAME    - Restart service"
echo "  pm2 stop $SERVICE_NAME       - Stop service"
echo ""