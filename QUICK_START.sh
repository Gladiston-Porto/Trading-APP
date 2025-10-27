#!/bin/bash

# 🚀 Script de Setup Rápido - App de Trading/Swing
# Data: 25 de Outubro de 2025
# Uso: bash QUICK_START.sh

set -e  # Exit on error

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "================================"
echo "🚀 App de Trading/Swing - Setup"
echo "================================"
echo ""

# Verificar pré-requisitos
echo "✓ Verificando pré-requisitos..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Instale Node.js 18+ primeiro."
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm não está instalado. Instalando globalmente..."
    npm install -g pnpm@8
fi

if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker não está instalado. Você pode continuar, mas precisará do Docker para rodar o BD."
fi

echo "✅ Pré-requisitos OK"
echo ""

# Step 1: Instalar dependências
echo "📦 Step 1: Instalando dependências..."
pnpm install
echo "✅ Dependências instaladas"
echo ""

# Step 2: Copiar .env.local
echo "🔧 Step 2: Configurando variáveis de ambiente..."
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "✅ .env.local criado (use valores default para desenvolvimento)"
else
    echo "⚠️  .env.local já existe, mantendo configuração existente"
fi
echo ""

# Step 3: Docker
echo "🐳 Step 3: Iniciando Docker..."
if command -v docker &> /dev/null; then
    docker-compose up -d
    echo "⏳ Aguardando MariaDB estar pronto..."
    sleep 10
    echo "✅ Docker containers iniciados"
else
    echo "⚠️  Docker não disponível. Você precisará de MariaDB rodando em localhost:3306"
fi
echo ""

# Step 4: Prisma Setup
echo "🗄️  Step 4: Configurando banco de dados..."
pnpm db:push --force-reset
echo "✅ Schema BD criado"
echo ""

# Step 5: Seed
echo "🌱 Step 5: Populando banco de dados com dados iniciais..."
pnpm seed
echo "✅ Seed completado"
echo ""

# Step 6: Test
echo "🧪 Step 6: Testando servidor..."
timeout 5 pnpm -F backend dev &
PID=$!
sleep 3

if curl -s http://localhost:3333/health > /dev/null 2>&1; then
    echo "✅ Servidor respondendo em http://localhost:3333/health"
    kill $PID 2>/dev/null || true
else
    echo "❌ Servidor não respondeu. Verifique logs."
    kill $PID 2>/dev/null || true
    exit 1
fi
echo ""

# Summary
echo "================================"
echo "✨ Setup Concluído com Sucesso!"
echo "================================"
echo ""
echo "📌 Próximos passos:"
echo ""
echo "1️⃣  Iniciar desenvolvimento:"
echo "   pnpm dev"
echo ""
echo "2️⃣  Ou iniciar componentes separadamente:"
echo "   Backend:  pnpm -F backend dev"
echo "   Frontend: pnpm -F frontend dev"
echo ""
echo "3️⃣  Acessar Adminer (GUI do BD):"
echo "   http://localhost:8080"
echo "   Usuário: trader"
echo "   Senha: trader123"
echo ""
echo "4️⃣  Testar login:"
echo "   Email: trader@tradingapp.com"
echo "   Senha: trader123 (após Fase 2c - Auth)"
echo ""
echo "5️⃣  Ver documentação:"
echo "   - README.md (visão geral)"
echo "   - Documentacao_Sistema_Trading.doc.md (detalhes)"
echo "   - PROGRESS.md (roadmap)"
echo ""
echo "🔗 URLs importantes:"
echo "   Backend:  http://localhost:3333"
echo "   Frontend: http://localhost:5173"
echo "   Adminer:  http://localhost:8080"
echo "   WebSocket: ws://localhost:3333"
echo ""
echo "📞 Suporte:"
echo "   - Veja logs com: pnpm docker:logs"
echo "   - Resete tudo com: pnpm docker:clean && pnpm clean"
echo ""
echo "Happy trading! 🚀"
