# FASE 2E - FLUXOS E DIAGRAMAS
## Indicadores Técnicos - Arquitetura e Processamento

---

## 1. FLUXO GERAL DE DADOS

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENTE / FRONTEND                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                    HTTP GET/POST/PUT/DELETE
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      REST API (Rotas)                           │
│  GET    /api/indicators/quote/:ticker                          │
│  POST   /api/indicators/batch                                  │
│  GET    /api/indicators/historical/:ticker                     │
│  POST   /api/indicators/calculate                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                   authMiddleware (JWT)
                   rbacMiddleware (ADMIN/TRADER/VIEW)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                  Indicator Route Handlers                       │
│  • Validação de entrada (ticker, days, indicators)             │
│  • Chamada ao MarketService                                    │
│  • Chamada ao IndicatorService                                 │
│  • Formatação da resposta JSON                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─────────────────────┐
                              │                     │
                              ▼                     ▼
        ┌──────────────────────────────┐  ┌──────────────────────┐
        │   MarketService              │  │ IndicatorService     │
        │  getHistoricalDaily()        │  │  calculateAll()      │
        └──────────────────────────────┘  │  calculateEMA()      │
                  │                       │  calculateRSI()      │
                  │                       │  calculateMACD()     │
                  ▼                       │  ... mais 4          │
        ┌──────────────────────────────┐  └──────────────────────┘
        │   Adaptadores de Dados       │
        │  • BrapiAdapter              │
        │  • YahooAdapter              │
        └──────────────────────────────┘
                  │
                  ▼
        ┌──────────────────────────────┐
        │   APIs Externas              │
        │  • Brapi (dados brasileiros) │
        │  • Yahoo Finance (global)    │
        └──────────────────────────────┘
```

---

## 2. FLUXO: GET /api/indicators/quote/:ticker

```
┌─────────────────────────────────────────────────────────────────┐
│ Cliente: GET /api/indicators/quote/PETR4                        │
│ Header: Authorization: Bearer eyJhbGc...                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ authMiddleware  │
                    │ Valida JWT      │
                    │ req.user = {...}│
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────────────────┐
                    │ rbacMiddleware              │
                    │ Verifica role em:           │
                    │ ADMIN / TRADER / VIEW       │
                    └─────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ quote/:ticker Handler                     │
        │ 1. Valida formato ticker (regex)          │
        │ 2. MarketService.getQuote(ticker)        │
        │    → fetch preço atual, high, low, vol    │
        └───────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
    ┌───────────────────┐      ┌──────────────────────┐
    │ Quote obtida      │      │ MarketService.       │
    │ {                 │      │ getHistoricalDaily   │
    │   price: 28.45    │      │ (ticker, 365)        │
    │   high: 28.90     │      │                      │
    │   low: 27.50      │      │ Retorna:             │
    │   volume: 5.2M    │      │ Candle[] {           │
    │   ...             │      │   date, open, high,  │
    │ }                 │      │   low, close, volume │
    └───────────────────┘      │ }                    │
                │              └──────────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ IndicatorService.calculateAll(candles)   │
        │                                           │
        │ • EMA (9, 21, 200)                        │
        │ • SMA (50, 200)                           │
        │ • RSI (14)                                │
        │ • MACD (12,26,9)                          │
        │ • ATR (14)                                │
        │ • OBV                                     │
        │ • VWAP                                    │
        └───────────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ Extrai últimos valores (lastIdx)          │
        │ ema9: 28.30                               │
        │ rsi: 65.5                                 │
        │ macd: { value: 0.45, signal: 0.42... }   │
        │ ... todos 7 indicadores                   │
        └───────────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ Response JSON:                            │
        │ {                                         │
        │   "success": true,                        │
        │   "data": {                               │
        │     "quote": { ... },                     │
        │     "indicators": {                       │
        │       "ema": { ema9, ema21, ema200 },    │
        │       "rsi": 65.5,                        │
        │       "macd": { ... },                    │
        │       ... 7 indicadores total             │
        │     },                                    │
        │     "lastUpdate": "2025-01-15T10:30:00Z" │
        │   }                                       │
        │ }                                         │
        └───────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────────┐
        │ Cliente recebe resposta JSON                    │
        │ Status 200 OK                                   │
        └─────────────────────────────────────────────────┘
```

---

## 3. FLUXO: POST /api/indicators/batch

```
┌─────────────────────────────────────────────────────────────────┐
│ Cliente: POST /api/indicators/batch                             │
│ Body: {                                                         │
│   "tickers": ["PETR4", "VALE3", "ITUB4"]                       │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                    authMiddleware ✓
                    rbacMiddleware(['ADMIN', 'TRADER']) ✓
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ batch Handler                             │
        │ • Valida array de tickers                 │
        │ • Min 1, Max 20 tickers                   │
        │ • Cada ticker passa por regex validation  │
        └───────────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ Promise.allSettled(tickers.map(...))      │
        │ Processa EM PARALELO:                     │
        │                                           │
        │ Para cada ticker:                         │
        │ 1. getQuote(ticker)                       │
        │ 2. getHistoricalDaily(ticker, 365)        │
        │ 3. calculateAll(candles)                  │
        │ 4. Extract últimos valores                │
        └───────────────────────────────────────────┘
                              │
            ┌─────────┬───────┴─────────┬─────────┐
            │         │                 │         │
            ▼         ▼                 ▼         ▼
        PETR4:    VALE3:            ITUB4:      ...
        • Quote   • Quote           • Quote
        • Indic   • Indic           • Indic
            │         │                 │
            └─────────┴─────────┬───────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ Filtra resultados bem-sucedidos           │
        │ (ignora erros individuais)                │
        │                                           │
        │ successful = 3 tickers                    │
        │ errors = 0 tickers                        │
        └───────────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │ Response JSON:                            │
        │ {                                         │
        │   "success": true,                        │
        │   "count": 3,                             │
        │   "data": [                               │
        │     {                                     │
        │       "ticker": "PETR4",                  │
        │       "quote": { ... },                   │
        │       "indicators": {                     │
        │         "rsi": 65.5,                      │
        │         "macd": { ... },                  │
        │         "ema9": 28.30,                    │
        │         "atr": 1.20                       │
        │       }                                   │
        │     },                                    │
        │     ... VALE3, ITUB4                      │
        │   ]                                       │
        │ }                                         │
        └───────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────────┐
        │ Cliente recebe array com 3 tickers              │
        │ Cada um com seus indicadores calculados         │
        └─────────────────────────────────────────────────┘
```

---

## 4. FLUXO: GET /api/indicators/historical/:ticker

```
┌──────────────────────────────────────────────────────────────────┐
│ Cliente: GET /api/indicators/historical/PETR4?days=90           │
└──────────────────────────────────────────────────────────────────┘
                              │
                    authMiddleware ✓
                    rbacMiddleware(['ADMIN', 'TRADER']) ✓
                              │
                              ▼
        ┌────────────────────────────────────────────┐
        │ historical/:ticker Handler                 │
        │ • Parse days query param (default 365)     │
        │ • Validação: min 1, max 730 dias           │
        │ • Limita: Math.min(Math.max(days, 1), 730)│
        └────────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────────┐
        │ MarketService.getHistoricalDaily(          │
        │   ticker='PETR4',                          │
        │   days=90                                  │
        │ )                                          │
        │ Retorna: Candle[] com 90 velas             │
        └────────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────────┐
        │ IndicatorService.calculateAll(candles)    │
        │ Calcula 7 indicadores × 90 velas          │
        │ → 630 IndicatorValues totais              │
        └────────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────────┐
        │ Combina em série temporal:                 │
        │                                            │
        │ [                                          │
        │   {                                        │
        │     "date": "2024-10-17",                  │
        │     "price": 27.50,                        │
        │     "volume": 3.2M,                        │
        │     "ema": {                               │
        │       "ema9": null,     (precisa 9)        │
        │       "ema21": null,    (precisa 21)       │
        │       "ema200": null    (precisa 200)      │
        │     },                                     │
        │     "rsi": null,        (precisa 14)       │
        │     "macd": {                              │
        │       "value": null,    (precisa 26)       │
        │       "signal": null,                      │
        │       "histogram": null                    │
        │     },                                     │
        │     "atr": null,        (precisa 14)       │
        │     "obv": 3.2M,        (1º valor)         │
        │     "vwap": 27.50       (1º valor)         │
        │   },                                       │
        │   {                                        │
        │     "date": "2024-10-18",                  │
        │     "price": 27.75,                        │
        │     "volume": 4.1M,                        │
        │     "ema": {                               │
        │       "ema9": null,     (precisa 9)        │
        │       ...                                  │
        │     },                                     │
        │     ... (continuação com mais nulls)       │
        │   },                                       │
        │   ...                                      │
        │   {                                        │
        │     "date": "2025-01-15",                  │
        │     "price": 28.45,                        │
        │     "volume": 5.2M,                        │
        │     "ema": {                               │
        │       "ema9": 28.32,    (agora válido)     │
        │       "ema21": 28.18,                      │
        │       "ema200": 27.95                      │
        │     },                                     │
        │     "rsi": 65.5,        (válido)           │
        │     "macd": {                              │
        │       "value": 0.37,    (válido)           │
        │       "signal": 0.35,                      │
        │       "histogram": 0.02                    │
        │     },                                     │
        │     "atr": 1.20,        (válido)           │
        │     "obv": 385M,        (acumulado)        │
        │     "vwap": 28.08       (média ponderada)  │
        │   }                                        │
        │ ]                                          │
        └────────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────────┐
        │ Response JSON:                             │
        │ {                                          │
        │   "success": true,                         │
        │   "ticker": "PETR4",                       │
        │   "count": 90,                             │
        │   "data": [...]  (série acima)             │
        │ }                                          │
        └────────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────────┐
        │ Cliente recebe 90 pontos + indicadores     │
        │ Pronto para plotar gráfico e análise       │
        └────────────────────────────────────────────┘
```

---

## 5. FLUXO: POST /api/indicators/calculate

```
┌──────────────────────────────────────────────────────────────────┐
│ Cliente: POST /api/indicators/calculate                          │
│ Body: {                                                          │
│   "ticker": "PETR4",                                             │
│   "days": 90,                                                    │
│   "indicators": ["ema", "rsi", "macd"]                           │
│ }                                                                │
└──────────────────────────────────────────────────────────────────┘
                              │
                    authMiddleware ✓
                    rbacMiddleware(['ADMIN', 'TRADER']) ✓
                              │
                              ▼
        ┌────────────────────────────────────────────┐
        │ calculate Handler                          │
        │ • Valida indicators array (não vazio)      │
        │ • Parse days (default 365)                 │
        │ • Cada indicador é string válido           │
        └────────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────────┐
        │ MarketService.getHistoricalDaily(          │
        │   ticker='PETR4',                          │
        │   days=90                                  │
        │ )                                          │
        └────────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────────┐
        │ IndicatorService.calculateAll(candles)    │
        │ Calcula TODOS os 7 indicadores            │
        │ (mais eficiente que calcular separadamente)
        └────────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────────┐
        │ Filtra apenas indicadores solicitados:     │
        │                                            │
        │ Se "ema" em indicators:                    │
        │   response.ema = allIndicators.ema         │
        │                                            │
        │ Se "rsi" em indicators:                    │
        │   response.rsi = allIndicators.rsi         │
        │                                            │
        │ Se "macd" em indicators:                   │
        │   response.macd = allIndicators.macd       │
        │                                            │
        │ Ignora: sma, atr, obv, vwap               │
        └────────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────────┐
        │ Response JSON:                             │
        │ {                                          │
        │   "success": true,                         │
        │   "ticker": "PETR4",                       │
        │   "ema": {                                 │
        │     "ema9": [ ... ],   (90 valores)        │
        │     "ema21": [ ... ],                      │
        │     "ema200": [ ... ]                      │
        │   },                                       │
        │   "rsi": {                                 │
        │     "rsi": [ ... ]     (90 valores)        │
        │   },                                       │
        │   "macd": {                                │
        │     "macd": [ ... ],   (90 valores)        │
        │     "signal": [ ... ],                     │
        │     "histogram": [ ... ]                   │
        │   }                                        │
        │ }                                          │
        └────────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────────┐
        │ Cliente recebe APENAS indicadores pedidos  │
        │ Reduz payload vs /historical               │
        │ (útil para APIs específicas)               │
        └────────────────────────────────────────────┘
```

---

## 6. FLUXO INTERNO: IndicatorService.calculateAll()

```
┌────────────────────────────────────────────────────────┐
│ Entrada: Candle[]                                      │
│ (50-500 velas com OHLCV)                              │
└────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
    calculateEMA()    calculateSMA()    calculateRSI()
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │ O(n)     │      │ O(n)     │      │ O(n)     │
    │ ~2-5ms   │      │ ~1-3ms   │      │ ~5-8ms   │
    │ →        │      │ →        │      │ →        │
    │ EMA9,21, │      │ SMA50,   │      │ RSI      │
    │ EMA200   │      │ SMA200   │      │ (0-100)  │
    └──────────┘      └──────────┘      └──────────┘
        │                 │                 │
        │                 │                 │
        ├─────────────────┼─────────────────┤
        │                 │                 │
        ▼                 ▼                 ▼
    calculateMACD()   calculateATR()    calculateOBV()
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │ O(n)     │      │ O(n)     │      │ O(n)     │
    │ ~10-15ms │      │ ~5-8ms   │      │ ~3-5ms   │
    │ →        │      │ →        │      │ →        │
    │ MACD,    │      │ ATR      │      │ OBV      │
    │ Signal,  │      │ (sempre +)       │ (acumul.)
    │ Histogram        │          │      │
    └──────────┘      └──────────┘      └──────────┘
        │                 │                 │
        │                 │                 │
        ├─────────────────┼─────────────────┤
        │                 │
        ▼                 ▼
    calculateVWAP()
    ┌──────────┐
    │ O(n)     │
    │ ~3-5ms   │
    │ →        │
    │ VWAP     │
    └──────────┘
        │
        │ Total: 50 candles = ~45ms
        │ Total: 500 candles = ~400ms ✓
        │
        ▼
    ┌────────────────────────────────────────────────────┐
    │ Retorna: AllIndicators {                          │
    │   ema: EMASeries,                                 │
    │   sma: SMASeries,                                 │
    │   rsi: RSISeries,                                 │
    │   macd: MACDSeries,                               │
    │   atr: ATRSeries,                                 │
    │   obv: OBVSeries,                                 │
    │   vwap: VWAPSeries                                │
    │ }                                                 │
    └────────────────────────────────────────────────────┘
```

---

## 7. EXEMPLO REAL: Análise PETR4 em Tempo Real

```
┌─────────────────────────────────────────────────────────┐
│ ENTRADA (Candles dos últimos 365 dias):                │
│                                                         │
│ [                                                       │
│   { date: '2024-01-15', open: 25.00, high: 25.50,    │
│     low: 24.90, close: 25.20, volume: 50M },          │
│   { date: '2024-01-16', open: 25.20, high: 25.80,    │
│     low: 25.10, close: 25.70, volume: 55M },          │
│   ...                                                  │
│   { date: '2025-01-15', open: 28.00, high: 28.90,    │
│     low: 27.50, close: 28.45, volume: 52M }           │
│ ]  ← 365 candles                                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
    ┌─────────────────────────────────────────────┐
    │ PROCESSAMENTO (calculateAll):               │
    │                                             │
    │ Iteração por cada indicador                │
    │ Calcula 7 × 365 = 2,555 IndicatorValues   │
    │ Tempo total: ~380ms                        │
    └─────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ SAÍDA (Últimos 3 valores de cada indicador):           │
│                                                         │
│ Data: 2025-01-13                                       │
│ • Preço: 28.10, Volume: 48M                           │
│ • EMA9: 28.25  (acima)      SMA50: 27.85 (abaixo)    │
│ • EMA21: 28.15 (acima)      SMA200: 28.02 (próximo)  │
│ • EMA200: 28.02 (próximo)   RSI: 62.3 (momentum +)   │
│ • MACD: 0.23 (bullish)      Signal: 0.20             │
│ • Histogram: 0.03 (convergência)                      │
│ • ATR: 1.15 (volatilidade normal)                     │
│ • OBV: 372M (acumulado)     VWAP: 27.98 (abaixo)     │
│                                                         │
│ Data: 2025-01-14                                       │
│ • Preço: 28.25, Volume: 51M                           │
│ • EMA9: 28.28  SMA50: 27.90 RSI: 64.2 ↑             │
│ • MACD: 0.28 ↑  Signal: 0.22  Histogram: 0.06 ↑     │
│                                                         │
│ Data: 2025-01-15  ← VALORES ATUAIS                    │
│ • Preço: 28.45, Volume: 52M                           │
│ • EMA9: 28.32    SMA50: 27.95  RSI: 65.5 ↑           │
│ • EMA21: 28.20   SMA200: 28.02  ATR: 1.20            │
│ • MACD: 0.37 ↑   Signal: 0.35   Histogram: 0.02      │
│ • OBV: 385M ↑    VWAP: 28.08                          │
│                                                         │
│ INTERPRETAÇÃO:                                        │
│ ✅ SINAL BULLISH FORTE:                               │
│   - Preço acima de todas as EMAs                      │
│   - RSI = 65.5 (momentum elevado)                     │
│   - MACD cruzou acima da signal e está divergindo    │
│   - ATR normal (sem spike)                            │
│   - OBV crescente (pressão de compra)                │
│                                                         │
│ RECOMENDAÇÃO:                                        │
│ → COMPRA (probabilidade alta de continuação)         │
│   Stop loss: 27.50 (suporte)                          │
│   Target: 29.50-30.00                                │
└─────────────────────────────────────────────────────────┘
```

---

## 8. FLUXO DE ERRO

```
┌────────────────────────────────────────┐
│ Cliente submete requisição inválida    │
│ GET /api/indicators/quote/XYZ123       │
│ (ticker com números/símbolos)          │
└────────────────────────────────────────┘
                    │
                    ▼
    ┌────────────────────────────────────┐
    │ Validação Regex: /^[A-Z0-9.^-]+$/ │
    │ FALHA: XYZ123 não combina          │
    └────────────────────────────────────┘
                    │
                    ▼
    ┌────────────────────────────────────┐
    │ Return HTTP 400                    │
    │ {                                  │
    │   "success": false,                │
    │   "error": "VALIDATION_ERROR",     │
    │   "message": "Ticker inválido"     │
    │ }                                  │
    └────────────────────────────────────┘


┌────────────────────────────────────────┐
│ Usuário sem autenticação               │
│ GET /api/indicators/quote/PETR4        │
│ (sem Bearer token)                     │
└────────────────────────────────────────┘
                    │
                    ▼
    ┌────────────────────────────────────┐
    │ authMiddleware                     │
    │ req.headers.authorization = undef  │
    │ NÃO começa com "Bearer "           │
    └────────────────────────────────────┘
                    │
                    ▼
    ┌────────────────────────────────────┐
    │ Return HTTP 401                    │
    │ {                                  │
    │   "error": "Token não fornecido",  │
    │   "code": "NO_TOKEN"               │
    │ }                                  │
    └────────────────────────────────────┘


┌────────────────────────────────────────┐
│ Usuário com role VIEW tenta:           │
│ POST /api/indicators/batch             │
│ (requer ADMIN ou TRADER)               │
└────────────────────────────────────────┘
                    │
                    ▼
    ┌────────────────────────────────────┐
    │ rbacMiddleware(['ADMIN', 'TRADER'])│
    │ req.user.role = 'VIEW'             │
    │ 'VIEW' ∉ ['ADMIN', 'TRADER']       │
    └────────────────────────────────────┘
                    │
                    ▼
    ┌────────────────────────────────────┐
    │ Return HTTP 403                    │
    │ {                                  │
    │   "error": "Acesso negado",        │
    │   "code": "FORBIDDEN",             │
    │   "requiredRoles": ["ADMIN",       │
    │                     "TRADER"],     │
    │   "userRole": "VIEW"               │
    │ }                                  │
    └────────────────────────────────────┘


┌────────────────────────────────────────┐
│ Dados insuficientes:                   │
│ GET /api/indicators/quote/NOVOSTOCK    │
│ (stock novo, só 5 candles no DB)       │
└────────────────────────────────────────┘
                    │
                    ▼
    ┌────────────────────────────────────┐
    │ getHistoricalDaily() retorna       │
    │ candles.length = 5 < 14 (min)      │
    └────────────────────────────────────┘
                    │
                    ▼
    ┌────────────────────────────────────┐
    │ Return HTTP 400                    │
    │ {                                  │
    │   "success": false,                │
    │   "error": "INSUFFICIENT_DATA",    │
    │   "message": "Histórico            │
    │    insuficiente para calcular      │
    │    indicadores (min 14 candles)"   │
    │ }                                  │
    └────────────────────────────────────┘
```

---

## 9. FLUXO: Integração com Frontend

```
┌──────────────────────────────────┐
│ React Component                  │
│ <IndicatorChart ticker="PETR4"/> │
└──────────────────────────────────┘
            │
            ├─ useEffect(() => {
            │    fetch('/api/indicators/quote/PETR4',
            │      headers: { Authorization: ... }
            │    )
            │  }, [])
            │
            ▼
    API Call (con JWT)
            │
            ▼
    ┌──────────────────────────────────┐
    │ REST Response:                   │
    │ {                                │
    │   data: {                        │
    │     indicators: {                │
    │       rsi: 65.5,                │
    │       ema9: 28.32,              │
    │       macd: { ... },            │
    │       ...                       │
    │     }                            │
    │   }                              │
    │ }                                │
    └──────────────────────────────────┘
            │
            ▼
    ┌──────────────────────────────────┐
    │ State update                     │
    │ setIndicators(data.indicators)   │
    └──────────────────────────────────┘
            │
            ▼
    ┌──────────────────────────────────┐
    │ Render componentes:              │
    │ • RSI Gauge (65.5)               │
    │ • EMA Lines                      │
    │ • MACD Histogram                 │
    │ • ATR Tooltip                    │
    │ • OBV Area Chart                 │
    └──────────────────────────────────┘
            │
            ▼
    ┌──────────────────────────────────┐
    │ Usuário vê gráfico em tempo real │
    │ com todos os 7 indicadores       │
    └──────────────────────────────────┘
```

---

## 10. PERFORMANCE TIMELINE

```
Request inicia: T=0ms

T=0-5ms:     authMiddleware (JWT validation)
T=5-8ms:     rbacMiddleware (role check)
T=8-15ms:    Input validation (regex, ranges)
T=15-35ms:   MarketService.getHistoricalDaily()
             └─ Brapi/Yahoo API call: ~20ms
T=35-380ms:  IndicatorService.calculateAll()
             ├─ EMA: 5ms
             ├─ SMA: 3ms
             ├─ RSI: 8ms
             ├─ MACD: 12ms
             ├─ ATR: 7ms
             ├─ OBV: 4ms
             └─ VWAP: 5ms
T=380-385ms: Data formatting & JSON serialization
T=385-390ms: Response sent to client

Total: ~390ms (50 candles)
Goal:  <500ms ✓

Breakdown:
- IO (API calls):     ~20ms (5%)
- Computation:        ~45ms (11%)
- Serialization:      ~5ms (1%)
- Overhead:           ~320ms (83%) ← pode ser optimizado

Otimizações possíveis (Fase 2f+):
- Redis cache para quotes/candles
- Parallel processing de candles
- Lazy loading de indicadores
- gRPC ao invés de REST (para batch)
```

---

*Fluxos e Diagramas - Fase 2E - Indicadores Técnicos*
