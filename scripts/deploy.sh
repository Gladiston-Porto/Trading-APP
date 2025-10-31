#!/bin/bash

################################################################################
#                                                                              #
#  🚀 TRADING APP DEPLOY SCRIPT                                              #
#  Responsável por: Pull imagem, restart container, health checks             #
#                                                                              #
################################################################################

set -e

# ────────────────────────────────────────────────────────────────────────────
# CONFIGURAÇÕES
# ────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REGISTRY="${REGISTRY:-docker.io}"
IMAGE_NAME="${IMAGE_NAME:-gladistonporto/trading-app-frontend}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
ENVIRONMENT="${ENVIRONMENT:-production}"
CONTAINER_NAME="trading-app-${ENVIRONMENT}"
MAX_RETRIES=5
RETRY_DELAY=5

# ────────────────────────────────────────────────────────────────────────────
# CORES PARA OUTPUT
# ────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ────────────────────────────────────────────────────────────────────────────
# FUNÇÕES
# ────────────────────────────────────────────────────────────────────────────

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ────────────────────────────────────────────────────────────────────────────
# VALIDAR VARIÁVEIS
# ────────────────────────────────────────────────────────────────────────────

validate_environment() {
    log_info "Validando ambiente..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker não está instalado"
        exit 1
    fi

    log_success "Docker disponível"

    if [[ -z "$CONTAINER_NAME" ]]; then
        log_error "CONTAINER_NAME não definido"
        exit 1
    fi

    log_success "Variáveis validadas"
}

# ────────────────────────────────────────────────────────────────────────────
# PULL DA IMAGEM
# ────────────────────────────────────────────────────────────────────────────

pull_image() {
    log_info "Fazendo pull da imagem: $FULL_IMAGE"

    local retry_count=0

    while [ $retry_count -lt $MAX_RETRIES ]; do
        if docker pull "$FULL_IMAGE" 2>&1; then
            log_success "Imagem baixada com sucesso"
            return 0
        fi

        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $MAX_RETRIES ]; then
            log_warning "Tentativa $retry_count/$MAX_RETRIES falhou. Aguardando $RETRY_DELAY segundos..."
            sleep $RETRY_DELAY
        fi
    done

    log_error "Falha ao baixar imagem após $MAX_RETRIES tentativas"
    exit 1
}

# ────────────────────────────────────────────────────────────────────────────
# PARAR CONTAINER ANTIGO
# ────────────────────────────────────────────────────────────────────────────

stop_old_container() {
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "Parando container antigo: $CONTAINER_NAME"

        docker stop "$CONTAINER_NAME" || true
        docker rm "$CONTAINER_NAME" || true

        log_success "Container antigo removido"
    else
        log_info "Nenhum container anterior para remover"
    fi
}

# ────────────────────────────────────────────────────────────────────────────
# INICIAR NOVO CONTAINER
# ────────────────────────────────────────────────────────────────────────────

start_new_container() {
    log_info "Iniciando novo container: $CONTAINER_NAME"

    local port
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        port="3002"
    else
        port="3001"
    fi

    docker run -d \
        --name "$CONTAINER_NAME" \
        --restart unless-stopped \
        -p "${port}:80" \
        -e "NODE_ENV=$ENVIRONMENT" \
        --healthcheck-cmd='wget --quiet --tries=1 --spider http://localhost/ || exit 1' \
        --healthcheck-interval=10s \
        --healthcheck-timeout=5s \
        --healthcheck-retries=3 \
        --healthcheck-start-period=5s \
        "$FULL_IMAGE"

    log_success "Container iniciado com ID: $(docker ps --filter "name=$CONTAINER_NAME" -q | head -c 12)"
}

# ────────────────────────────────────────────────────────────────────────────
# HEALTH CHECKS
# ────────────────────────────────────────────────────────────────────────────

wait_for_health() {
    log_info "Aguardando container ficar saudável..."

    local retry_count=0
    local max_wait=30

    while [ $retry_count -lt $max_wait ]; do
        local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "none")

        if [[ "$health_status" == "healthy" ]]; then
            log_success "Container está SAUDÁVEL"
            return 0
        fi

        if [[ "$health_status" == "unhealthy" ]]; then
            log_error "Container está INSA SAUDÁVEL"
            docker logs "$CONTAINER_NAME" | tail -20
            exit 1
        fi

        retry_count=$((retry_count + 1))
        echo -n "."
        sleep 1
    done

    log_warning "Timeout aguardando health check (continuando mesmo assim...)"
}

# ────────────────────────────────────────────────────────────────────────────
# VERIFICAR ENDPOINT
# ────────────────────────────────────────────────────────────────────────────

verify_endpoint() {
    local port
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        port="3002"
    else
        port="3001"
    fi

    log_info "Verificando endpoint: http://localhost:${port}"

    local retry_count=0
    local max_retries=10

    while [ $retry_count -lt $max_retries ]; do
        if curl -s -f "http://localhost:${port}" > /dev/null 2>&1; then
            log_success "Endpoint respondendo em http://localhost:${port}"
            return 0
        fi

        retry_count=$((retry_count + 1))
        echo -n "."
        sleep 2
    done

    log_warning "Timeout verificando endpoint (continuando...)"
}

# ────────────────────────────────────────────────────────────────────────────
# CLEANUP (EM CASO DE ERRO)
# ────────────────────────────────────────────────────────────────────────────

cleanup() {
    local exit_code=$?

    if [ $exit_code -ne 0 ]; then
        log_error "Deploy falhou com código $exit_code"
        log_info "Limpando recursos..."

        if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
            docker stop "$CONTAINER_NAME" 2>/dev/null || true
            docker rm "$CONTAINER_NAME" 2>/dev/null || true
        fi
    fi

    exit $exit_code
}

trap cleanup EXIT

# ────────────────────────────────────────────────────────────────────────────
# MAIN FLOW
# ────────────────────────────────────────────────────────────────────────────

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║          🚀 DEPLOY: $ENVIRONMENT                              ║"
    echo "║     Image: $IMAGE_NAME:$IMAGE_TAG        ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    validate_environment
    pull_image
    stop_old_container
    start_new_container
    wait_for_health
    verify_endpoint

    echo ""
    log_success "╔════════════════════════════════════════════════════════════╗"
    log_success "║              ✅ DEPLOY COMPLETADO COM SUCESSO!            ║"
    log_success "╚════════════════════════════════════════════════════════════╝"
    echo ""

    if [[ "$ENVIRONMENT" == "staging" ]]; then
        echo "📦 Aplicação disponível em: http://localhost:3002"
    else
        echo "📦 Aplicação disponível em: http://localhost:3001"
    fi

    echo ""
}

main "$@"
