# Fase 2d - Data Providers - FLUXOS

**Data**: 2024-01-20

---

## 🔄 Fluxo Principal - getQuote()

```
┌─────────────────────────────────────────┐
│   Client: GET /api/market/quote/PETR4   │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│   Middleware: authMiddleware            │
│   - Valida JWT token                    │
│   - Extrai user do token                │
└──────────┬──────────────────────────────┘
           │ ✅ Token válido
           ▼
┌─────────────────────────────────────────┐
│   Middleware: rbacMiddleware            │
│   - Roles permitidas: [ADMIN, TRADER]   │
│   - Verifica role do usuário            │
└──────────┬──────────────────────────────┘
           │ ✅ Role OK
           ▼
┌─────────────────────────────────────────┐
│   MarketService.getQuote('PETR4')       │
└──────────┬──────────────────────────────┘
           │
           ▼
    ┌──────────────┐
    │  PETR4       │
    │  Detecta B3? │
    │ 4 letras +   │
    │  1 número    │
    └──────┬───────┘
           │ ✅ SIM (B3)
           ▼
┌─────────────────────────────────────────┐
│   BrapiAdapter.getQuote('PETR4')        │
│   - URL: brapi.dev/api/quote/PETR4      │
│   - Timeout: 10s                        │
│   - Cache: 60s TTL                      │
└──────────┬──────────────────────────────┘
           │
        ┌──┴──┐
        ▼     ▼
    ✅ OK   ❌ ERROR
        │     │
        │     └──────────┐
        │                ▼
        │     ┌─────────────────────────┐
        │     │ Log warning: Fallback   │
        │     │ Tentando Yahoo...       │
        │     └────────┬────────────────┘
        │              │
        │              ▼
        │     ┌─────────────────────────┐
        │     │ YahooAdapter.getQuote   │
        │     │ ('PETR4.SA')            │
        │     │ - Adiciona sufixo .SA   │
        │     │ - URL: query1.finance   │
        │     │ - Timeout: 10s          │
        │     │ - Cache: 60s TTL        │
        │     └────────┬────────────────┘
        │              │
        └──────┬───────┘
               │
               ▼
        ┌────────────────────┐
        │  Format response   │
        │  - symbol          │
        │  - lastPrice       │
        │  - change          │
        │  - changePercent   │
        │  - volume          │
        │  - currency        │
        │  - source (BRAPI   │
        │    ou YAHOO)       │
        └────────┬───────────┘
                 │
                 ▼
        ┌────────────────────┐
        │  Log info:         │
        │  Cotação obtida    │
        │  (estruturada JSON)│
        └────────┬───────────┘
                 │
                 ▼
        ┌────────────────────┐
        │  Response 200 OK   │
        │  {                 │
        │    success: true,  │
        │    data: { ... }   │
        │  }                 │
        └────────────────────┘
```

---

## 🔄 Fluxo - getQuotes (múltiplos)

```
POST /api/market/quotes
Body: { tickers: ['PETR4', 'VALE3', 'AAPL', 'MSFT', 'BTC-USD'] }

           ▼
┌──────────────────────────────────────┐
│  MarketService.getQuotes(tickers)    │
│  - Recebe array de 5 tickers         │
│  - Max 20 tickers por request        │
└──────────┬───────────────────────────┘
           │
           ▼
    ┌──────────────────────────┐
    │ Separar por tipo:        │
    │  B3: [PETR4, VALE3]      │
    │  EUA: [AAPL, MSFT]       │
    │  Crypto: [BTC-USD]       │
    └──────┬───────────────────┘
           │
         ┌─┴─┬─────────┐
         ▼   ▼         ▼
    ┌────────────┐ ┌────────────┐ ┌────────────┐
    │ BrapiAdapter
    │ .getQuotes │ │YahooAdapter│ │YahooAdapter│
    │ (['PETR4', │ │.getQuotes  │ │.getQuote   │
    │  'VALE3']) │ │(['AAPL',   │ │('BTC-USD') │
    │            │ │ 'MSFT'])   │ │            │
    │ Paralelo:  │ │            │ │ Paralelo:  │
    │ max 5 conc │ │Paralelo:   │ │ max 5 conc │
    └─────┬──────┘ │ max 5 conc │ └─────┬──────┘
          │        └─────┬──────┘       │
          │              │              │
          └──────────┬───┴──────────────┘
                     │
                     ▼
          ┌──────────────────────────┐
          │ Merge Map results:       │
          │ {                        │
          │   'PETR4': {brapi},      │
          │   'VALE3': {brapi},      │
          │   'AAPL': {yahoo},       │
          │   'MSFT': {yahoo},       │
          │   'BTC-USD': {yahoo}     │
          │ }                        │
          └──────────┬───────────────┘
                     │
                     ▼
          ┌──────────────────────────┐
          │ Log info:                │
          │ "5 quotes obtidas"       │
          │ (JSON estruturado)       │
          └──────────┬───────────────┘
                     │
                     ▼
          Response 200: count: 5
```

---

## 📊 Fluxo - getHistoricalDaily (com cache Prisma)

```
GET /api/market/historical/PETR4?days=365

           ▼
┌──────────────────────────────────────────┐
│ MarketService.getHistoricalDaily()       │
│ ticker='PETR4', days=365                 │
└──────────┬───────────────────────────────┘
           │
           ▼
    ┌────────────────────────────┐
    │ Checar DB Prisma:          │
    │ SELECT * FROM Candle       │
    │ WHERE symbol='PETR4'       │
    │ ORDER BY date DESC         │
    │ LIMIT 365                  │
    └────────┬───────────────────┘
             │
        ┌────┴────┐
        ▼         ▼
    HIT      MISS
    (52%)    (48%)
    │         │
    ▼         ▼
   ✅        ┌───────────────────────────┐
   Use      │ Cache < 80% ?              │
   DB       │ 52 candles < 292 (80%)     │
   │        │ SIM, precisa de API        │
   │        └───────────┬────────────────┘
   │                    │ ✅ SIM
   │                    ▼
   │         ┌───────────────────────────┐
   │         │ YahooAdapter              │
   │         │ .getHistoricalDaily()     │
   │         │ ('PETR4', 365)            │
   │         │ - Fetch últimos 365 dias  │
   │         │ - Parse OHLCV             │
   │         │ - Timeout: 15s            │
   │         └───────────┬────────────────┘
   │                     │
   │                     ▼
   │         ┌───────────────────────────┐
   │         │ Filter duplicatas:        │
   │         │ SELECT DISTINCT           │
   │         │ FROM Candle               │
   │         │ WHERE symbol='PETR4'      │
   │         │ AND date IN (new_dates)   │
   │         └───────────┬────────────────┘
   │                     │
   │                     ▼
   │         ┌───────────────────────────┐
   │         │ INSERT new candles:       │
   │         │ Prisma.candle.createMany()│
   │         │ [365 registros]           │
   │         │ (batch insert)            │
   │         └───────────┬────────────────┘
   │                     │
   └──────────┬──────────┘
              │
              ▼
   ┌──────────────────────────┐
   │ Query final:             │
   │ SELECT * FROM Candle     │
   │ WHERE symbol='PETR4'     │
   │ ORDER BY date DESC       │
   │ LIMIT 365                │
   │ [Agora com 365 candles]  │
   └──────────┬───────────────┘
              │
              ▼
   ┌──────────────────────────┐
   │ Format OHLCV:            │
   │ { date, open, high, low, │
   │   close, volume }        │
   └──────────┬───────────────┘
              │
              ▼
   Response 200: count: 365
```

**Cache Hit Timeline:**
```
Day 1:   0 candles in DB    → Fetch 365 from API → Store in DB (100% miss)
Day 2:   365 candles in DB  → 100% hit, uso DB   (0% miss)
Day 3:   365 candles in DB  → 100% hit, uso DB   (0% miss)
...
Day 366: 365 candles in DB  → 100% hit, uso DB   (0% miss)
Day 367: 366 candles in DB  → 100% hit, uso DB   (0% miss)
```

**Resultado**: Após Day 1, todas as requisições de histórico são <10ms (DB query)

---

## 🏥 Fluxo - health()

```
GET /api/market/health
Authorization: Bearer <token_admin>

           ▼
┌──────────────────────────────┐
│ MarketService.health()       │
└──────────┬────────────────────┘
           │
        ┌──┴──┐
        ▼     ▼
    ┌─────────────────────┐
    │ BrapiAdapter        │
    │ .health()           │
    │ - Ping brapi.dev    │
    │ - Timeout: 5s       │
    └────────┬────────────┘
             │
        ┌────┴────┐
        ▼         ▼
       ✅        ❌
       UP        DOWN
       │         │
    ┌──┴──┐
    ▼     ▼
    ┌─────────────────────┐
    │ YahooAdapter        │
    │ .health()           │
    │ - Ping query1       │
    │ - Timeout: 5s       │
    └────────┬────────────┘
             │
        ┌────┴────┐
        ▼         ▼
       ✅        ❌
       UP        DOWN
       │         │
       └────┬────┘
            ▼
    ┌──────────────────────────┐
    │ Determine status:        │
    │ - brapi: ✅ UP           │
    │ - yahoo: ✅ UP           │
    │ - overall: ✅ OK         │
    │                          │
    │ OR                       │
    │                          │
    │ - brapi: ❌ DOWN         │
    │ - yahoo: ✅ UP           │
    │ - overall: ⚠️ DEGRADED   │
    │                          │
    │ OR                       │
    │                          │
    │ - brapi: ❌ DOWN         │
    │ - yahoo: ❌ DOWN         │
    │ - overall: 🔴 CRITICAL   │
    └──────────┬───────────────┘
               │
               ▼
    Response 200/503
    {
      success: true/false,
      data: {
        brapi: "✅ UP",
        yahoo: "✅ UP",
        overall: "✅ OK"
      }
    }
```

---

## 🔀 Fluxo de Detecção B3 vs EUA

```
Input: ticker string

        ▼
    ┌────────────────────┐
    │ Regex check:       │
    │ /^[A-Z]{4}\d$/     │
    │                    │
    │ Exemplos:          │
    │ PETR4  ✅ B3       │
    │ VALE3  ✅ B3       │
    │ BBDC4  ✅ B3       │
    │ AAPL   ❌ não é    │
    │ BTC-USD❌ não é    │
    │ PETR4.SA❌ tem .   │
    └────────┬───────────┘
             │
        ┌────┴────┐
        ▼         ▼
       SIM        NÃO
      (B3)       (EUA/Global)
       │           │
       ▼           ▼
    ┌─────────────────────┐
    │ BrapiAdapter        │ YahooAdapter
    │ (direto PETR4)      │ (direto AAPL)
    │ OU                  │ OU
    │ Fallback:           │ Yahoo cripto
    │ YahooAdapter        │ (BTC-USD)
    │ (PETR4.SA)          │ OU
    └────────┬────────────┘ Yahoo índice
             │              (^BVSP)
             ▼              │
        Return Quote        ▼
                        Return Quote
```

**Lógica no código:**
```typescript
const isB3 = !ticker.includes('.') && ticker.match(/^[A-Z]{4}\d$/);

if (isB3) {
  // Tentar Brapi, fallback Yahoo .SA
  return await getQuoteB3(ticker);
} else {
  // Direto Yahoo
  return await getQuoteUSA(ticker);
}
```

---

## ❌ Fluxo de Error Handling

```
Request: /api/market/quote/INVALID

           ▼
    ┌──────────────────┐
    │ Validation Joi   │
    │ ticker regex:    │
    │ /^[A-Z0-9.^-]+$/ │
    └────────┬─────────┘
             │
        ┌────┴────┐
        ▼         ▼
      PASS      FAIL
      │         │
      │         ▼
      │    Response 400
      │    {
      │      success: false,
      │      error: "VALIDATION_ERROR",
      │      details: "..."
      │    }
      │
      ▼
    ┌────────────────────┐
    │ BrapiAdapter       │
    │ .getQuote('INVALID')
    └────────┬───────────┘
             │
        ┌────┴────────┐
        ▼             ▼
      404          TIMEOUT
      │            │
      ▼            ▼
    ┌──────────────────────┐
    │ Fallback: Yahoo      │
    │ .getQuote('INVALID') │
    └────────┬─────────────┘
             │
        ┌────┴────────┐
        ▼             ▼
      404          TIMEOUT
      │            │
      ▼            ▼
    ┌────────────────────────────┐
    │ Both failed               │
    │ Log error (structured)    │
    │ Count retries             │
    └────────┬───────────────────┘
             │
             ▼
    Response 500
    {
      success: false,
      error: "MARKET_ERROR",
      message: "Falha ao obter cotação",
      details: "Brapi: 404 | Yahoo: 404"
    }
```

---

## 🔐 Fluxo com RBAC

```
Request: GET /api/market/historical/PETR4

           ▼
    ┌──────────────────────────┐
    │ authMiddleware           │
    │ Valida JWT token         │
    │ Extrai userId, role      │
    │ user = {                 │
    │   id: 123,               │
    │   role: 'VIEW'           │
    │ }                        │
    └────────┬─────────────────┘
             │ ✅ Token OK
             ▼
    ┌──────────────────────────┐
    │ rbacMiddleware           │
    │ (['ADMIN', 'TRADER'])    │
    │                          │
    │ Requeridos: ADMIN/TRADER │
    │ Usuário: VIEW            │
    │                          │
    │ 'VIEW' não está em       │
    │ ['ADMIN', 'TRADER']      │
    └────────┬─────────────────┘
             │ ❌ Não autorizado
             ▼
    Response 403 FORBIDDEN
    {
      success: false,
      error: "RBAC_ERROR",
      message: "Acesso negado para role VIEW"
    }

---

SE user.role = 'TRADER':

    ┌──────────────────────────┐
    │ rbacMiddleware check     │
    │ 'TRADER' está em         │
    │ ['ADMIN', 'TRADER'] ✅   │
    └────────┬─────────────────┘
             │ ✅ Autorizado
             ▼
    ┌──────────────────────────┐
    │ Proceder com request     │
    │ MarketService.getHistory │
    │ (...)                    │
    └────────┬─────────────────┘
             │
             ▼
    Response 200 OK
```

**Endpoints e seus RBAC:**

| Endpoint | GET/POST | RBAC |
|----------|----------|------|
| /quote/:ticker | GET | ['ADMIN','TRADER','VIEW'] |
| /quotes | POST | ['ADMIN','TRADER','VIEW'] |
| /historical/:ticker | GET | ['ADMIN','TRADER'] |
| /health | GET | ['ADMIN'] |
| /cache/clear | POST | ['ADMIN'] |

---

## 📱 Fluxo Completo: Usuário novo

```
[NOVO USUÁRIO]

    1. POST /api/auth/register
       { email, password, name }
           ▼
       AuthService.register()
           ▼
       Cria User (role: default 'VIEW')
           ▼
       Response: { token_access, token_refresh }

    2. GET /api/market/quote/PETR4
       { Authorization: Bearer <access_token> }
           ▼
       authMiddleware ✅ (token válido)
           ▼
       rbacMiddleware(['ADMIN','TRADER','VIEW']) ✅ (VIEW está permitida)
           ▼
       MarketService.getQuote('PETR4')
           ▼
       BrapiAdapter.getQuote('PETR4') ✅
           ▼
       Response 200: { PETR4 quote data }

    3. GET /api/market/historical/PETR4
       { Authorization: Bearer <access_token> }
           ▼
       authMiddleware ✅
           ▼
       rbacMiddleware(['ADMIN','TRADER']) ❌ (VIEW não permitida)
           ▼
       Response 403 FORBIDDEN

    4. UPDATE role → 'TRADER' (por admin)
       
    5. GET /api/market/historical/PETR4
       { Authorization: Bearer <access_token> }
           ▼
       authMiddleware ✅
           ▼
       rbacMiddleware(['ADMIN','TRADER']) ✅ (TRADER permitida)
           ▼
       MarketService.getHistoricalDaily('PETR4', 365)
           ▼
       Query Prisma Candle (primeiro dia: vazio)
           ▼
       Fallback: YahooAdapter.getHistoricalDaily('PETR4', 365)
           ▼
       Insere 365 candles em Prisma
           ▼
       Response 200: { 365 candles }
```

---

## 🔄 Ciclo de Vida de 1 semana

```
|  Dia 1  | Dia 2-7 | 
|---------|---------|
| Cold    | Warm    |
| Cache   | Cache   |
|---------|---------|

┌────────────────────────────────────────┐
│ DIA 1: COLD START                      │
├────────────────────────────────────────┤
│ Requisições: GET /historical/PETR4     │
│                                        │
│ Em memória (60s TTL):     ❌ Vazio     │
│ BD Prisma Candle:         ❌ Vazio     │
│                                        │
│ Fluxo:                                 │
│ 1. Query Prisma        → 0 candles     │
│ 2. Fetch Yahoo         → 365 candles   │
│ 3. Insere Prisma       → 365 candles   │
│ 4. Return 365          → cliente       │
│                                        │
│ Tempo total: ~2000ms (network)         │
│ Num requisições API: 1 (Yahoo)         │
│ Num requisições DB: 2 (select+insert)  │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ DIA 2-7: WARM CACHE                    │
├────────────────────────────────────────┤
│ Requisições: GET /historical/PETR4     │
│ (mesma requisição, mesmo ticker)       │
│                                        │
│ Em memória (60s): pode estar ✅         │
│ BD Prisma Candle: 365 candles ✅       │
│                                        │
│ Fluxo (cache hit):                     │
│ 1. Query Prisma        → 365 candles   │
│ 2. Calcula %           → 100% (OK)     │
│ 3. Return 365          → cliente       │
│ 4. Sem chamada API!                    │
│                                        │
│ Tempo total: ~50ms (DB query)          │
│ Num requisições API: 0 (cache hit!)    │
│ Num requisições DB: 1 (select)         │
│                                        │
│ ECONOMIA: 2000ms → 50ms (40x rápido)   │
│ ECONOMIA: $1 API → $0 (40x mais barato)│
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ INCREMENTO NOVO DIA:                   │
│ (Próximo ticker novo, ex: VALE3)       │
├────────────────────────────────────────┤
│ Mesma sequência que Dia 1              │
│ Cold start para novo ticker            │
│                                        │
│ Mas tickers antigos (PETR4, etc)       │
│ continuam em cache Prisma ✅            │
│                                        │
│ Crescimento BD:                        │
│ PETR4: 365 candles                     │
│ VALE3: 365 candles (novo)              │
│ AAPL:  365 candles (novo)              │
│ ...                                    │
│                                        │
│ Após 1 mês: ~12,000 candles no BD      │
│ (apenas 1 vez por ticker)              │
└────────────────────────────────────────┘
```

---

**Status**: ✅ FLUXOS DOCUMENTADOS  
**Última atualização**: 2024-01-20
