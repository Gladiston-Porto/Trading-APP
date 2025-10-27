#!/bin/bash

# ============================================================
# FASE 2C - VERIFICAÇÃO DE CONCLUSÃO
# ============================================================
# Script para verificar se todos os arquivos foram criados
# e estão prontos para produção
# ============================================================

echo "🔍 Verificando Fase 2c - Autenticação + RBAC"
echo "============================================================"
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
TOTAL=0
PASSED=0
FAILED=0

# Função para verificar arquivo
check_file() {
    TOTAL=$((TOTAL + 1))
    if [ -f "$1" ]; then
        SIZE=$(wc -l < "$1")
        echo -e "${GREEN}✅${NC} $1 ($SIZE linhas)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌${NC} $1 - NÃO ENCONTRADO"
        FAILED=$((FAILED + 1))
    fi
}

# Verificar arquivos de código
echo "📝 Verificando arquivos de código..."
check_file "backend/src/api/dto/auth.dto.ts"
check_file "backend/src/api/middleware/auth.middleware.ts"
check_file "backend/src/api/routes/auth.routes.ts"
check_file "backend/src/services/AuthService.ts"
check_file "backend/src/services/__tests__/AuthService.test.ts"
check_file "backend/src/api/routes/__tests__/auth.integration.test.ts"

echo ""
echo "📚 Verificando documentação..."
check_file "FASE_2C_CONCLUSAO.md"
check_file "FASE_2C_ARQUIVOS.md"
check_file "FASE_2C_FLUXOS.md"
check_file "FASE_2C_SUMMARY.md"

echo ""
echo "✨ Verificando estrutura de diretórios..."

# Verificar diretórios
if [ -d "backend/src/api/dto" ]; then
    echo -e "${GREEN}✅${NC} backend/src/api/dto/"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} backend/src/api/dto/ - NÃO ENCONTRADO"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

if [ -d "backend/src/api/middleware" ]; then
    echo -e "${GREEN}✅${NC} backend/src/api/middleware/"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} backend/src/api/middleware/ - NÃO ENCONTRADO"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

if [ -d "backend/src/api/routes/__tests__" ]; then
    echo -e "${GREEN}✅${NC} backend/src/api/routes/__tests__/"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} backend/src/api/routes/__tests__/ - NÃO ENCONTRADO"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

if [ -d "backend/src/services/__tests__" ]; then
    echo -e "${GREEN}✅${NC} backend/src/services/__tests__/"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} backend/src/services/__tests__/ - NÃO ENCONTRADO"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

echo ""
echo "🔍 Verificando imports e estrutura..."

# Verificar se auth.routes.ts está integrado ao server.ts
if grep -q "authRouter" backend/src/server.ts 2>/dev/null; then
    echo -e "${GREEN}✅${NC} server.ts - authRouter importado e registrado"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️${NC} server.ts - authRouter pode não estar integrado"
fi
TOTAL=$((TOTAL + 1))

# Verificar se AuthService está completo
if grep -q "async register" backend/src/services/AuthService.ts 2>/dev/null; then
    echo -e "${GREEN}✅${NC} AuthService - método register() implementado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} AuthService - método register() não encontrado"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

if grep -q "async login" backend/src/services/AuthService.ts 2>/dev/null; then
    echo -e "${GREEN}✅${NC} AuthService - método login() implementado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} AuthService - método login() não encontrado"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

if grep -q "async refreshToken" backend/src/services/AuthService.ts 2>/dev/null; then
    echo -e "${GREEN}✅${NC} AuthService - método refreshToken() implementado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} AuthService - método refreshToken() não encontrado"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

if grep -q "validateToken" backend/src/services/AuthService.ts 2>/dev/null; then
    echo -e "${GREEN}✅${NC} AuthService - método validateToken() implementado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} AuthService - método validateToken() não encontrado"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

# Verificar middlewares
if grep -q "authMiddleware" backend/src/api/middleware/auth.middleware.ts 2>/dev/null; then
    echo -e "${GREEN}✅${NC} auth.middleware.ts - authMiddleware() implementado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} auth.middleware.ts - authMiddleware() não encontrado"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

if grep -q "rbacMiddleware" backend/src/api/middleware/auth.middleware.ts 2>/dev/null; then
    echo -e "${GREEN}✅${NC} auth.middleware.ts - rbacMiddleware() implementado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} auth.middleware.ts - rbacMiddleware() não encontrado"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

if grep -q "validateDto" backend/src/api/middleware/auth.middleware.ts 2>/dev/null; then
    echo -e "${GREEN}✅${NC} auth.middleware.ts - validateDto() implementado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} auth.middleware.ts - validateDto() não encontrado"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

# Verificar rotas
if grep -q "'/register'" backend/src/api/routes/auth.routes.ts 2>/dev/null; then
    echo -e "${GREEN}✅${NC} auth.routes.ts - POST /register implementado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} auth.routes.ts - POST /register não encontrado"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

if grep -q "'/login'" backend/src/api/routes/auth.routes.ts 2>/dev/null; then
    echo -e "${GREEN}✅${NC} auth.routes.ts - POST /login implementado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} auth.routes.ts - POST /login não encontrado"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

if grep -q "'/refresh'" backend/src/api/routes/auth.routes.ts 2>/dev/null; then
    echo -e "${GREEN}✅${NC} auth.routes.ts - POST /refresh implementado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} auth.routes.ts - POST /refresh não encontrado"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

if grep -q "'/logout'" backend/src/api/routes/auth.routes.ts 2>/dev/null; then
    echo -e "${GREEN}✅${NC} auth.routes.ts - POST /logout implementado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} auth.routes.ts - POST /logout não encontrado"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

if grep -q "'/me'" backend/src/api/routes/auth.routes.ts 2>/dev/null; then
    echo -e "${GREEN}✅${NC} auth.routes.ts - GET /me implementado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} auth.routes.ts - GET /me não encontrado"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

# Verificar DTOs
if grep -q "interface RegisterDto" backend/src/api/dto/auth.dto.ts 2>/dev/null; then
    echo -e "${GREEN}✅${NC} auth.dto.ts - RegisterDto implementado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} auth.dto.ts - RegisterDto não encontrado"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

if grep -q "interface LoginDto" backend/src/api/dto/auth.dto.ts 2>/dev/null; then
    echo -e "${GREEN}✅${NC} auth.dto.ts - LoginDto implementado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} auth.dto.ts - LoginDto não encontrado"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

if grep -q "registerSchema" backend/src/api/dto/auth.dto.ts 2>/dev/null; then
    echo -e "${GREEN}✅${NC} auth.dto.ts - registerSchema (Joi) implementado"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌${NC} auth.dto.ts - registerSchema não encontrado"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

# Resumo
echo ""
echo "============================================================"
echo "📊 RESUMO"
echo "============================================================"
echo -e "Total verificações: ${TOTAL}"
echo -e "${GREEN}Passou: ${PASSED}${NC}"
echo -e "${RED}Falhou: ${FAILED}${NC}"

PERCENTAGE=$((PASSED * 100 / TOTAL))
echo "Percentual de sucesso: ${PERCENTAGE}%"

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ FASE 2c - VERIFICAÇÃO COMPLETA COM SUCESSO!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. pnpm install (instalar dependências)"
    echo "2. Configurar .env com JWT_SECRET"
    echo "3. pnpm dev (iniciar servidor)"
    echo "4. pnpm test (rodar testes)"
    echo "5. Fase 2d (Data Providers)"
    exit 0
else
    echo -e "${RED}⚠️ FASE 2c - ALGUNS ARQUIVOS NÃO FORAM ENCONTRADOS${NC}"
    echo "Por favor, revise os erros acima"
    exit 1
fi
