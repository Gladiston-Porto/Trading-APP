#!/bin/bash

################################################################################
# DOCKER HUB PUSH AUTOMATION SCRIPT
# Purpose: Automate Docker image push to Docker Hub registry
# Version: 1.0.0
# Author: Trading App Team
################################################################################

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

DOCKER_USERNAME="${DOCKER_USERNAME:-}"
IMAGE_VERSION="${IMAGE_VERSION:-1.0.0}"
IMAGE_NAME="${IMAGE_NAME:-trading-app-frontend}"
LOCAL_IMAGE_NAME="trading-app-frontend:latest"
DRY_RUN="${DRY_RUN:-false}"
VERBOSE="${VERBOSE:-false}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================================
# FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_step() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}[STEP]${NC} $1"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

verbose_log() {
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

# Display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

OPTIONS:
    -u, --username USERNAME      Docker Hub username (required)
    -v, --version VERSION        Image version (default: 1.0.0)
    -n, --image-name NAME        Image name (default: trading-app-frontend)
    -d, --dry-run               Run without actual push
    --verbose                   Enable verbose logging
    -h, --help                  Show this help message

EXAMPLES:
    # Push with default version (1.0.0)
    $0 -u gladpros

    # Push with specific version
    $0 -u gladpros -v 2.0.0

    # Dry-run mode (no actual push)
    $0 -u gladpros --dry-run

    # Verbose logging
    $0 -u gladpros --verbose

ENVIRONMENT VARIABLES:
    DOCKER_USERNAME             Docker Hub username
    IMAGE_VERSION               Image version tag
    IMAGE_NAME                  Image name
    DRY_RUN                     Enable dry-run mode (true/false)
    VERBOSE                     Enable verbose logging (true/false)

EOF
    exit 0
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -u|--username)
                DOCKER_USERNAME="$2"
                shift 2
                ;;
            -v|--version)
                IMAGE_VERSION="$2"
                shift 2
                ;;
            -n|--image-name)
                IMAGE_NAME="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN="true"
                shift
                ;;
            --verbose)
                VERBOSE="true"
                shift
                ;;
            -h|--help)
                usage
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                ;;
        esac
    done
}

# Check prerequisites
check_prerequisites() {
    log_step "Verificando Pré-requisitos"

    # Check Docker installation
    if ! command -v docker &> /dev/null; then
        log_error "Docker não está instalado. Instale em: https://docker.com"
        exit 1
    fi
    log_success "Docker está instalado"

    # Check Docker daemon
    if ! docker ps &> /dev/null; then
        log_error "Docker daemon não está rodando. Inicie o Docker Desktop."
        exit 1
    fi
    log_success "Docker daemon está rodando"

    # Check username
    if [ -z "$DOCKER_USERNAME" ]; then
        log_error "Docker Hub username não foi definido"
        echo ""
        echo "Use uma das seguintes opções:"
        echo "  1. Passe como argumento: $0 -u seu_username"
        echo "  2. Defina variável: export DOCKER_USERNAME=seu_username"
        exit 1
    fi
    log_success "Docker Hub username definido: $DOCKER_USERNAME"

    # Check local image
    if ! docker image inspect "$LOCAL_IMAGE_NAME" &> /dev/null; then
        log_error "Imagem local '$LOCAL_IMAGE_NAME' não encontrada"
        log_info "Imagens disponíveis:"
        docker images
        exit 1
    fi
    log_success "Imagem local encontrada: $LOCAL_IMAGE_NAME"

    # Get image info
    local IMAGE_ID=$(docker image inspect "$LOCAL_IMAGE_NAME" -f '{{.ID}}' | cut -d: -f2 | cut -c1-12)
    local IMAGE_SIZE=$(docker image inspect "$LOCAL_IMAGE_NAME" -f '{{.Size}}' | numfmt --to=iec 2>/dev/null || docker image inspect "$LOCAL_IMAGE_NAME" -f '{{.Size}}')
    log_info "Image ID: $IMAGE_ID"
    log_info "Image Size: $IMAGE_SIZE"

    verbose_log "Username: $DOCKER_USERNAME"
    verbose_log "Version: $IMAGE_VERSION"
    verbose_log "Image Name: $IMAGE_NAME"
}

# Display configuration
display_config() {
    log_step "Configuração"

    cat << EOF

${CYAN}Configurações:${NC}
  Docker Hub Username: ${YELLOW}$DOCKER_USERNAME${NC}
  Image Name:          ${YELLOW}$IMAGE_NAME${NC}
  Image Version:       ${YELLOW}$IMAGE_VERSION${NC}
  Local Image:         ${YELLOW}$LOCAL_IMAGE_NAME${NC}
  Registry:            ${YELLOW}docker.io${NC}
  
${CYAN}Tags que serão criadas:${NC}
  1. ${YELLOW}$DOCKER_USERNAME/$IMAGE_NAME:$IMAGE_VERSION${NC}
  2. ${YELLOW}$DOCKER_USERNAME/$IMAGE_NAME:latest${NC}

${CYAN}Modo:${NC}
  $([ "$DRY_RUN" = "true" ] && echo "${YELLOW}DRY RUN (sem push real)${NC}" || echo "${GREEN}PUSH REAL${NC}")

EOF

    if [ "$DRY_RUN" = "true" ]; then
        log_warning "DRY RUN MODE ATIVADO - Nenhum push será realizado"
    fi
}

# Check Docker Hub login
check_docker_login() {
    log_step "Verificando Login no Docker Hub"

    if docker login --username "$DOCKER_USERNAME" --password-stdin <<< "" 2>/dev/null; then
        log_success "Usuário já está autenticado"
    else
        log_info "Faça login no Docker Hub"
        docker login
        if [ $? -ne 0 ]; then
            log_error "Falha ao fazer login"
            exit 1
        fi
        log_success "Login realizado com sucesso"
    fi
}

# Tag local image
tag_image() {
    log_step "Criando Tags da Imagem"

    local VERSIONED_IMAGE="$DOCKER_USERNAME/$IMAGE_NAME:$IMAGE_VERSION"
    local LATEST_IMAGE="$DOCKER_USERNAME/$IMAGE_NAME:latest"

    verbose_log "Tagging: $LOCAL_IMAGE_NAME → $VERSIONED_IMAGE"
    if [ "$DRY_RUN" != "true" ]; then
        docker tag "$LOCAL_IMAGE_NAME" "$VERSIONED_IMAGE"
        if [ $? -ne 0 ]; then
            log_error "Falha ao criar tag com versão"
            exit 1
        fi
    fi
    log_success "Tag criada: $VERSIONED_IMAGE"

    verbose_log "Tagging: $LOCAL_IMAGE_NAME → $LATEST_IMAGE"
    if [ "$DRY_RUN" != "true" ]; then
        docker tag "$LOCAL_IMAGE_NAME" "$LATEST_IMAGE"
        if [ $? -ne 0 ]; then
            log_error "Falha ao criar tag 'latest'"
            exit 1
        fi
    fi
    log_success "Tag criada: $LATEST_IMAGE"

    log_info "Mostrando tags locais:"
    docker images | grep "$IMAGE_NAME" | head -5
}

# Push image
push_image() {
    log_step "Fazendo Push da Imagem"

    local VERSIONED_IMAGE="$DOCKER_USERNAME/$IMAGE_NAME:$IMAGE_VERSION"
    local LATEST_IMAGE="$DOCKER_USERNAME/$IMAGE_NAME:latest"

    if [ "$DRY_RUN" = "true" ]; then
        log_warning "DRY RUN: Não fazendo push real"
        verbose_log "Command: docker push $VERSIONED_IMAGE"
        verbose_log "Command: docker push $LATEST_IMAGE"
        log_success "Dry-run concluído (sem modificações)"
        return
    fi

    log_info "Fazendo push da versão $IMAGE_VERSION..."
    verbose_log "Command: docker push $VERSIONED_IMAGE"
    if ! docker push "$VERSIONED_IMAGE"; then
        log_error "Falha ao fazer push da versão"
        exit 1
    fi
    log_success "Push da versão concluído: $VERSIONED_IMAGE"

    log_info "Fazendo push da tag 'latest'..."
    verbose_log "Command: docker push $LATEST_IMAGE"
    if ! docker push "$LATEST_IMAGE"; then
        log_error "Falha ao fazer push da tag latest"
        exit 1
    fi
    log_success "Push da tag 'latest' concluído: $LATEST_IMAGE"
}

# Verify push
verify_push() {
    log_step "Verificando Push no Docker Hub"

    local HUB_URL="https://hub.docker.com/r/$DOCKER_USERNAME/$IMAGE_NAME"

    if [ "$DRY_RUN" = "true" ]; then
        log_warning "DRY RUN: Pulando verificação"
        return
    fi

    log_info "Verificando imagem no Docker Hub..."
    log_info "URL: ${YELLOW}$HUB_URL${NC}"

    # Tenta fazer pull para verificar
    log_info "Testando pull da imagem..."
    verbose_log "Command: docker pull $DOCKER_USERNAME/$IMAGE_NAME:$IMAGE_VERSION"
    
    if docker pull "$DOCKER_USERNAME/$IMAGE_NAME:$IMAGE_VERSION" &> /dev/null; then
        log_success "Pull teste bem-sucedido"
    else
        log_warning "Pull teste falhou (pode ser problema de conectividade)"
    fi

    log_info "Para verificar manualmente, acesse:"
    echo -e "  ${CYAN}${HUB_URL}${NC}"
}

# Display summary
display_summary() {
    local STATUS="SUCESSO"
    if [ "$DRY_RUN" = "true" ]; then
        STATUS="DRY RUN CONCLUÍDO"
    fi

    cat << EOF

${GREEN}╔════════════════════════════════════════════════════════════╗${NC}
${GREEN}║            ✨ DOCKER HUB PUSH $STATUS ✨                 ║${NC}
${GREEN}╚════════════════════════════════════════════════════════════╝${NC}

${CYAN}Resumo:${NC}

  Imagem:          ${YELLOW}$DOCKER_USERNAME/$IMAGE_NAME${NC}
  Versão:          ${YELLOW}$IMAGE_VERSION${NC}
  Tags:            ${YELLOW}2 (version + latest)${NC}
  Status:          ${GREEN}✓ Concluído${NC}

${CYAN}Próximos Passos:${NC}

  1. Verificar no Docker Hub:
     ${CYAN}https://hub.docker.com/r/$DOCKER_USERNAME/$IMAGE_NAME${NC}

  2. Próxima fase (Phase 2):
     Configure GitHub Secrets para CI/CD

  3. Ou faça pull localmente:
     ${CYAN}docker pull $DOCKER_USERNAME/$IMAGE_NAME:$IMAGE_VERSION${NC}

${CYAN}Referência:${NC}

  Documentation: ${CYAN}FASE_3_2_DOCKER_HUB_PUSH.md${NC}
  Next Phase:    ${CYAN}FASE_3_2_GITHUB_SECRETS.md${NC}

EOF
}

# Main function
main() {
    clear

    cat << EOF
╔════════════════════════════════════════════════════════════════════╗
║         DOCKER HUB PUSH - AUTOMATION SCRIPT                        ║
║         Phase 1: Docker Registry Integration                       ║
║         Version: 1.0.0                                             ║
╚════════════════════════════════════════════════════════════════════╝

EOF

    parse_args "$@"
    check_prerequisites
    display_config
    check_docker_login
    tag_image
    push_image
    verify_push
    display_summary
}

# Run main function
main "$@"
