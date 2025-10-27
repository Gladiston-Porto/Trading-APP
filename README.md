# App de Trading/Swing - B3 + Expansão Futura

## Visão Geral

Sistema full-stack para análise e gestão de posições em ações da B3, com foco em estratégias de trading curto (swing/daytrade) e expansão futura para EUA. 

### Características Principais
- ✅ Análise em tempo real via WebSocket
- ✅ Alertas automáticos (Telegram)
- ✅ Paper trading com gestão de risco
- ✅ Backtesting completo com métricas
- ✅ KPIs e relatórios exportáveis (P&L, win rate, payoff, drawdown)
- ✅ Auditoria completa (todas as ações rastreadas)
- ✅ Segurança OWASP (JWT, rate-limit, validação)

## Stack Técnico

- **Backend**: Node.js 18+, Express, TypeScript, Prisma (ORM)
- **Frontend**: React 18, Vite, Tailwind CSS, Socket.io
- **Database**: MariaDB 10.6+ (via Docker)
- **Real-time**: WebSocket (socket.io)
- **Jobs**: Node-cron (24/7)
- **Auth**: JWT + Refresh tokens, bcrypt
- **Data Providers**: Brapi (B3), Yahoo Finance (EUA)

## Pré-requisitos

- Node.js 18+ e pnpm 8+
- Docker e Docker Compose (para MariaDB)
- Git
- Conta BotFather (para Telegram bot token)
- (Opcional) Chave API Brapi para dados avançados

## Instalação

### 1. Clone e Instale Dependências
```bash
git clone <seu-repo>
cd app-trade
pnpm install
```

### 2. Configuração de Variáveis de Ambiente
```bash
cp .env.example .env.local
# Edite .env.local com suas chaves (TELEGRAM_BOT_TOKEN, etc.)
```

### 3. Setup do Banco de Dados
```bash
# Inicie MariaDB via Docker
pnpm docker:up

# Aguarde ~10s para MariaDB estar ready
sleep 10

# Execute migrations do Prisma
pnpm db:push

# Seed dados iniciais (tickers, candles mock)
pnpm seed
```

### 4. Acesse Adminer (GUI do BD)
Abra http://localhost:8080 para gerenciar dados visualmente.
- Usuário: `trader`
- Senha: `trader123`
- BD: `app_trade_db`

## Desenvolvimento

### Modo Local com Hot Reload
```bash
# Backend + Frontend em paralelo
pnpm dev
```

- Backend: http://localhost:3333
- Frontend: http://localhost:5173
- Adminer: http://localhost:8080

### Backend Apenas
```bash
pnpm -F backend dev
```

### Frontend Apenas
```bash
pnpm -F frontend dev
```

## Testes

```bash
# Todos os testes
pnpm test

# Com cobertura
pnpm test:coverage

# Específico ao backend
pnpm -F backend test
```

## Build e Produção

```bash
# Build ambos
pnpm build

# Start backend (após build)
pnpm start
```

### Deploy no Hostinger
1. Configure FTP/SFTP
2. Faça push via `pnpm build && ftp ...`
3. Configure MariaDB remoto (Hostinger painel)
4. Update `.env` no servidor
5. `npm install && npm start`

## Estrutura de Pastas

```
app-trade/
├── backend/
│   ├── src/
│   │   ├── server.ts           # Entrada Express
│   │   ├── config/             # Env, segurança
│   │   ├── db/                 # Prisma client
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Schema BD
│   │   ├── domain/
│   │   │   ├── entities/       # Models TypeScript
│   │   │   ├── data/           # Providers (Brapi, Yahoo)
│   │   │   ├── strategies/     # Indicadores, padrões, engine
│   │   │   └── risk/           # RiskManager
│   │   ├── services/           # Lógica de negócio
│   │   ├── jobs/               # Cron workers
│   │   ├── api/                # Routes, controllers, DTOs
│   │   └── utils/              # Helpers
│   ├── tests/                  # Jest
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/         # Reutilizáveis
│   │   ├── pages/              # Rotas
│   │   ├── stores/             # Zustand
│   │   ├── api/                # HTTP, WS
│   │   └── styles/
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── tsconfig.json
├── scripts/                    # SQL init, deploy scripts
├── package.json                # Workspace root
├── pnpm-workspace.yaml
├── docker-compose.yml
├── .env.example
└── README.md (este arquivo)
```

## APIs Principais

### Auth
- `POST /auth/register` - Registro
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout

### Dados
- `GET /tickers?query=...` - Lista tickers
- `GET /market/candles?symbol=PETR4&tf=1d&from=...&to=...` - Candles

### Estratégias
- `GET /screener/run?universe=B3&tf=1d` - Scan de oportunidades
- `POST /strategies` - Criar estratégia
- `GET /signals?status=NEW` - Sinais em tempo real (WS)

### Trading
- `POST /paper/enter` - Abrir posição
- `POST /paper/exit/:positionId` - Fechar posição
- `GET /positions?status=OPEN` - Posições abertas

### Backtest & Relatórios
- `POST /backtest/run` - Executar backtest
- `GET /portfolio/kpis?range=month` - KPIs
- `GET /reports/pnl?from=...&to=...` - P&L exportável

## Estratégias de Trading

### Entrada Swing (Default)
1. Preço ≥ EMA9 e EMA21
2. Cruzamento recente: EMA9 > EMA21
3. RSI saindo de <30
4. Candle de reversão válido (hammer, engulfing, etc.)
5. Volume ≥ 1.2× média 20
6. Filtro tendência: Preço ≥ SMA200

**Stop**: max(1.5×ATR, mínima do padrão)  
**Target**: Base 2:1 R:R (ajustável)

### Entrada Trade Curto
1. Inside bar + rompimento com volume
2. EMAs alinhadas
3. Stop na mínima
4. Alvo 1.5-2.0× risco

### Saída
- TP parcial no alvo 1 (50% posição)
- Mover stop para break-even
- Trailing por k×ATR
- Saída por sinal contrário (EMA9<EMA21 + padrão baixa + volume)

## Gestão de Risco

- **Risco por trade**: Configurável (ex: 1% do capital) → tamanho = risco_nominal / distância_stop
- **Limite diário**: Ex: -3% bloqueia novas entradas
- **Slippage**: Configurável para backtests
- **Horários**: Respeita pregões B3 (9:30-17:00 BRT, seg-sex)

## Fontes de Dados

### Brapi (Gratuito, B3)
- Cotações em tempo real
- Históricos diários
- Limite: ~60 requisições/hora

### Yahoo Finance (Gratuito, Global)
- Históricos globais
- Intraday limitado
- Usado para EUA e validação

### XP (Pago, ~R$50/mês)
- Intraday 5m/15m
- Tempo real preciso
- Opcional para produção avançada

## Segurança

- ✅ JWT com 15min expiração
- ✅ Refresh tokens (7 dias)
- ✅ BCRYPT para passwords
- ✅ RBAC (ADMIN, TRADER, VIEW)
- ✅ Rate-limiting em /auth e /screener
- ✅ CORS restritivo
- ✅ Helmet para headers seguro
- ✅ Validação com Joi
- ✅ AuditLog para rastreamento

## Disclaimer e Riscos

⚠️ **Este sistema NÃO fornece conselho financeiro.** Trading envolve risco significativo de perda. Backtest, paper trading e gestão de risco são essenciais. Use sempre stop-loss. Consulte um especialista antes de investir com capital real.

## Extensões Futuras

- Integração com corretoras reais (NuInvest, XP, Inter, Alpaca)
- Calendário econômico e weight de notícias
- Parciais automáticas (50% no alvo 1)
- LLM opcional (somente explicações)
- Suporte a criptomoedas

## Suporte e Feedback

Compartilhe feedback, bugs ou sugestões via issues no repositório.

## Licença

MIT

---

**Desenvolvido com foco em precisão, auditabilidade e backtestabilidade.**  
**Versão:** 1.0.0 | **Data**: Outubro 2025
