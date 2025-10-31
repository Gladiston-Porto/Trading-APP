#!/bin/bash

################################################################################
#                                                                              #
#  🔐 SETUP GITHUB SECRETS - Interactive Script                              #
#  Esse script vai configurar automaticamente os 5 secrets necessários        #
#                                                                              #
################################################################################

set -e

# ────────────────────────────────────────────────────────────────────────────
# CORES
# ────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ────────────────────────────────────────────────────────────────────────────
# FUNCTIONS
# ────────────────────────────────────────────────────────────────────────────

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_section() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

# ────────────────────────────────────────────────────────────────────────────
# CHECK DEPENDENCIES
# ────────────────────────────────────────────────────────────────────────────

check_dependencies() {
    log_section "Verificando dependências..."

    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) não está instalado"
        echo "Instale com: brew install gh"
        exit 1
    fi

    log_success "GitHub CLI disponível"

    if ! gh auth status &> /dev/null; then
        log_error "Não autenticado no GitHub"
        echo "Execute: gh auth login"
        exit 1
    fi

    log_success "Autenticado no GitHub"
}

# ────────────────────────────────────────────────────────────────────────────
# PREPARE VALUES
# ────────────────────────────────────────────────────────────────────────────

prepare_secrets() {
    log_section "Preparando valores dos secrets..."

    # Docker credentials
    log_info "Docker Hub credentials:"
    read -p "  Docker Username: " DOCKER_USERNAME
    read -sp "  Docker Token/Password: " DOCKER_PASSWORD
    echo ""

    # Deploy credentials
    log_info "Deploy SSH credentials:"
    read -p "  Deploy Host (localhost for dev): " DEPLOY_HOST
    read -p "  Deploy User (deploy or your user): " DEPLOY_USER
    read -p "  Deploy Port (22): " DEPLOY_PORT
    DEPLOY_PORT="${DEPLOY_PORT:-22}"

    # Deploy Key (Base64)
    log_info "Deploy Key (Base64):"
    log_warning "Cole a chave Base64 (Ctrl+D para terminar):"
    DEPLOY_KEY=$(cat)

    # Slack webhook (optional)
    read -p "Slack Webhook URL (optional, press Enter to skip): " SLACK_WEBHOOK_URL
}

# ────────────────────────────────────────────────────────────────────────────
# VALIDATE INPUTS
# ────────────────────────────────────────────────────────────────────────────

validate_inputs() {
    log_section "Validando inputs..."

    if [[ -z "$DOCKER_USERNAME" ]]; then
        log_error "Docker username vazio"
        exit 1
    fi

    if [[ -z "$DOCKER_PASSWORD" ]]; then
        log_error "Docker password vazio"
        exit 1
    fi

    if [[ -z "$DEPLOY_HOST" ]]; then
        log_error "Deploy host vazio"
        exit 1
    fi

    if [[ -z "$DEPLOY_USER" ]]; then
        log_error "Deploy user vazio"
        exit 1
    fi

    if [[ -z "$DEPLOY_KEY" ]]; then
        log_error "Deploy key vazio"
        exit 1
    fi

    log_success "Todos os valores válidos"
}

# ────────────────────────────────────────────────────────────────────────────
# CREATE SECRETS
# ────────────────────────────────────────────────────────────────────────────

create_secrets() {
    log_section "Criando secrets no GitHub..."

    local repo="Gladiston-Porto/Trading-APP"
    local failed=0

    # Secret 1
    log_info "Criando DOCKER_USERNAME..."
    if echo -n "$DOCKER_USERNAME" | gh secret set DOCKER_USERNAME -R "$repo" 2>&1; then
        log_success "DOCKER_USERNAME criado"
    else
        log_error "Falha ao criar DOCKER_USERNAME"
        failed=$((failed + 1))
    fi

    # Secret 2
    log_info "Criando DOCKER_PASSWORD..."
    if echo -n "$DOCKER_PASSWORD" | gh secret set DOCKER_PASSWORD -R "$repo" 2>&1; then
        log_success "DOCKER_PASSWORD criado"
    else
        log_error "Falha ao criar DOCKER_PASSWORD"
        failed=$((failed + 1))
    fi

    # Secret 3
    log_info "Criando DEPLOY_HOST..."
    if echo -n "$DEPLOY_HOST" | gh secret set DEPLOY_HOST -R "$repo" 2>&1; then
        log_success "DEPLOY_HOST criado"
    else
        log_error "Falha ao criar DEPLOY_HOST"
        failed=$((failed + 1))
    fi

    # Secret 4
    log_info "Criando DEPLOY_USER..."
    if echo -n "$DEPLOY_USER" | gh secret set DEPLOY_USER -R "$repo" 2>&1; then
        log_success "DEPLOY_USER criado"
    else
        log_error "Falha ao criar DEPLOY_USER"
        failed=$((failed + 1))
    fi

    # Secret 5
    log_info "Criando DEPLOY_PORT..."
    if echo -n "$DEPLOY_PORT" | gh secret set DEPLOY_PORT -R "$repo" 2>&1; then
        log_success "DEPLOY_PORT criado"
    else
        log_error "Falha ao criar DEPLOY_PORT"
        failed=$((failed + 1))
    fi

    # Secret 6
    log_info "Criando DEPLOY_KEY..."
    if echo -n "$DEPLOY_KEY" | gh secret set DEPLOY_KEY -R "$repo" 2>&1; then
        log_success "DEPLOY_KEY criado"
    else
        log_error "Falha ao criar DEPLOY_KEY"
        failed=$((failed + 1))
    fi

    # Secret 7 (optional)
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        log_info "Criando SLACK_WEBHOOK_URL..."
        if echo -n "$SLACK_WEBHOOK_URL" | gh secret set SLACK_WEBHOOK_URL -R "$repo" 2>&1; then
            log_success "SLACK_WEBHOOK_URL criado"
        else
            log_error "Falha ao criar SLACK_WEBHOOK_URL"
            failed=$((failed + 1))
        fi
    fi

    if [[ $failed -gt 0 ]]; then
        log_warning "$failed secrets falharam"
        exit 1
    fi

    log_success "Todos os secrets criados com sucesso!"
}

# ────────────────────────────────────────────────────────────────────────────
# VERIFY SECRETS
# ────────────────────────────────────────────────────────────────────────────

verify_secrets() {
    log_section "Verificando secrets criados..."

    local repo="Gladiston-Porto/Trading-APP"

    log_info "Listando secrets..."
    gh secret list -R "$repo"

    log_success "Setup concluído! ✅"
}

# ────────────────────────────────────────────────────────────────────────────
# MAIN
# ────────────────────────────────────────────────────────────────────────────

main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║          🔐 GitHub Secrets Setup Script                  ║"
    echo "║   Configure Deploy Secrets Automaticamente               ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""

    check_dependencies
    prepare_secrets
    validate_inputs
    create_secrets
    verify_secrets

    echo ""
    log_success "Tudo pronto para Deploy! 🚀"
    echo ""
}

main "$@"
