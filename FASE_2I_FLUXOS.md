# FASE 2I - FLUXOS TÉCNICOS
## Paper Trade Service - Diagramas e Fluxos

**Status**: ✅ COMPLETO
**Data**: 2024-10-26

---

## 1. FLUXO DE TRADE (Record → Close → Metrics)

### 1.1 Visão Geral do Trade Lifecycle

```
User Frontend
     │
     │ POST /api/paper/record-trade
     │ { ticker, entry, direction, shares, SL, TP }
     ↓
     
 ┌───────────────────────────────────────────────┐
 │  ROUTE LAYER: /record-trade                  │
 │  - Validar inputs                            │
 │  - Extrair userId de authMiddleware          │
 │  - Chamar PaperTradeService.recordTrade()    │
 └─────────────┬─────────────────────────────────┘
               │
               ↓
 ┌───────────────────────────────────────────────┐
 │  SERVICE LAYER: recordTrade()                │
 │  ├─ Calcular positionSize = entry × shares  │
 │  ├─ Calcular riskAmount = |entry - SL| × sh │
 │  ├─ Log: "Paper trade recorded"             │
 │  └─ Retornar formatado                      │
 └─────────────┬─────────────────────────────────┘
               │
               ↓
 ┌───────────────────────────────────────────────┐
 │  DATABASE: prisma.paperTrade.create()        │
 │  ├─ INSERT INTO paper_trade                 │
 │  │  (userId, ticker, entryPrice, ...)       │
 │  │  status = OPEN                           │
 │  └─ Retornar registro criado                │
 └─────────────┬─────────────────────────────────┘
               │
               ↓
 ┌───────────────────────────────────────────────┐
 │  RESPONSE: 201 Created                       │
 │  {                                          │
 │    "success": true,                         │
 │    "data": { id, ticker, status, ... }     │
 │    "message": "Trade recorded"              │
 │  }                                          │
 └───────────────────────────────────────────────┘
```

### 1.2 Fluxo de Fechamento de Trade

```
User Frontend
     │
     │ POST /api/paper/close-trade
     │ { tradeId, exitPrice, exitType }
     ↓

 ┌──────────────────────────────────────────────────────┐
 │ ROUTE VALIDATION                                    │
 │ ├─ tradeId required                                 │
 │ ├─ exitPrice > 0                                    │
 │ ├─ exitType ∈ [TP, SL, MANUAL]                    │
 │ └─ Retornar 400 se inválido                       │
 └──────────┬───────────────────────────────────────────┘
            │
            ↓
 ┌──────────────────────────────────────────────────────┐
 │ SERVICE: closeTrade()                               │
 │                                                     │
 │ 1. Buscar trade aberto                             │
 │    SELECT FROM paper_trade WHERE id = ?            │
 │                                                     │
 │ 2. CALCULAR P&L                                    │
 │    IF direction = BUY:                            │
 │       profit = (exitPrice - entryPrice) × shares  │
 │    ELSE:  // SELL                                 │
 │       profit = (entryPrice - exitPrice) × shares  │
 │                                                    │
 │    profitPct = (profit / positionSize) × 100      │
 │                                                    │
 │ 3. Atualizar status                               │
 │    status = CLOSED_{exitType}                     │
 │    exitPrice = ?                                  │
 │    exitTime = NOW()                               │
 │                                                    │
 │ 4. Chamar updateSessionMetrics(userId)            │
 │    (para agregar dados na sessão)                 │
 │                                                    │
 └──────────┬───────────────────────────────────────────┘
            │
            ↓
 ┌──────────────────────────────────────────────────────┐
 │ updateSessionMetrics() - AGREGAÇÃO                 │
 │                                                     │
 │ 1. Buscar sessão ativa                            │
 │    SELECT FROM paper_session                      │
 │    WHERE userId = ? AND active = true             │
 │                                                    │
 │ 2. Buscar todos closed trades desde início         │
 │    SELECT FROM paper_trade                        │
 │    WHERE userId = ?                               │
 │    AND exitTime >= session.startDate              │
 │                                                    │
 │ 3. CALCULAR TODAS AS MÉTRICAS                    │
 │    ├─ Contagem:                                  │
 │    │  ├─ totalTrades = count(*)                 │
 │    │  ├─ winningTrades = count(profit > 0)      │
 │    │  └─ loosingTrades = count(profit < 0)      │
 │    │                                              │
 │    ├─ Simples:                                   │
 │    │  ├─ winRate = (wins / total) × 100%        │
 │    │  ├─ profitFactor = totalWins / totalLoss   │
 │    │  ├─ largestWin = max(profit)               │
 │    │  ├─ largestLoss = min(profit)              │
 │    │  ├─ averageWin = sum(wins) / count(wins)   │
 │    │  └─ averageLoss = sum(loss) / count(loss)  │
 │    │                                              │
 │    └─ Avançado (252-day annualization):         │
 │       ├─ Sharpe = (μ/σ) × √252                  │
 │       ├─ Sortino = (μ/σ_down) × √252            │
 │       ├─ Calmar = CAGR / MaxDD                  │
 │       └─ MaxDD = peak-to-trough %               │
 │                                                    │
 │ 4. Atualizar PaperSession com todas as métricas  │
 │    UPDATE paper_session SET                      │
 │      totalTrades = ?,                            │
 │      sharpeRatio = ?,                            │
 │      ... (todos os campos)                       │
 │                                                    │
 └──────────┬───────────────────────────────────────────┘
            │
            ↓
 ┌──────────────────────────────────────────────────────┐
 │ RESPONSE: 200 OK                                    │
 │ {                                                  │
 │   "success": true,                                │
 │   "data": {                                       │
 │     "id": "trade-1",                             │
 │     "profit": 150,                               │
 │     "profitPct": 5.26,                           │
 │     "status": "CLOSED_TP"                        │
 │   },                                              │
 │   "message": "Trade closed"                      │
 │ }                                                 │
 └──────────────────────────────────────────────────────┘
```

---

## 2. FLUXO DE CÁLCULO DE MÉTRICAS

### 2.1 Agregação de Dados

```
┌─────────────────────────────────────────────────────────┐
│ INPUT: Todos closed trades da sessão                   │
│ [                                                      │
│   { profit: 100, profitPct: 5 },                       │
│   { profit: 150, profitPct: 7.5 },                     │
│   { profit: -50, profitPct: -2.5 },                    │
│   ...                                                  │
│ ]                                                      │
└────────────┬────────────────────────────────────────────┘
             │
             ↓
    ┌────────────────────────────┐
    │ SEPARA WINNERS vs LOSERS   │
    │                            │
    │ winningTrades = [100, 150] │
    │ loosingTrades = [-50]      │
    └────────────────────────────┘
             │
             ├─→ ┌──────────────────────────────┐
             │   │ TOTAL WINS = 250             │
             │   │ TOTAL LOSS = 50              │
             │   │ PROFIT FACTOR = 250/50 = 5  │
             │   └──────────────────────────────┘
             │
             ├─→ ┌──────────────────────────────────┐
             │   │ WIN RATE = (2/3) × 100 = 66.7%  │
             │   └──────────────────────────────────┘
             │
             ├─→ ┌─────────────────────────────────────┐
             │   │ LARGEST WIN = max(100, 150) = 150   │
             │   │ LARGEST LOSS = min(-50) = -50       │
             │   │ AVG WIN = 250/2 = 125               │
             │   │ AVG LOSS = 50/1 = 50                │
             │   └─────────────────────────────────────┘
             │
             └─→ ┌─────────────────────────────────────────┐
                 │ RETURNS ARRAY = [0.05, 0.075, -0.025]  │
                 │ (normalized by profitPct/100)           │
                 └─────────────────────────────────────────┘
```

### 2.2 Cálculo de Sharpe Ratio

```
PASSO 1: Calcular Retorno Médio
    μ = (0.05 + 0.075 - 0.025) / 3
    μ = 0.1 / 3 = 0.0333... (3.33%)

PASSO 2: Calcular Desvio Padrão
    σ = √[Σ(r - μ)² / n]
    
    r₁ - μ = 0.05 - 0.0333 = 0.0167
    r₂ - μ = 0.075 - 0.0333 = 0.0417
    r₃ - μ = -0.025 - 0.0333 = -0.0583
    
    Σ(r - μ)² = 0.0167² + 0.0417² + (-0.0583)²
              = 0.000279 + 0.001739 + 0.003398
              = 0.005416
    
    σ = √(0.005416 / 3) = √0.001805 = 0.0425 (4.25%)

PASSO 3: Calcular Sharpe Ratio
    Sharpe = (μ / σ) × √252
    Sharpe = (0.0333 / 0.0425) × √252
    Sharpe = 0.784 × 15.87
    Sharpe ≈ 12.4
    
    ✓ Excelente! > 2.0

INTERPRETAÇÃO:
    Para cada unidade de risco (volatilidade),
    geramos 12.4 unidades de retorno anualizado
```

### 2.3 Cálculo de Sortino Ratio

```
PASSO 1: Filtrar apenas returns negativos
    downside_returns = [-0.025]  (remove 0.05, 0.075)

PASSO 2: Calcular Downside Volatility
    σ_down = √[Σ(r_negative)² / n_down]
    
    Σ(r_negative)² = (-0.025)² = 0.000625
    σ_down = √(0.000625 / 1) = 0.025 (2.5%)

PASSO 3: Calcular Sortino Ratio
    Sortino = (μ / σ_down) × √252
    Sortino = (0.0333 / 0.025) × √252
    Sortino = 1.332 × 15.87
    Sortino ≈ 21.2
    
    ✓ Melhor que Sharpe! (penaliza menos o upside)

INTERPRETAÇÃO:
    Risco de queda é menor, então ratio sobe
    Menos penalização para ganhos
```

### 2.4 Cálculo de Max Drawdown

```
CAPITAL PROGRESSION:
    Capital iniciar: $10,000
    Após trade 1:    $10,000 + $100 = $10,100    ← novo peak
    Após trade 2:    $10,100 + $150 = $10,250    ← novo peak
    Após trade 3:    $10,250 - $50 = $10,200     ← drawdown?

CÁLCULO:
    Peak₁ = $10,000
    DD₁ = 0
    
    Peak₂ = $10,100  
    DD₂ = ($10,100 - $10,100) / $10,100 = 0
    
    Peak₃ = $10,250
    DD₃ = ($10,250 - $10,200) / $10,250 = 0.0049 (0.49%)
    
    Max Drawdown = 0.49%
    
VISUALIZAÇÃO:
    $10,250 ┌─── Peak
            │  ╱╲
    $10,200 ├─╱  ╲── Drawdown: 0.49%
            │      ╲
    $10,000 └───────
```

### 2.5 Cálculo de Calmar Ratio

```
PASSO 1: Calcular CAGR
    Days Elapsed = 30 dias
    
    CAGR = ((finalCapital / initialCapital) - 1) × (365 / days)
    CAGR = (($10,200 / $10,000) - 1) × (365 / 30)
    CAGR = 0.02 × 12.17
    CAGR = 0.2434 (24.34% annualized)

PASSO 2: Dividir por Max Drawdown
    Calmar = CAGR / MaxDD
    Calmar = 0.2434 / 0.0049
    Calmar ≈ 49.7
    
    ✓ Excelente! Significa ~50x de retorno por unidade de DD

INTERPRETAÇÃO:
    High Calmar = eficiente uso do capital de risco
    Retorna muito com pouca volatilidade extrema
```

---

## 3. FLUXO DE QUERIES

### 3.1 GET /open-trades

```
GET /api/paper/open-trades
└─ authMiddleware (valida JWT, extrai userId)
   └─ Route handler
      └─ PaperTradeService.getOpenTrades(userId)
         └─ prisma.paperTrade.findMany({
              where: { userId, status: 'OPEN' },
              orderBy: { entryTime: 'asc' }
            })
            └─ map(formatTrade)
               └─ HTTP 200 JSON
                  {
                    "success": true,
                    "data": [ {trade}, {trade}, ... ],
                    "count": 3
                  }
```

### 3.2 GET /closed-trades?limit=50

```
GET /api/paper/closed-trades?limit=50
└─ authMiddleware
   └─ Route handler
      ├─ Parse limit = min(50, 500)
      └─ PaperTradeService.getClosedTrades(userId, 50)
         └─ prisma.paperTrade.findMany({
              where: {
                userId,
                status: { not: 'OPEN' }
              },
              orderBy: { exitTime: 'desc' },
              take: 50
            })
            └─ map(formatTrade)
               └─ HTTP 200 JSON
                  {
                    "success": true,
                    "data": [ {closed_trade}, ... ],
                    "count": 50,
                    "limit": 50
                  }
```

### 3.3 GET /trades?status=OPEN&ticker=PETR4&from=2024-01-01&to=2024-12-31

```
GET /api/paper/trades?status=OPEN&ticker=PETR4&from=2024-01-01
└─ authMiddleware
   └─ Route handler
      ├─ Parse filters:
      │  ├─ status = 'OPEN'
      │  ├─ ticker = 'PETR4'
      │  └─ from = new Date('2024-01-01')
      │
      └─ PaperTradeService.getTrades(userId, filters)
         └─ prisma.paperTrade.findMany({
              where: {
                userId,
                status: 'OPEN',
                ticker: 'PETR4',
                entryTime: { gte: 2024-01-01 }
              }
            })
            └─ HTTP 200 JSON
               {
                 "success": true,
                 "data": [ {filtered_trades} ],
                 "filters": { status, ticker, from, to }
               }
```

---

## 4. FLUXO DE SESSÃO

### 4.1 Iniciar Sessão

```
POST /api/paper/session/start
└─ Body: { initialCapital: 10000 }
   └─ authMiddleware
      └─ Route handler
         ├─ Validar initialCapital > 0
         └─ PaperTradeService.startSession(userId, 10000)
            │
            ├─ PASSO 1: Buscar sessão ativa atual
            │  └─ SELECT FROM paper_session
            │     WHERE userId = ? AND active = true
            │
            ├─ PASSO 2: Se existe, fecha
            │  └─ UPDATE paper_session
            │     SET active = false,
            │         endDate = NOW()
            │
            ├─ PASSO 3: Cria nova sessão
            │  └─ INSERT INTO paper_session
            │     (userId, initialCapital, active, startDate)
            │     VALUES (?, ?, true, NOW())
            │
            └─ HTTP 201 JSON
               {
                 "success": true,
                 "data": {
                   "sessionId": "session-123",
                   "initialCapital": 10000
                 }
               }
```

### 4.2 Obter Métricas Atuais

```
GET /api/paper/session/metrics
└─ authMiddleware
   └─ Route handler
      └─ PaperTradeService.getSessionMetrics(userId)
         │
         ├─ Buscar sessão ativa
         │  └─ SELECT FROM paper_session
         │     WHERE userId = ? AND active = true
         │
         └─ Retornar ALL métricas
            └─ HTTP 200 JSON
               {
                 "success": true,
                 "data": {
                   "totalTrades": 15,
                   "winningTrades": 10,
                   "loosingTrades": 5,
                   "winRate": 66.67,
                   "profitFactor": 2.5,
                   "sharpeRatio": 2.3,
                   "sortinoRatio": 3.1,
                   "calmarRatio": 1.8,
                   "maxDrawdown": 0.12,
                   "totalPnL": 1500,
                   "largestWin": 500,
                   "largestLoss": -200,
                   "averageWin": 150,
                   "averageLoss": -60
                 }
               }
```

### 4.3 Histórico de Sessões

```
GET /api/paper/session/history?limit=10
└─ authMiddleware
   └─ Route handler
      ├─ Parse limit = min(10, 100)
      └─ PaperTradeService.getSessionHistory(userId, 10)
         └─ SELECT FROM paper_session
            WHERE userId = ?
            ORDER BY startDate DESC
            LIMIT 10
            │
            └─ HTTP 200 JSON
               {
                 "success": true,
                 "data": [
                   {
                     "id": "session-1",
                     "startDate": "2024-10-20",
                     "endDate": "2024-10-25",
                     "initialCapital": 10000,
                     "finalCapital": 11500,
                     "totalPnL": 1500,
                     "winRate": 66.67,
                     "sharpeRatio": 2.3
                   },
                   ...
                 ],
                 "count": 10
               }
```

---

## 5. MODELO DE DADOS FÍSICO

### 5.1 Tabela PaperTrade

```
PAPER_TRADE
├─ ID (CUID Primary Key)
├─ USER_ID (FK → USER.ID)
├─ TICKER (VARCHAR 10, indexed)
├─ ENTRY_PRICE (DECIMAL 10,5)
├─ ENTRY_TIME (DATETIME default now(), indexed)
├─ DIRECTION (ENUM 'BUY', 'SELL')
├─ SHARES (INT)
├─ STOP_LOSS (DECIMAL 10,5)
├─ TAKE_PROFIT (DECIMAL 10,5)
├─ POSITION_SIZE (DECIMAL 15,2)
├─ RISK_AMOUNT (DECIMAL 15,2)
├─ STATUS (ENUM 'OPEN', 'CLOSED_TP', 'CLOSED_SL', 'CLOSED_MAN', indexed)
├─ EXIT_PRICE (DECIMAL 10,5, nullable)
├─ EXIT_TIME (DATETIME, nullable)
├─ EXIT_TYPE (ENUM 'TP', 'SL', 'MANUAL', nullable)
├─ PROFIT (DECIMAL 15,2, nullable)
├─ PROFIT_PCT (DECIMAL 8,4, nullable)
├─ SIGNAL (VARCHAR 255, nullable)
├─ NOTES (TEXT, nullable)
│
├─ INDEXES:
│  ├─ (USER_ID) - para queries por usuário
│  ├─ (STATUS) - para queries OPEN vs CLOSED
│  └─ UNIQUE (USER_ID, ENTRY_TIME) - para ordenação
│
└─ FOREIGN KEY: USER_ID → USER.ID
```

### 5.2 Tabela PaperSession

```
PAPER_SESSION
├─ ID (CUID Primary Key)
├─ USER_ID (FK → USER.ID)
├─ START_DATE (DATETIME default now(), indexed)
├─ END_DATE (DATETIME, nullable)
├─ ACTIVE (BOOLEAN default true)
├─ INITIAL_CAPITAL (DECIMAL 15,2)
├─ FINAL_CAPITAL (DECIMAL 15,2)
├─ TOTAL_PNL (DECIMAL 15,2 default 0)
├─ TOTAL_TRADES (INT default 0)
├─ WINNING_TRADES (INT default 0)
├─ LOOSING_TRADES (INT default 0)
├─ WIN_RATE (DECIMAL 8,4 default 0)
├─ PROFIT_FACTOR (DECIMAL 8,4 default 0)
├─ SHARPE_RATIO (DECIMAL 8,4 default 0)
├─ SORTINO_RATIO (DECIMAL 8,4 default 0)
├─ CALMAR_RATIO (DECIMAL 8,4 default 0)
├─ MAX_DRAWDOWN (DECIMAL 8,4 default 0)
├─ LARGEST_WIN (DECIMAL 15,2 default 0)
├─ LARGEST_LOSS (DECIMAL 15,2 default 0)
├─ AVERAGE_WIN (DECIMAL 15,2 default 0)
├─ AVERAGE_LOSS (DECIMAL 15,2 default 0)
│
├─ INDEXES:
│  ├─ (USER_ID) - para queries por usuário
│  └─ (START_DATE) - para ordenação histórica
│
└─ FOREIGN KEY: USER_ID → USER.ID
```

---

## 6. ESTADO DO SISTEMA

### 6.1 Estado de um Trade

```
OPEN
 │  closeTrade(exitPrice, exitType)
 ├─→ CLOSED_TP  (Take Profit atingido)
 ├─→ CLOSED_SL  (Stop Loss atingido)
 └─→ CLOSED_MAN (Manual)

Apenas trades em estado CLOSED* são incluídos em métricas
```

### 6.2 Estado de uma Sessão

```
ACTIVE (Uma por usuário)
   │  startSession() com nova sessão
   ├─→ INACTIVE (endDate preenchido, active=false)
   
Apenas UMA sessão ativa por usuário
Iniciar nova sessão fecha automaticamente a anterior
```

---

## 7. FLUXO DE ERRO

### 7.1 Tratamento de Erro - Example

```
POST /api/paper/record-trade
   │ Body: { ticker: "PETR4", entryPrice: 0 }  ← INVÁLIDO
   │
   ├─ Route Validation
   │  ├─ entryPrice = 0
   │  └─ Falha: entryPrice must be > 0
   │     │
   │     └─ HTTP 400 Bad Request
   │        {
   │          "success": false,
   │          "error": "entryPrice must be > 0"
   │        }
   │
   └─ [Não chega no service]

---

POST /api/paper/close-trade
   │ Body: { tradeId: "invalid-id", exitPrice: 30 }
   │
   ├─ authMiddleware ✓
   ├─ Route Validation ✓
   ├─ Service: prisma.paperTrade.findUnique()
   │  └─ Não encontra trade
   │     │
   │     ├─ Lança erro/exceção
   │     │
   │     ├─ Catch no try-catch
   │     │
   │     ├─ logger.error('Failed to close trade', ...)
   │     │
   │     └─ HTTP 500 Internal Server Error
   │        {
   │          "success": false,
   │          "error": "Failed to close trade",
   │          "details": "Trade not found"
   │        }
```

---

## 8. FLUXO DE AUTENTICAÇÃO

### 8.1 Middleware Chain

```
Request
   │
   ├─ authMiddleware
   │  ├─ Extrair JWT de header
   │  ├─ Validar JWT
   │  ├─ Extrair userId
   │  └─ Adicionar (req as any).userId = userId
   │
   ├─ Route Handler (com userId disponível)
   │  └─ PaperTradeService.getOpenTrades((req as any).userId)
   │     └─ Queries apenas daquele usuário
   │
   └─ Response (isolado por usuário)
```

---

## 9. SEQUÊNCIA DE INTEGRAÇÃO

### 9.1 Adicionar PaperRouter ao Server

```
server.ts
│
├─ Import: import { paperRouter } from "./api/routes/paper.routes"
│
├─ Setup routes:
│  └─ app.use("/api/paper", paperRouter)
│
└─ Todos endpoints agora disponíveis em /api/paper/*
   ├─ /api/paper/record-trade
   ├─ /api/paper/close-trade
   ├─ /api/paper/open-trades
   ├─ /api/paper/closed-trades
   ├─ /api/paper/trades
   ├─ /api/paper/session/start
   ├─ /api/paper/session/metrics
   ├─ /api/paper/session/history
   └─ /api/paper/info
```

---

## 10. RESUMO DOS FLUXOS

| Operação | Entrada | Saída | Tempo Est. |
|----------|---------|-------|-----------|
| Record Trade | TradeInput | TradeOutput | < 50ms |
| Close Trade | tradeId, exitPrice | TradeOutput + Metrics | < 100ms |
| Get Open | userId | TradeOutput[] | < 50ms |
| Get Closed | userId, limit | TradeOutput[] | < 100ms |
| Query Trades | userId, filters | TradeOutput[] | < 150ms |
| Start Session | userId, initialCapital | sessionId | < 50ms |
| Get Metrics | userId | SessionMetrics | < 100ms |
| Get History | userId, limit | PaperSession[] | < 150ms |

---

**Versão**: 1.0.0
**Status**: Completo e pronto para implementação
