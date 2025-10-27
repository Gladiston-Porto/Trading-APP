# FASE 2H - RISK MANAGER - FLUXOS DE NEGÓCIO

**Data:** 2024-01-15  
**Versão:** 1.0  
**Autor:** Trading System Development

---

## 1. FLUXO PRINCIPAL: ANÁLISE E EXECUÇÃO DE TRADE

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SINAL GERADO (ConfluenceEngine)                          │
│    - Ticker: PETR4                                          │
│    - Signal: BULLISH (confluência + força)                  │
│    - Entry: 100.50                                          │
│    - Stop Loss: 98.50                                       │
│    - Take Profit: 104.50                                    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. FRONTEND REQUISITA CÁLCULO DE POSIÇÃO                    │
│    POST /api/risk/calculate-position                        │
│    {                                                        │
│      "method": "kelly",                                     │
│      "accountSize": 10000,                                  │
│      "riskPerTrade": 2,                                     │
│      "ticker": "PETR4",                                     │
│      "entryPrice": 100.50,                                  │
│      "direction": "BUY",                                    │
│      "stopLoss": 98.50,                                     │
│      "takeProfit": 104.50,                                  │
│      "winRate": 0.55                                        │
│    }                                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. VALIDAÇÃO DE ENTRADA                                     │
│    ✓ Method válido? (kelly, fixed_risk, fixed_amount)       │
│    ✓ Account size > 0?                                      │
│    ✓ Direction in [BUY, SELL]?                              │
│    ✓ RiskRewardRatio >= minRR?                              │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. CÁLCULO DE RAZÃO RISK/REWARD                             │
│    Reward = |TP - Entry| = |104.50 - 100.50| = 4.00       │
│    Risk = |Entry - SL| = |100.50 - 98.50| = 2.00          │
│    RR = Reward / Risk = 4.00 / 2.00 = 2.00 ✓              │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. SELEÇÃO DE MÉTODO DE POSITION SIZING                     │
│    Method = "kelly" → RiskManager.calculateKellySize()     │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. CÁLCULO KELLY                                            │
│    Formula: f* = (b×p - q) / b                             │
│    where: b=RR=2.00, p=0.55, q=0.45                        │
│    f* = (2×0.55 - 0.45) / 2 = 0.325 (32.5%)               │
│                                                             │
│    Conservative Kelly (25%):                               │
│    f = 0.325 × 0.25 = 0.08125 (8.125%)                    │
│                                                             │
│    Dollar Amount:                                          │
│    Risk = 10000 × 0.08125 = $812.50                        │
│                                                             │
│    Shares:                                                 │
│    Distance = 100.50 - 98.50 = 2.00                        │
│    Shares = $812.50 / 2.00 = 406.25 → 406 ✓               │
│                                                             │
│    Slippage Adjustment (0.5%):                             │
│    Slippage = 100.50 × 0.5% = 0.50                         │
│    Adjusted Risk = 812.50 × 1.005 = $816.58               │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. RESULTADO: PositionSize                                 │
│    {                                                        │
│      "shares": 406,                                         │
│      "riskAmount": 812.50,                                  │
│      "positionSize": 40803,           (406 × 100.50)       │
│      "expectedProfit": 1624,          (406 × 4.00)         │
│      "method": "kelly",                                     │
│      "rationale": "Kelly (25%): 406 shares, Risk=$812.50..." │
│    }                                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. ASSESSMENT DE RISCO                                      │
│    ✓ Daily Loss Limit: -3% → OK (não atingido)             │
│    ✓ Max Drawdown: -10% → OK (não atingido)                │
│    ✓ Position Utilization: 40803/10000 = 408% → CRÍTICO    │
│    ✗ RR Ratio: 2.00 >= 2.00 → OK                           │
│                                                             │
│    RiskAssessment:                                         │
│    {                                                        │
│      "canTrade": false,                                     │
│      "reason": "Position uses 408% of account",             │
│      "riskLevel": "CRITICAL",                               │
│      "warnings": ["Excessive leverage..."]                  │
│    }                                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. RESPOSTA À API (Cenário: Rejeição)                       │
│    HTTP 200                                                 │
│    {                                                        │
│      "ticker": "PETR4",                                     │
│      "position": { shares: 406, ... },                      │
│      "riskAssessment": {                                    │
│        "canTrade": false,                                   │
│        "reason": "Position uses 408% of account",           │
│        "riskLevel": "CRITICAL",                             │
│        "warnings": [...]                                    │
│      }                                                      │
│    }                                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. FRONTEND EXIBE AVISO                                    │
│     "❌ Trade bloqueado: 408% leverage"                     │
│     "Sugerido: Reduzir posição ou aumentar capital"         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. FLUXO ALTERNATIVO: FIXED RISK %

```
Mesmo setup, mas com method: "fixed_risk"

┌─────────────────────────────────────────────────────────────┐
│ 1. PARAMETERS                                               │
│    method: "fixed_risk"                                     │
│    riskPerTrade: 2 (= 2% of account)                        │
│    accountSize: 10000                                       │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CÁLCULO                                                  │
│    Risk Amount = 10000 × 2% = $200                          │
│    Distance = 100.50 - 98.50 = 2.00                         │
│    Shares = 200 / 2.00 = 100                                │
│                                                             │
│    Position Size = 100 × 100.50 = $10,050                  │
│    Expected Profit = 100 × 4.00 = $400                     │
│    Utilization = 10050 / 10000 = 100.5% ✓ OK              │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RESULT                                                   │
│    {                                                        │
│      "shares": 100,                                         │
│      "riskAmount": 200,                                     │
│      "positionSize": 10050,                                 │
│      "expectedProfit": 400,                                 │
│      "method": "fixed_risk",                                │
│      "rationale": "Fixed Risk (2% of account)..."           │
│    }                                                        │
│                                                             │
│    Risk Assessment: APPROVED ✓                              │
│    canTrade: true                                           │
│    riskLevel: "MEDIUM"                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. FLUXO: REGISTRO E EXECUÇÃO DE TRADE

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FRONTEND APROVA POSIÇÃO (Fixed Risk 100 shares)          │
│    Usuário clica "EXECUTAR TRADE"                           │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ENVIAR PARA BACKEND                                      │
│    POST /api/risk/record-trade                              │
│    {                                                        │
│      "ticker": "PETR4",                                     │
│      "entryPrice": 100.50,                                  │
│      "direction": "BUY",                                    │
│      "shares": 100,                                         │
│      "stopLoss": 98.50,                                     │
│      "takeProfit": 104.50,                                  │
│      "positionSize": 10050,                                 │
│      "riskAmount": 200                                      │
│    }                                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. GRAVAÇÃO INTERNA                                         │
│    RiskManager.recordTrade(...)                             │
│                                                             │
│    Cria TradeRecord:                                        │
│    {                                                        │
│      ticker: "PETR4",                                       │
│      entryTime: 2024-01-15T14:30:00Z,                       │
│      entryPrice: 100.50,                                    │
│      direction: "BUY",                                      │
│      shares: 100,                                           │
│      stopLoss: 98.50,                                       │
│      takeProfit: 104.50,                                    │
│      status: "OPEN",                                        │
│      profit: undefined,  (ainda não fechado)                │
│      profitPercent: undefined                               │
│    }                                                        │
│                                                             │
│    Adiciona a openTrades[]                                  │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. RESPOSTA DE SUCESSO                                      │
│    HTTP 200                                                 │
│    {                                                        │
│      "success": true,                                       │
│      "trade": {                                             │
│        "ticker": "PETR4",                                   │
│        "entryTime": "2024-01-15T14:30:00Z",                │
│        "status": "OPEN"                                     │
│      }                                                      │
│    }                                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. FRONTEND EXIBE CONFIRMAÇÃO                               │
│    "✓ Trade aberto: 100 PETR4 @ 100.50"                     │
│    "Stop Loss: 98.50 | Take Profit: 104.50"                 │
│    "Risco: $200 | Recompensa: $400"                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. FLUXO: FECHAMENTO COM LUCRO (TAKE PROFIT)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SINAL DE MERCADO: Preço atinge Take Profit              │
│    Preço PETR4: 100.50 → 104.50 (Take Profit!)             │
│    Tempo: 15 minutos depois                                 │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. FRONTEND DETECTA CONDIÇÃO (monitorando preços)           │
│    Chamada contínua a API de preços                         │
│    Preço >= TP? SIM → Executar fechamento                   │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. ENVIAR PARA BACKEND                                      │
│    POST /api/risk/close-trade                               │
│    {                                                        │
│      "ticker": "PETR4",                                     │
│      "exitPrice": 104.50,                                   │
│      "exitType": "TP"  (Take Profit)                        │
│    }                                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. CÁLCULO DE P&L                                           │
│    Direction: BUY                                           │
│    Profit = (Exit - Entry) × Shares                         │
│    Profit = (104.50 - 100.50) × 100                         │
│    Profit = 4.00 × 100 = $400 ✓                            │
│                                                             │
│    Profit %:                                               │
│    Profit% = (400 / 10050) × 100 = 3.98%                   │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. ATUALIZAÇÃO DE STATE                                     │
│    Move trade de openTrades[] → closedTrades[]              │
│                                                             │
│    TradeRecord final:                                       │
│    {                                                        │
│      ticker: "PETR4",                                       │
│      entryTime: 2024-01-15T14:30:00Z,                       │
│      entryPrice: 100.50,                                    │
│      exitTime: 2024-01-15T14:45:00Z,                        │
│      exitPrice: 104.50,                                     │
│      status: "CLOSED_TP",                                   │
│      profit: 400,                                           │
│      profitPercent: 3.98                                    │
│    }                                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. RESPOSTA                                                 │
│    HTTP 200                                                 │
│    {                                                        │
│      "success": true,                                       │
│      "trade": {                                             │
│        "ticker": "PETR4",                                   │
│        "exitTime": "2024-01-15T14:45:00Z",                 │
│        "status": "CLOSED_TP",                               │
│        "profit": 400,                                       │
│        "profitPercent": "3.98"                              │
│      }                                                      │
│    }                                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. ATUALIZAÇÃO DE MÉTRICAS                                  │
│    tradesOpen: 0                                            │
│    totalProfit: +$400                                       │
│    accountValue: $10,400 (10,000 + 400)                    │
│                                                             │
│    Frontend exibe:                                          │
│    "✓ Trade fechado com LUCRO!"                             │
│    "Ganho: $400 (+3.98%)"                                   │
│    "Novo saldo: $10,400"                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. FLUXO ALTERNATIVO: FECHAMENTO COM STOP LOSS

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SINAL DE MERCADO: Preço atinge Stop Loss                 │
│    Preço PETR4: 100.50 → 98.50 (Stop Loss!)                │
│    Direção: BAIXA (contra posição BUY)                      │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. FRONTEND DETECTA E FECHA                                 │
│    POST /api/risk/close-trade                               │
│    {                                                        │
│      "ticker": "PETR4",                                     │
│      "exitPrice": 98.50,                                    │
│      "exitType": "SL"  (Stop Loss)                          │
│    }                                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CÁLCULO DE P&L (PREJUÍZO)                                │
│    Profit = (98.50 - 100.50) × 100                          │
│    Profit = -2.00 × 100 = -$200 ✗ PERDA                   │
│                                                             │
│    Profit%:                                                │
│    Profit% = (-200 / 10050) × 100 = -1.99%                │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. ATUALIZAÇÃO                                              │
│    status: "CLOSED_SL"                                      │
│    profit: -200                                             │
│    profitPercent: -1.99                                     │
│    totalProfit: -200 (reducao)                              │
│    accountValue: $9,800 (10,000 - 200)                     │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. FRONTEND EXIBE AVISO                                     │
│    "✗ Trade fechado com PERDA!"                             │
│    "Prejuízo: -$200 (-1.99%)"                               │
│    "Novo saldo: $9,800"                                     │
│    "Daily Loss: 2% utilizado"                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. FLUXO VENDA (SELL DIRECTION)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SINAL BEARISH: Vender curto                              │
│    Entry: 100.50                                            │
│    Direction: SELL (short)                                  │
│    Stop Loss: 102.50 (acima!)                               │
│    Take Profit: 96.50 (abaixo!)                             │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CÁLCULO POSITION SIZING (mesmo para SELL)                │
│    RR = |96.50 - 100.50| / |100.50 - 102.50|               │
│    RR = 4.00 / 2.00 = 2.00 ✓                               │
│                                                             │
│    Kelly calculation idêntico                              │
│    Resultado: 100 shares (mesmo valor)                     │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RECORD TRADE (SELL)                                      │
│    POST /api/risk/record-trade                              │
│    {                                                        │
│      "ticker": "PETR4",                                     │
│      "entryPrice": 100.50,                                  │
│      "direction": "SELL",  ← Diferença!                     │
│      "shares": 100,                                         │
│      "stopLoss": 102.50,  ← Acima!                          │
│      "takeProfit": 96.50   ← Abaixo!                        │
│    }                                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. FECHAMENTO COM LUCRO (SL vs TP diferente)                │
│                                                             │
│    Cenário A: Preço → 96.50 (TP)                            │
│    Profit = (Entry - Exit) × Shares                         │
│    Profit = (100.50 - 96.50) × 100 = +$400 ✓              │
│                                                             │
│    Cenário B: Preço → 102.50 (SL)                           │
│    Profit = (100.50 - 102.50) × 100 = -$200 ✗             │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. DIFERENÇAS CRÍTICAS (SELL vs BUY):                       │
│                                                             │
│    SLIPPAGE ADJUSTMENT:                                     │
│    BUY: SL move down, TP move down (pior)                   │
│    SELL: SL move up, TP move up (pior)                      │
│                                                             │
│    TRAILING STOP:                                          │
│    BUY: Trailing abaixo do topo (proteção)                 │
│    SELL: Trailing acima do topo (proteção)                 │
│                                                             │
│    P&L CALCULATION:                                        │
│    BUY: Profit = (Exit - Entry) × Shares                    │
│    SELL: Profit = (Entry - Exit) × Shares ← INVERTIDO      │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. FLUXO: SESSION METRICS & DASHBOARD

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FRONTEND REQUISITA MÉTRICAS                              │
│    GET /api/risk/session-metrics?accountValue=10400         │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. BACKEND CALCULA AGREGAÇÕES                               │
│                                                             │
│    RiskManager.getSessionMetrics():                         │
│    - Trades open: count(openTrades) = 1                     │
│    - Total risk: sum(openTrades.riskAmount) = $200          │
│    - Total profit: sum(closedTrades.profit) = $400          │
│    - Daily loss: -$200 (se houver)                          │
│    - Account value: 10400 (entrada)                         │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RESPOSTA JSON                                            │
│    {                                                        │
│      "sessionStart": "2024-01-15T14:00:00Z",               │
│      "metrics": {                                           │
│        "tradesOpen": 1,                                     │
│        "totalRiskExposed": "200.00",                        │
│        "totalProfit": "400.00",                             │
│        "dailyLossUsed": "0.00",                             │
│        "accountValueCurrent": "10400.00"                    │
│      }                                                      │
│    }                                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. FRONTEND ATUALIZA DASHBOARD                              │
│                                                             │
│    ╔════════════════════════════════════╗                   │
│    ║ TRADING SESSION DASHBOARD          ║                   │
│    ╠════════════════════════════════════╣                   │
│    ║ Account Start: $10,000             ║                   │
│    ║ Account Current: $10,400 (+4%)     ║                   │
│    ║                                    ║                   │
│    ║ Trades Open: 1                     ║                   │
│    ║ ├─ PETR4 BUY 100 @ 100.50         ║                   │
│    ║                                    ║                   │
│    ║ Total Risk Exposed: $200 (2%)      ║                   │
│    ║ Total Profit: $400 (4%)            ║                   │
│    ║ Daily Loss Used: 0%                ║                   │
│    ║ Drawdown: 0%                       ║                   │
│    ║                                    ║                   │
│    ║ Status: ✓ Operacional              ║                   │
│    ╚════════════════════════════════════╝                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. FLUXO: MÚLTIPLOS TRADES SIMULTANEAMENTE

```
┌─────────────────────────────────────────────────────────────┐
│ ESTADO INICIAL: Account $10,000                             │
└────────────┬────────────────────────────────────────────────┘

┌──────────┐  ┌──────────┐  ┌──────────┐
│ TRADE 1  │  │ TRADE 2  │  │ TRADE 3  │
│ PETR4    │  │ VALE5    │  │ ITUB4    │
│ BUY 100  │  │ SELL 50  │  │ BUY 75   │
│ Risk $200│  │ Risk $100│  │ Risk $150│
└──────────┘  └──────────┘  └──────────┘
     │             │             │
     └─────────────┼─────────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │ Total Risk: $450    │
        │ 4.5% of account     │
        │ Status: APPROVED ✓  │
        └─────────────────────┘
             │
             ├─→ Record Trade 1 (openTrades[0])
             ├─→ Record Trade 2 (openTrades[1])
             └─→ Record Trade 3 (openTrades[2])
                      │
                      ▼
        ┌──────────────────────────┐
        │ getSessionMetrics():      │
        │ tradesOpen: 3             │
        │ totalRiskExposed: $450    │
        │ totalProfit: $0 (ongoing) │
        └──────────────────────────┘

┌─ TRADE 1 CLOSES TP ─────────┐
│ Profit: +$400               │
│ Moves to closedTrades[]     │
│                             │
│ New State:                  │
│ tradesOpen: 2               │
│ totalRiskExposed: $250      │
│ totalProfit: +$400          │
│ accountValue: $10,400       │
└─────────────────────────────┘
     │
     ▼
┌─ TRADE 2 CLOSES SL ─────────┐
│ Profit: -$100               │
│ Moves to closedTrades[]     │
│                             │
│ New State:                  │
│ tradesOpen: 1               │
│ totalRiskExposed: $150      │
│ totalProfit: +$300          │
│ accountValue: $10,300       │
│ Daily Loss: -1% (within 3%) │
└─────────────────────────────┘
```

---

## 9. FLUXO: VALIDAÇÕES E REJEIÇÕES

```
┌────────────────────────────────────────────────────────────┐
│ CENÁRIO: Trader tenta abrir posição muito grande          │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│ REQUEST: calculate-position                               │
│ Dados: Kelly, 10k account, 5% risk (= $500)               │
│        PETR4, 100 entry, 98 SL, 108 TP                    │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│ CÁLCULO:                                                  │
│ RR = 8 / 2 = 4.0                                          │
│ Kelly = (4×0.55 - 0.45) / 4 = 0.4375 (43.75%)           │
│ Conservative = 0.4375 × 0.25 = 10.94%                   │
│ Risk = 10,000 × 10.94% = $1,094                          │
│ Shares = 1,094 / 2 = 547                                 │
│ Position = 547 × 100 = $54,700                           │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│ VALIDATION CHECK:                                         │
│ Position % = 54,700 / 10,000 = 547% ✗ CRITICAL           │
│                                                           │
│ Risk Assessment:                                         │
│ canTrade: false                                           │
│ reason: "Position uses 547% of account (max 50%)"        │
│ riskLevel: "CRITICAL"                                    │
│ warning: "Excessive leverage"                            │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│ RESPONSE:                                                 │
│ HTTP 200                                                 │
│ {                                                        │
│   "position": { shares: 547, ... },                      │
│   "riskAssessment": {                                    │
│     "canTrade": false,                                   │
│     "reason": "Position uses 547% of account",           │
│     "riskLevel": "CRITICAL",                             │
│     "warnings": ["Excessive leverage"]                   │
│   }                                                      │
│ }                                                        │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│ FRONTEND FEEDBACK:                                        │
│ "❌ TRADE BLOQUEADO"                                      │
│ "Motivo: Alavancagem de 547%"                            │
│ "Máximo permitido: 50% da conta"                         │
│ "                                                        │
│ "Sugestões:"                                             │
│ "1. Aumentar capital (de $10k para $109k+)"              │
│ "2. Reduzir risco (de 5% para 1%)"                       │
│ "3. Aumentar distância do stop loss"                     │
└────────────────────────────────────────────────────────────┘
```

---

## 10. FLUXO: DRAWDOWN E DAILY LOSS LIMITS

```
┌─────────────────────────────────────────────────────────────┐
│ SESSION START: $10,000                                      │
│ Config: maxDailyLoss=-$300 (-3%), maxDrawdown=-$1000 (-10%) │
└────────────┬────────────────────────────────────────────────┘

Trade 1: -$200  → Account: $9,800 (Daily Loss: -2%) ✓
Trade 2: -$150  → Account: $9,650 (Daily Loss: -3.5%) ✗ LIMIT

┌────────────────────────────────────────────────────────────┐
│ NOVO TRADE REQUISITADO:                                    │
│ Daily Loss already: -$350 (exceeds -$300 limit)            │
│                                                            │
│ Risk Assessment:                                          │
│ canTrade: false                                            │
│ reason: "Daily loss limit exceeded ($350 > $300)"         │
│ riskLevel: "CRITICAL"                                     │
└────────────┬───────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│ FRONTEND:                                                 │
│ "❌ TRADING PAUSADO"                                      │
│ "Limite de perda diária atingido"                         │
│ "Perdido: $350 (máximo: $300)"                            │
│ "Espere o próximo dia para continuar"                     │
└────────────────────────────────────────────────────────────┘
```

---

## 11. DIAGRAMA DE ESTADO

```
┌─────────────────────────────────────────────────────────────┐
│                    TRADE STATE MACHINE                       │
└─────────────────────────────────────────────────────────────┘

              ┌─────────────────┐
              │   CALCULATING   │
              │    POSITION     │
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   ┌────────┐    ┌─────────┐    ┌──────────┐
   │REJECTED│    │ PENDING │    │ APPROVED │
   └────────┘    └────┬────┘    └────┬─────┘
                      │              │
                      ▼              ▼
                  ┌─────────┐    ┌──────────┐
                  │ EXPIRED │    │RECORDING │
                  └─────────┘    └────┬─────┘
                                      │
                                      ▼
                                  ┌──────────┐
                                  │   OPEN   │
                                  └────┬─────┘
                                       │
                  ┌────────────────────┼────────────────────┐
                  │                    │                    │
                  ▼                    ▼                    ▼
            ┌──────────┐          ┌──────────┐        ┌──────────┐
            │CLOSED_TP │          │CLOSED_SL │        │CLOSED_MAN│
            │ (Lucro)  │          │ (Perda)  │        │ (Manual) │
            └────┬─────┘          └────┬─────┘        └────┬─────┘
                 │                     │                    │
                 └─────────────────────┼────────────────────┘
                                       │
                                       ▼
                                  ┌─────────┐
                                  │COMPLETED│
                                  └─────────┘
```

---

## 12. ARQUITETURA DE REQUISIÇÃO

```
USER INPUT (Frontend)
    │
    ├─→ Calculate Position
    │   POST /api/risk/calculate-position
    │   │
    │   ├─→ Validate Input
    │   ├─→ Calculate RR Ratio
    │   ├─→ Select Method (Kelly/Fixed/Fixed Amount)
    │   ├─→ Calculate Position Size
    │   ├─→ Assess Risk
    │   └─→ Return Result
    │
    ├─→ Record Trade
    │   POST /api/risk/record-trade
    │   │
    │   ├─→ Validate Input
    │   ├─→ Create TradeRecord
    │   ├─→ Add to openTrades[]
    │   └─→ Return Confirmation
    │
    ├─→ Close Trade
    │   POST /api/risk/close-trade
    │   │
    │   ├─→ Find Trade in openTrades[]
    │   ├─→ Calculate P&L
    │   ├─→ Move to closedTrades[]
    │   └─→ Return Result
    │
    └─→ Get Session Metrics
        GET /api/risk/session-metrics
        │
        ├─→ Count openTrades
        ├─→ Sum Risk Exposed
        ├─→ Sum Profits
        ├─→ Calculate Account Value
        └─→ Return Metrics
```

---

**Fim dos Fluxos de Negócio**

Este documento define todos os fluxos principales de Fase 2h, desde o cálculo de posição até o fechamento de trades com métricas de sessão.
