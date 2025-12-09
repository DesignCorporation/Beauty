#!/bin/bash

# BEAUTY PLATFORM - PRODUCTION STARTUP SCRIPT
# Enterprise-grade system startup with health checks and rollback

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.production.yml"
MAX_STARTUP_TIME=300 # 5 minutes
HEALTH_CHECK_INTERVAL=10
LOG_FILE="/var/log/beauty-platform-startup.log"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Backup current system state
backup_current_state() {
    log_info "Creating system state backup..."
    
    BACKUP_DIR="/var/backups/beauty-platform/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup PM2 processes
    pm2 save &> /dev/null || true
    cp ~/.pm2/dump.pm2 "$BACKUP_DIR/pm2-processes.json" 2>/dev/null || true
    
    # Export current container states
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" > "$BACKUP_DIR/containers-before.txt" 2>/dev/null || true
    
    # Backup environment files
    find "$PROJECT_DIR" -name ".env*" -type f -exec cp {} "$BACKUP_DIR/" \; 2>/dev/null || true
    
    log_success "Backup created: $BACKUP_DIR"
    echo "$BACKUP_DIR" > /tmp/beauty-platform-backup-path
}

# Stop existing PM2 processes gracefully
stop_pm2_processes() {
    log_info "Stopping PM2 processes..."
    
    # List of PM2 processes to stop
    PM2_PROCESSES=(
        "beauty-auth-service"
        "beauty-api-gateway-6020"
        "beauty-admin-panel-6002"
        "beauty-crm-api-6022"
    )
    
    for process in "${PM2_PROCESSES[@]}"; do
        if pm2 show "$process" &> /dev/null; then
            log_info "Stopping PM2 process: $process"
            pm2 stop "$process" &> /dev/null || true
        fi
    done
    
    # Wait for graceful shutdown
    sleep 5
    
    log_success "PM2 processes stopped"
}

# Prepare environment
prepare_environment() {
    log_info "Preparing environment..."
    
    cd "$PROJECT_DIR"
    
    # Create necessary directories
    mkdir -p logs/auth-service
    mkdir -p logs/api-gateway
    mkdir -p logs/monitoring
    mkdir -p data/postgres
    mkdir -p data/redis
    
    # Set correct permissions
    chown -R "$USER:$USER" logs/
    chmod -R 755 logs/
    
    # Create environment file if not exists
    if [ ! -f "$PROJECT_DIR/.env.production" ]; then
        log_warning "Creating default .env.production file"
        cat > "$PROJECT_DIR/.env.production" << EOF
# Beauty Platform Production Environment
NODE_ENV=production
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID:-}

# Database
POSTGRES_DB=beauty_platform_new
POSTGRES_USER=beauty_platform_user
POSTGRES_PASSWORD=beauty_platform_2025

# JWT Secrets
JWT_SECRET=beauty-platform-super-secret-jwt-key-2025-production-grade
JWT_REFRESH_SECRET=beauty-platform-refresh-secret-key-2025-secure
MFA_MASTER_KEY=49dd29bc186073af4bdb05f6fd074317a6045409f1ef540696ed05ad09b38c1b
EOF
    fi
    
    log_success "Environment prepared"
}

# Build and start containers
start_containers() {
    log_info "Starting Docker containers..."
    
    cd "$PROJECT_DIR"
    
    # Load environment
    export $(cat .env.production | grep -v '^#' | xargs) 2>/dev/null || true
    
    # Pull latest images and build
    log_info "Pulling base images..."
    docker-compose -f "$COMPOSE_FILE" pull --ignore-pull-failures
    
    log_info "Building application images..."
    docker-compose -f "$COMPOSE_FILE" build --parallel
    
    # Start services in order
    log_info "Starting database layer..."
    docker-compose -f "$COMPOSE_FILE" up -d postgres-primary pgbouncer
    
    sleep 10
    
    log_info "Starting Redis..."
    docker-compose -f "$COMPOSE_FILE" up -d redis
    
    sleep 5
    
    log_info "Starting Auth services..."
    docker-compose -f "$COMPOSE_FILE" up -d auth-service-1 auth-service-2
    
    sleep 15
    
    log_info "Starting load balancer..."
    docker-compose -f "$COMPOSE_FILE" up -d nginx-auth-lb
    
    sleep 5
    
    log_info "Starting API Gateway..."
    docker-compose -f "$COMPOSE_FILE" up -d api-gateway
    
    sleep 5
    
    log_info "Starting monitoring..."
    docker-compose -f "$COMPOSE_FILE" up -d health-monitor
    
    sleep 5
    
    log_info "Starting remaining services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    log_success "All containers started"
}

# Health check function
check_service_health() {
    local service_name="$1"
    local health_url="$2"
    local max_attempts="${3:-30}"
    local interval="${4:-10}"
    
    log_info "Checking health of $service_name..."
    
    for ((i=1; i<=max_attempts; i++)); do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            log_success "$service_name is healthy"
            return 0
        fi
        
        if [ $i -lt $max_attempts ]; then
            log_info "Attempt $i/$max_attempts failed, retrying in ${interval}s..."
            sleep "$interval"
        fi
    done
    
    log_error "$service_name health check failed after $max_attempts attempts"
    return 1
}

# Wait for all services to be healthy
wait_for_healthy_services() {
    log_info "Waiting for services to become healthy..."
    
    local services=(
        "Database:http://localhost:5432"
        "Redis:http://localhost:6379" 
        "Auth Load Balancer:http://localhost:6021/health"
        "API Gateway:http://localhost:6020/health"
        "Health Monitor:http://localhost:6030/health"
    )
    
    local failed_services=()
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r service_name service_url <<< "$service_info"
        
        if ! check_service_health "$service_name" "$service_url"; then
            failed_services+=("$service_name")
        fi
    done
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        log_success "All services are healthy!"
        return 0
    else
        log_error "Failed services: ${failed_services[*]}"
        return 1
    fi
}

# Test critical functionality
test_critical_functionality() {
    log_info "Testing critical functionality..."
    
    # Test Auth Service health
    if ! curl -f -s "http://localhost:6021/health" > /dev/null; then
        log_error "Auth Service health endpoint failed"
        return 1
    fi
    
    # Test API Gateway
    if ! curl -f -s "http://localhost:6020/health" > /dev/null; then
        log_error "API Gateway health endpoint failed"
        return 1
    fi
    
    # Test load balancer stats
    if ! curl -f -s "http://localhost:6021/lb-stats" > /dev/null; then
        log_error "Load balancer stats failed"
        return 1
    fi
    
    log_success "Critical functionality tests passed"
    return 0
}

# Rollback function
rollback() {
    log_error "ROLLING BACK TO PREVIOUS STATE"
    
    # Stop all new containers
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" down --timeout 30 || true
    
    # Restore PM2 processes if backup exists
    if [ -f /tmp/beauty-platform-backup-path ]; then
        BACKUP_PATH=$(cat /tmp/beauty-platform-backup-path)
        if [ -f "$BACKUP_PATH/pm2-processes.json" ]; then
            log_info "Restoring PM2 processes..."
            cp "$BACKUP_PATH/pm2-processes.json" ~/.pm2/dump.pm2
            pm2 resurrect
        fi
    fi
    
    log_error "Rollback completed"
}

# Send status notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
        local emoji="🚀"
        [ "$status" = "error" ] && emoji="🚨"
        [ "$status" = "warning" ] && emoji="⚠️"
        
        curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
            -d "chat_id=$TELEGRAM_CHAT_ID" \
            -d "text=$emoji Beauty Platform Production Startup
            
Status: $status
Message: $message
Time: $(date)
Server: $(hostname)" \
            > /dev/null 2>&1 || true
    fi
}

# Main startup function
main() {
    log_info "🚀 Starting Beauty Platform Production System"
    log_info "=============================================="
    
    # Trap errors for rollback
    trap 'log_error "Startup failed, initiating rollback..."; rollback; send_notification "error" "Startup failed - system rolled back"; exit 1' ERR
    
    # Run startup steps
    check_prerequisites
    backup_current_state
    stop_pm2_processes
    prepare_environment
    start_containers
    
    # Wait for services to be ready
    log_info "Waiting for services to initialize..."
    sleep 30
    
    # Health checks
    if wait_for_healthy_services && test_critical_functionality; then
        log_success "🎉 BEAUTY PLATFORM STARTUP SUCCESSFUL!"
        log_success "============================================"
        log_info "Services running:"
        log_info "• Auth Service (Load Balanced): http://localhost:6021"
        log_info "• API Gateway: http://localhost:6020"
        log_info "• Health Monitor: http://localhost:6030"
        log_info "• Admin Panel: http://localhost:6002"
        log_info "• System Status: http://localhost:6030/system-health"
        
        send_notification "success" "All services started successfully and passed health checks"
        
        # Show container status
        echo ""
        log_info "Container Status:"
        docker-compose -f "$COMPOSE_FILE" ps
        
    else
        log_error "Health checks failed!"
        send_notification "error" "Services started but health checks failed"
        exit 1
    fi
}

# Handle script arguments
case "${1:-start}" in
    "start")
        main
        ;;
    "stop")
        log_info "Stopping Beauty Platform..."
        cd "$PROJECT_DIR"
        docker-compose -f "$COMPOSE_FILE" down --timeout 30
        log_success "Beauty Platform stopped"
        ;;
    "restart")
        log_info "Restarting Beauty Platform..."
        cd "$PROJECT_DIR"
        docker-compose -f "$COMPOSE_FILE" down --timeout 30
        sleep 5
        main
        ;;
    "status")
        cd "$PROJECT_DIR"
        docker-compose -f "$COMPOSE_FILE" ps
        ;;
    "logs")
        cd "$PROJECT_DIR"
        docker-compose -f "$COMPOSE_FILE" logs -f "${2:-}"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs [service]}"
        exit 1
        ;;
esac