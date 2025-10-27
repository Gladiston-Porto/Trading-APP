#!/bin/bash

################################################################################
# TRADING APP - DEPLOYMENT SCRIPT
# 
# Purpose: Deploy application to production environment
# Usage: ./deploy.sh [environment] [version]
# 
# Examples:
#   ./deploy.sh production 1.0.0
#   ./deploy.sh staging latest
#   ./deploy.sh production --rollback
################################################################################

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_NAME="trading-app-frontend"
DOCKER_USERNAME="${DOCKER_USERNAME:-}"
DOCKER_TOKEN="${DOCKER_TOKEN:-}"
REGISTRY="${DOCKER_REGISTRY:-docker.io}"

# Default values
ENVIRONMENT="${1:-production}"
VERSION="${2:-latest}"
DRY_RUN="${DRY_RUN:-false}"
VERBOSE="${VERBOSE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# FUNCTIONS
# ============================================================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

run_command() {
    local cmd="$1"
    local description="${2:-Running command}"
    
    log "$description"
    log "Command: $cmd"
    
    if [ "$DRY_RUN" = "true" ]; then
        log "[DRY RUN] Would execute: $cmd"
        return 0
    fi
    
    if [ "$VERBOSE" = "true" ]; then
        eval "$cmd"
    else
        eval "$cmd" 2>&1 | tail -5 || return 1
    fi
}

# ============================================================================
# PRE-DEPLOYMENT CHECKS
# ============================================================================

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check environment variables
    if [ -z "$DOCKER_USERNAME" ]; then
        error "DOCKER_USERNAME environment variable not set"
        exit 1
    fi
    
    if [ -z "$DOCKER_TOKEN" ]; then
        error "DOCKER_TOKEN environment variable not set"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# ============================================================================
# DOCKER LOGIN
# ============================================================================

docker_login() {
    log "Logging in to Docker registry..."
    
    if [ "$DRY_RUN" = "true" ]; then
        log "[DRY RUN] Would login to Docker registry"
        return 0
    fi
    
    echo "$DOCKER_TOKEN" | docker login -u "$DOCKER_USERNAME" --password-stdin "$REGISTRY"
    success "Docker login successful"
}

# ============================================================================
# PULL LATEST IMAGE
# ============================================================================

pull_image() {
    log "Pulling latest Docker image..."
    
    local image="${REGISTRY}/${DOCKER_USERNAME}/${APP_NAME}:${VERSION}"
    run_command "docker pull $image" "Pulling image: $image"
    success "Image pulled successfully: $image"
}

# ============================================================================
# BACKUP CURRENT DEPLOYMENT
# ============================================================================

backup_deployment() {
    log "Creating backup of current deployment..."
    
    local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
    
    if [ "$DRY_RUN" = "true" ]; then
        log "[DRY RUN] Would backup to: $backup_dir"
        return 0
    fi
    
    mkdir -p "$backup_dir"
    
    # Backup docker-compose file
    if [ -f "docker-compose.production.yml" ]; then
        cp docker-compose.production.yml "$backup_dir/"
    fi
    
    # Backup environment file
    if [ -f ".env.production" ]; then
        cp .env.production "$backup_dir/"
    fi
    
    # Export running containers
    docker-compose -f docker-compose.production.yml ps > "$backup_dir/containers.log" 2>&1 || true
    
    log "Backup created at: $backup_dir"
    success "Backup completed"
}

# ============================================================================
# STOP RUNNING CONTAINERS
# ============================================================================

stop_services() {
    log "Stopping running services..."
    
    if ! docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
        warning "No running containers found"
        return 0
    fi
    
    run_command "docker-compose -f docker-compose.production.yml stop" "Stopping services"
    success "Services stopped"
}

# ============================================================================
# START NEW DEPLOYMENT
# ============================================================================

start_services() {
    log "Starting new deployment..."
    
    # Load environment variables
    if [ -f ".env.production" ]; then
        set -a
        source .env.production
        set +a
    fi
    
    # Export variables for docker-compose
    export DOCKER_USERNAME
    export IMAGE_TAG="$VERSION"
    export APP_VERSION="$VERSION"
    
    run_command "docker-compose -f docker-compose.production.yml up -d" "Starting services"
    success "Services started"
}

# ============================================================================
# HEALTH CHECK
# ============================================================================

health_check() {
    log "Performing health checks..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log "Health check attempt $attempt/$max_attempts"
        
        # Check container status
        if ! docker-compose -f docker-compose.production.yml ps frontend | grep -q "healthy"; then
            if [ $attempt -eq $max_attempts ]; then
                error "Container failed to become healthy"
                return 1
            fi
            warning "Container not healthy yet, waiting..."
            sleep 2
            ((attempt++))
            continue
        fi
        
        # Check HTTP endpoint
        if curl -sf http://localhost/health > /dev/null 2>&1; then
            success "Health check passed"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "HTTP health check failed"
            return 1
        fi
        
        sleep 2
        ((attempt++))
    done
    
    error "Health checks failed after $max_attempts attempts"
    return 1
}

# ============================================================================
# SMOKE TESTS
# ============================================================================

smoke_tests() {
    log "Running smoke tests..."
    
    local test_url="${TEST_URL:-http://localhost}"
    
    # Test homepage
    if ! curl -sf "$test_url/" > /dev/null; then
        error "Homepage test failed"
        return 1
    fi
    success "Homepage test passed"
    
    # Test health endpoint
    if ! curl -sf "$test_url/health" > /dev/null; then
        error "Health endpoint test failed"
        return 1
    fi
    success "Health endpoint test passed"
    
    return 0
}

# ============================================================================
# ROLLBACK FUNCTION
# ============================================================================

rollback() {
    log "Rolling back to previous deployment..."
    
    # Find latest backup
    local latest_backup=$(ls -td ./backups/*/ 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        error "No backup found to rollback"
        return 1
    fi
    
    warning "Rolling back to: $latest_backup"
    
    # Stop current services
    stop_services
    
    # Restore docker-compose file if exists
    if [ -f "${latest_backup}docker-compose.production.yml" ]; then
        cp "${latest_backup}docker-compose.production.yml" .
    fi
    
    # Restore environment if exists
    if [ -f "${latest_backup}.env.production" ]; then
        cp "${latest_backup}.env.production" .
    fi
    
    # Start services
    start_services
    
    # Verify
    if health_check; then
        success "Rollback successful"
        return 0
    else
        error "Rollback health check failed"
        return 1
    fi
}

# ============================================================================
# NOTIFICATION
# ============================================================================

notify() {
    local status="$1"
    local message="$2"
    
    if [ -z "$SLACK_WEBHOOK" ]; then
        return 0
    fi
    
    local emoji="✅"
    local color="good"
    
    if [ "$status" != "success" ]; then
        emoji="❌"
        color="danger"
    fi
    
    local payload=$(cat <<EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "$emoji Deployment $status - $APP_NAME",
            "text": "$message",
            "fields": [
                {"title": "Environment", "value": "$ENVIRONMENT", "short": true},
                {"title": "Version", "value": "$VERSION", "short": true},
                {"title": "Time", "value": "$(date -Iseconds)", "short": true}
            ]
        }
    ]
}
EOF
)
    
    curl -X POST -H 'Content-type: application/json' \
        --data "$payload" \
        "$SLACK_WEBHOOK" || warning "Failed to send Slack notification"
}

# ============================================================================
# DISPLAY STATUS
# ============================================================================

display_status() {
    log "Deployment status:"
    echo ""
    docker-compose -f docker-compose.production.yml ps
    echo ""
    docker stats --no-stream
}

# ============================================================================
# MAIN DEPLOYMENT FLOW
# ============================================================================

main() {
    log "Starting deployment of $APP_NAME"
    log "Environment: $ENVIRONMENT"
    log "Version: $VERSION"
    log "Dry Run: $DRY_RUN"
    echo ""
    
    # Handle rollback
    if [ "$VERSION" = "--rollback" ]; then
        log "Rollback mode enabled"
        if rollback; then
            notify "success" "Rollback completed successfully"
            display_status
            success "Rollback completed!"
            exit 0
        else
            notify "failed" "Rollback failed"
            error "Rollback failed!"
            exit 1
        fi
    fi
    
    # Normal deployment flow
    check_prerequisites
    docker_login
    backup_deployment
    pull_image
    stop_services
    start_services
    
    if ! health_check; then
        error "Health check failed!"
        notify "failed" "Health checks failed, rolling back..."
        rollback
        exit 1
    fi
    
    if ! smoke_tests; then
        error "Smoke tests failed!"
        notify "failed" "Smoke tests failed, rolling back..."
        rollback
        exit 1
    fi
    
    display_status
    notify "success" "Deployment completed successfully"
    success "Deployment completed successfully!"
}

# ============================================================================
# HELP
# ============================================================================

show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV       Target environment (production/staging)
    -v, --version VERSION       Docker image version to deploy
    --rollback                  Rollback to previous deployment
    --dry-run                   Simulate deployment without making changes
    --verbose                   Enable verbose output
    -h, --help                  Show this help message

EXAMPLES:
    $0 production 1.0.0
    $0 staging latest
    $0 production --rollback
    $0 --dry-run production 1.0.0

ENVIRONMENT VARIABLES:
    DOCKER_USERNAME             Docker Hub username
    DOCKER_TOKEN                Docker Hub access token
    DOCKER_REGISTRY             Docker registry (default: docker.io)
    SLACK_WEBHOOK               Slack webhook for notifications (optional)
    TEST_URL                    URL for smoke tests (default: http://localhost)
    DRY_RUN                     Enable dry run mode
    VERBOSE                     Enable verbose output

EOF
}

# ============================================================================
# PARSE ARGUMENTS
# ============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        --rollback)
            VERSION="--rollback"
            shift
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --verbose)
            VERBOSE="true"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# ============================================================================
# RUN MAIN
# ============================================================================

main
