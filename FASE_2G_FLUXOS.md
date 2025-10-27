# Fase 2G - ConfluenceEngine: FLUXOS DETALHADOS

## 📊 Índice de Fluxos

1. [Fluxo Principal de Geração de Sinais](#fluxo-principal)
2. [Fluxo de Scoring de Tendência](#fluxo-trend-score)
3. [Fluxo de Scoring de Momentum](#fluxo-momentum-score)
4. [Fluxo de Determinação de Direção](#fluxo-direction)
5. [Fluxo de Scan em Lote](#fluxo-scan-batch)
6. [Fluxo de Risco/Recompensa](#fluxo-risk-reward)
7. [Endpoints e Integrações](#endpoints-integracao)

---

## 🔄 Fluxo Principal de Geração de Sinais {#fluxo-principal}

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT REQUEST                                             │
│  POST /api/signals/generate/PETR4?days=30&minConfidence=60  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼ (JWT Token Validation)
                ┌────────────────────┐
                │ authMiddleware     │
                │ ✓ Token valid?     │
                │ ✓ User authorized? │
                └────────┬───────────┘
                         │
                    ▼ (YES)
        ┌───────────────────────────────┐
        │ Validate Input                │
        │ - ticker: "PETR4"             │
        │ - days: 30                    │
        │ - minConfidence: 60 (0-100?)  │
        └────────────┬──────────────────┘
                     │
                ▼ (VALID)
     ┌──────────────────────────────────┐
     │ Step 1: Fetch Historical Data    │
     │                                  │
     │ MarketService.getHistoricalDaily │
     │ (ticker: "PETR4", days: 30)      │
     │                                  │
     │ → Candle[] (30-90 elementos)    │
     │   ├─ 2025-01-01: O=100, H=102   │
     │   ├─ 2025-01-02: O=101, H=103   │
     │   └─ 2025-01-14: O=102, H=105   │
     └────────────┬─────────────────────┘
                  │
            ▼ (SUCCESS)
    ┌────────────────────────────────────┐
    │ Step 2: Calculate Indicators       │
    │                                    │
    │ IndicatorService.calculateAll()    │
    │                                    │
    │ → Returns:                         │
    │  ├─ ema: {                         │
    │  │   ema9: IndicatorValue[30]     │
    │  │   ema21: IndicatorValue[30]    │
    │  │   ema200: IndicatorValue[30]   │
    │  ├─ sma: {                         │
    │  │   sma50: IndicatorValue[30]    │
    │  │   sma200: IndicatorValue[30]   │
    │  ├─ rsi: {rsi: IndicatorValue[30]}│
    │  ├─ macd: {                        │
    │  │   macd: IndicatorValue[30]     │
    │  │   signal: IndicatorValue[30]   │
    │  │   histogram: IndicatorValue[30]│
    │  ├─ atr: {atr: IndicatorValue[30]}│
    │  ├─ obv: {obv: IndicatorValue[30]}│
    │  └─ vwap: {vwap: IndicatorValue[]}│
    └────────────┬─────────────────────┘
                 │
          ▼ (SUCCESS)
    ┌────────────────────────────────────┐
    │ Step 3: Type Adapter               │
    │                                    │
    │ adaptIndicatorsToConfluence()       │
    │                                    │
    │ Extract LAST values from arrays:   │
    │ ├─ ema9: 98.50 (scalar)            │
    │ ├─ ema21: 99.20 (scalar)           │
    │ ├─ ema200: 97.80 (scalar)          │
    │ ├─ sma50: 99.50 (scalar)           │
    │ ├─ sma200: 98.20 (scalar)          │
    │ ├─ rsi14: 65 (scalar)              │
    │ ├─ macd: {                         │
    │ │   macd: 0.85 (scalar)            │
    │ │   signal: 0.72 (scalar)          │
    │ │   histogram: 0.13 (scalar)       │
    │ ├─ atr14: 1.20 (scalar)            │
    │ ├─ obv: 1245600 (scalar)           │
    │ └─ vwap: 99.40 (scalar)            │
    └────────────┬─────────────────────┘
                 │
          ▼ (SUCCESS)
    ┌────────────────────────────────────┐
    │ Step 4: Detect Patterns            │
    │                                    │
    │ PatternService.detectAllPatterns() │
    │                                    │
    │ → DetectedPattern[] [{             │
    │   pattern: "Hammer",               │
    │   confidence: 85,                  │
    │   isUptrend: true,                 │
    │   description: "..."               │
    │ }]                                 │
    └────────────┬─────────────────────┘
                 │
          ▼ (SUCCESS)
    ┌────────────────────────────────────┐
    │ Step 5: Generate Signal            │
    │                                    │
    │ ConfluenceEngine.generateSignal()  │
    │                                    │
    │ INPUT:                             │
    │  - ticker: "PETR4"                 │
    │  - candles: Candle[30]             │
    │  - indicators: IndicatorValues     │
    │  - patterns: DetectedPattern[]     │
    │                                    │
    │ PROCESS: (see next sections)       │
    │                                    │
    │ OUTPUT: TradingSignal {            │
    │  direction: "BUY",                 │
    │  confidence: 87,                   │
    │  strength: "STRONG",               │
    │  rationale: {...},                 │
    │  riskReward: {...},                │
    │  confluence: {...}                 │
    │ }                                  │
    └────────────┬─────────────────────┘
                 │
          ▼ (SUCCESS)
    ┌────────────────────────────────────┐
    │ Step 6: Filter by Confidence       │
    │                                    │
    │ if (signal.confidence >= 60)       │
    │   return full signal               │
    │ else                               │
    │   return signal + warning          │
    └────────────┬─────────────────────┘
                 │
          ▼ (SUCCESS)
    ┌────────────────────────────────────┐
    │ RESPONSE 200 OK                    │
    │                                    │
    │ {                                  │
    │   "ticker": "PETR4",               │
    │   "date": "2025-01-14T10:30:00Z",  │
    │   "signal": {...},                 │
    │   "summary": {...}                 │
    │ }                                  │
    └────────────────────────────────────┘
```

---

## 📈 Fluxo de Scoring de Tendência {#fluxo-trend-score}

```
┌──────────────────────────────────┐
│ calculateTrendScore()            │
│                                  │
│ INPUT: indicators, candles       │
└───────────────┬──────────────────┘
                │
                ▼
    ┌──────────────────────────────┐
    │ Initialize Score = 50         │
    │ (neutral baseline)            │
    └───────────────┬───────────────┘
                    │
                    ▼
    ┌──────────────────────────────┐
    │ CHECK 1: EMA21 vs EMA200     │
    │                              │
    │ ema21 = 99.20                │
    │ ema200 = 97.80               │
    │ emaDiff = 1.40               │
    │ emaPct = 1.43%               │
    │                              │
    │ if (emaPct > 0.5%)           │
    │   score += min(25, 1.43*2)   │
    │   score += 2.86 → score=52.86│
    │ else if (emaPct < -0.5%)     │
    │   score -= min(25, |pct|*2)  │
    │ else                         │
    │   score unchanged            │
    └───────────────┬───────────────┘
                    │
                    ▼
    ┌──────────────────────────────┐
    │ CHECK 2: SMA50 vs SMA200     │
    │                              │
    │ sma50 = 99.50                │
    │ sma200 = 98.20               │
    │ smaDiff = 1.30               │
    │ smaPct = 1.32%               │
    │                              │
    │ if (smaPct > 0.5%)           │
    │   score += min(25, 1.32*2)   │
    │   score += 2.64 → score=55.5 │
    │ [similar logic]              │
    └───────────────┬───────────────┘
                    │
                    ▼
    ┌──────────────────────────────┐
    │ CHECK 3: Price vs EMA200     │
    │                              │
    │ close = 102.50               │
    │ ema200 = 97.80               │
    │ priceDiff = 4.70             │
    │ pricePct = 4.81%             │
    │                              │
    │ if (pricePct > 2%)           │
    │   score += min(20, 4.81)     │
    │   score += 4.81 → score=60.31│
    │ else if (pricePct < -2%)     │
    │   score -= min(20, |pct|)    │
    └───────────────┬───────────────┘
                    │
                    ▼
    ┌──────────────────────────────┐
    │ FINAL TREND SCORE            │
    │                              │
    │ score = 60.31                │
    │                              │
    │ INTERPRETATION:              │
    │ - score > 55 → BULLISH       │
    │ - score < 45 → BEARISH       │
    │ - 45-55 → NEUTRAL            │
    │                              │
    │ Result: BULLISH (score=60)   │
    └──────────────────────────────┘
        ↓
    TREND_SCORE = 60 (used in final confidence)
```

---

## 🎯 Fluxo de Scoring de Momentum {#fluxo-momentum-score}

```
┌──────────────────────────────────┐
│ calculateMomentumScore()          │
│                                  │
│ INPUT: indicators                │
└───────────────┬──────────────────┘
                │
                ▼
    ┌──────────────────────────────┐
    │ Initialize Score = 50         │
    │ (neutral baseline)            │
    └───────────────┬───────────────┘
                    │
                    ▼
    ┌──────────────────────────────┐
    │ CHECK 1: RSI(14) Analysis    │
    │                              │
    │ rsi14 = 65                   │
    │                              │
    │ RANGES:                      │
    │ - rsi < 30: OVERSOLD         │
    │   score += 67 → score=117    │
    │ - rsi 30-50: BEARISH ZONE    │
    │   score -= 30 → score=20     │
    │ - rsi 50-70: BULLISH ZONE    │
    │   score += 30 → score=80     │
    │ - rsi > 70: OVERBOUGHT       │
    │   score -= 67 → score=-17    │
    │                              │
    │ In our case:                 │
    │ rsi=65 (in 50-70 range)      │
    │ score += 30 → score=80       │
    │                              │
    │ Additional:                  │
    │ if (rsi > 50)                │
    │   score += 15 (bullish bonus)│
    │ else if (rsi < 50)           │
    │   score -= 15 (bearish -ve)  │
    │                              │
    │ Final from RSI: score=95     │
    └───────────────┬───────────────┘
                    │
                    ▼
    ┌──────────────────────────────┐
    │ CHECK 2: MACD Analysis       │
    │                              │
    │ macd.macd = 0.85             │
    │ macd.signal = 0.72           │
    │ macd.histogram = 0.13        │
    │                              │
    │ if (histogram > 0)           │
    │   MACD is positive           │
    │   score += 20 → score=115    │
    │                              │
    │ if (macd > signal)           │
    │   MACD above signal          │
    │   score += 10 → score=125    │
    │                              │
    │ CONSTRAINT: cap at 100       │
    │ Final score = 100 (capped)   │
    └───────────────┬───────────────┘
                    │
                    ▼
    ┌──────────────────────────────┐
    │ Normalize by indicators used │
    │                              │
    │ We used 2 indicators (RSI+MAC│
    │ Raw score = 100 + 0 = 100    │
    │ (already at 100 cap)         │
    │                              │
    │ MOMENTUM_SCORE = 100         │
    │                              │
    │ INTERPRETATION:              │
    │ 80-100: Strong momentum      │
    │ 60-79: Moderate momentum     │
    │ 40-59: Weak momentum         │
    │ <40: Negative momentum       │
    │                              │
    │ Result: STRONG (100)         │
    └──────────────────────────────┘
        ↓
    MOMENTUM_SCORE = 100 (max positive)
```

---

## 🔀 Fluxo de Determinação de Direção {#fluxo-direction}

```
┌───────────────────────────────────────┐
│ determineDirection()                  │
│                                       │
│ INPUT: trendScore, momentumScore,     │
│        patternScore, patterns[], all  │
└─────────────────┬─────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────────┐
    │ Count BULLISH Signals            │
    │                                  │
    │ bullishCount = 0                 │
    │                                  │
    │ if (trendScore > 55)             │
    │   bullishCount++ → 1             │
    │                                  │
    │ if (momentumScore > 55)          │
    │   bullishCount++ → 2             │
    │                                  │
    │ if (patternScore > 55)           │
    │   bullishCount++ → 3             │
    │                                  │
    │ for each pattern in patterns[]   │
    │   if (pattern.isUptrend)         │
    │     bullishCount++ → 4           │
    │                                  │
    │ Total BULLISH = 4 signals        │
    └───────────────┬──────────────────┘
                    │
                    ▼
    ┌──────────────────────────────────┐
    │ Count BEARISH Signals            │
    │                                  │
    │ bearishCount = 0                 │
    │ (similar logic, inverted)        │
    │                                  │
    │ Total BEARISH = 0 signals        │
    └───────────────┬──────────────────┘
                    │
                    ▼
    ┌──────────────────────────────────┐
    │ Decide Direction                 │
    │                                  │
    │ if (bullishCount >= 3)           │
    │   return "BUY"                   │
    │                                  │
    │ if (bearishCount >= 3)           │
    │   return "SELL"                  │
    │                                  │
    │ else                             │
    │   return "NEUTRAL"               │
    │                                  │
    │ In our case:                     │
    │ bullishCount = 4                 │
    │ bearishCount = 0                 │
    │ → return "BUY"                   │
    └──────────────────────────────────┘
        ↓
    DIRECTION = "BUY"
```

---

## 📊 Fluxo de Scan em Lote {#fluxo-scan-batch}

```
┌────────────────────────────────────────────┐
│ POST /api/signals/scan-all                 │
│                                            │
│ BODY: {                                    │
│   tickers: ["PETR4", "VALE3", "WEGE3"],    │
│   days: 30,                                │
│   minConfidence: 60,                       │
│   filterByStrength: "STRONG"               │
│ }                                          │
└────────────┬─────────────────────────────┘
             │
      ▼ (validate)
    ┌──────────────────────────────────┐
    │ Validate Input                   │
    │                                  │
    │ - is array? YES                  │
    │ - length > 0? YES                │
    │ - length <= 50? YES              │
    │ - confidence 0-100? YES          │
    │ - strength valid? YES            │
    │                                  │
    │ → PASS                           │
    └───────────────┬──────────────────┘
                    │
              ▼ (Process in parallel)
    ┌──────────────────────────────────┐
    │ Promise.all([                    │
    │   processTickerSignal("PETR4"),  │
    │   processTickerSignal("VALE3"),  │
    │   processTickerSignal("WEGE3")   │
    │ ])                               │
    └───────────────┬──────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
    ▼ PETR4    ▼ VALE3    ▼ WEGE3
    
    ┌─────────────────────────────────┐
    │ processTickerSignal("PETR4")     │
    │                                 │
    │ try {                           │
    │   1. getHistoricalDaily("PETR4")│
    │   2. calculateAll(candles)      │
    │   3. adaptIndicators()          │
    │   4. detectAllPatterns()        │
    │   5. generateSignal()           │
    │                                 │
    │   signal = {                    │
    │     direction: "BUY",           │
    │     confidence: 87,             │
    │     strength: "STRONG",         │
    │     ...                         │
    │   }                             │
    │                                 │
    │   return {                      │
    │     ticker: "PETR4",            │
    │     signal: signal,             │
    │     confidence: 87,             │
    │     direction: "BUY"            │
    │   }                             │
    │ } catch (e) {                   │
    │   return {                      │
    │     ticker: "PETR4",            │
    │     error: "...",               │
    │     signal: null                │
    │   }                             │
    │ }                               │
    └─────────────────────────────────┘
    
    Similar for VALE3 and WEGE3...
    
        │           │           │
        └───────────┼───────────┘
                    │
                ▼ (Merge results)
    ┌──────────────────────────────────┐
    │ signalResults = [                │
    │   {ticker: "PETR4", signal: ...},│
    │   {ticker: "VALE3", signal: ...},│
    │   {ticker: "WEGE3", signal: null}│
    │ ]                                │
    └───────────────┬──────────────────┘
                    │
              ▼ (Filter valid)
    ┌──────────────────────────────────┐
    │ validSignals = signalResults     │
    │   .filter(r => r.signal !== null)│
    │                                  │
    │ → 2 signals (PETR4, VALE3)       │
    └───────────────┬──────────────────┘
                    │
        ▼ (Apply strength filter)
    ┌──────────────────────────────────┐
    │ if (filterByStrength === "STRONG")│
    │   validSignals = validSignals    │
    │     .filter(r =>                 │
    │       r.signal.strength ===      │
    │       "STRONG"                   │
    │     )                            │
    │                                  │
    │ → 1 signal (PETR4, WEGE3 filtered)
    └───────────────┬──────────────────┘
                    │
              ▼ (Sort by confidence)
    ┌──────────────────────────────────┐
    │ validSignals.sort((a, b) =>      │
    │   b.confidence - a.confidence    │
    │ )                                │
    │                                  │
    │ → [PETR4(87), ...]               │
    └───────────────┬──────────────────┘
                    │
              ▼ (Calculate stats)
    ┌──────────────────────────────────┐
    │ const signals = validSignals     │
    │   .map(r => r.signal)            │
    │                                  │
    │ stats = ConfluenceEngine         │
    │   .calculateStats(signals)       │
    │                                  │
    │ stats = {                        │
    │   total: 1,                      │
    │   buyCount: 1,                   │
    │   sellCount: 0,                  │
    │   neutralCount: 0,               │
    │   avgConfidence: 87,             │
    │   strongCount: 1                 │
    │ }                                │
    └───────────────┬──────────────────┘
                    │
                ▼ (Response)
    ┌──────────────────────────────────┐
    │ RESPONSE 200 OK                  │
    │ {                                │
    │   requestedTickers: 3,           │
    │   signalsGenerated: 1,           │
    │   signals: [                     │
    │     {ticker: "PETR4", ...}       │
    │   ],                             │
    │   stats: {                       │
    │     total: 1,                    │
    │     buyCount: 1,                 │
    │     ...                          │
    │   },                             │
    │   filterApplied: {               │
    │     minConfidence: 60,           │
    │     filterByStrength: "STRONG"   │
    │   }                              │
    │ }                                │
    └──────────────────────────────────┘
```

---

## 💰 Fluxo de Risco/Recompensa {#fluxo-risk-reward}

```
┌──────────────────────────────────────────┐
│ calculateRiskReward()                    │
│                                          │
│ INPUT: candle, direction, atr            │
└────────────────┬───────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │ FOR BUY SIGNAL                     │
    │                                    │
    │ candle = {                         │
    │   open: 101.50,                    │
    │   high: 103.80,                    │
    │   low: 100.20,                     │
    │   close: 102.50,                   │
    │   volume: 2500000                  │
    │ }                                  │
    │ atr = 1.50 (volatility)            │
    │                                    │
    │ STOP LOSS (Below):                 │
    │ SL = low - (1.5 × ATR)             │
    │ SL = 100.20 - (1.5 × 1.50)         │
    │ SL = 100.20 - 2.25                 │
    │ SL = 97.95                         │
    │                                    │
    │ TAKE PROFIT (Above):               │
    │ TP = close + (3 × ATR)             │
    │ TP = 102.50 + (3 × 1.50)           │
    │ TP = 102.50 + 4.50                 │
    │ TP = 107.00                        │
    │                                    │
    │ RISK/REWARD RATIO:                 │
    │ RR = (TP - Entry) / (Entry - SL)   │
    │ RR = (107.00 - 102.50) / (102.50 - 97.95)
    │ RR = 4.50 / 4.55                   │
    │ RR = 0.99 → 1:1 ratio              │
    │                                    │
    │ DISTANCE TO SL/TP:                 │
    │ toSL = SL - close = -4.55 (pips)   │
    │ toTP = TP - close = 4.50 (pips)    │
    │                                    │
    │ OUTPUT: {                          │
    │   stopLoss: 97.95,                 │
    │   takeProfit: 107.00,              │
    │   riskRewardRatio: 1.0,            │
    │   distance: {                      │
    │     toSL: -4.55,                   │
    │     toTP: 4.50                     │
    │   }                                │
    │ }                                  │
    └────────────┬─────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │ FOR SELL SIGNAL (Inverse Logic)    │
    │                                    │
    │ STOP LOSS (Above):                 │
    │ SL = high + (1.5 × ATR)            │
    │ SL = 103.80 + 2.25                 │
    │ SL = 106.05                        │
    │                                    │
    │ TAKE PROFIT (Below):               │
    │ TP = close - (3 × ATR)             │
    │ TP = 102.50 - 4.50                 │
    │ TP = 98.00                         │
    │                                    │
    │ RISK/REWARD RATIO:                 │
    │ RR = (Entry - TP) / (SL - Entry)   │
    │ RR = (102.50 - 98.00) / (106.05 - 102.50)
    │ RR = 4.50 / 3.55                   │
    │ RR = 1.27 → 1.27:1 ratio           │
    └────────────────────────────────────┘
        ↓
    Risk/Reward calculated for position sizing
```

---

## 🔌 Endpoints e Integrações {#endpoints-integracao}

### Fluxo de Integração com MarketService

```
┌──────────────────────────────────┐
│ MarketService                    │
│ (Data Provider)                  │
└───────────────┬──────────────────┘
                │
                ▼
    ┌────────────────────────────────┐
    │ getHistoricalDaily()           │
    │ (cached in memory, DB failover)│
    │                                │
    │ INPUT: ticker, days            │
    │ OUTPUT: Candle[]               │
    └───────────────┬────────────────┘
                    │
              ▼ (used by)
    ┌────────────────────────────────┐
    │ IndicatorService               │
    │ (Calculate 7 indicators)       │
    │                                │
    │ Processes candles into arrays  │
    │ of IndicatorValue objects      │
    └───────────────┬────────────────┘
                    │
              ▼ (used by)
    ┌────────────────────────────────┐
    │ Type Adapter                   │
    │ adaptIndicatorsToConfluence()  │
    │                                │
    │ Converts arrays → scalars      │
    └───────────────┬────────────────┘
                    │
              ▼ (used by)
    ┌────────────────────────────────┐
    │ ConfluenceEngine               │
    │ generateSignal()               │
    │                                │
    │ Combines indicators + patterns │
    │ → Generates confidence scores  │
    │                                │
    │ Uses candles for:              │
    │ - Risk/reward calculations     │
    │ - Pattern detection context    │
    │ - OHLCV context                │
    └────────────────────────────────┘
```

### Fluxo de Integração com PatternService

```
┌──────────────────────────────────┐
│ PatternService                   │
│ (Candlestick Analysis)           │
└───────────────┬──────────────────┘
                │
                ▼
    ┌────────────────────────────────┐
    │ detectAllPatterns()            │
    │                                │
    │ INPUT: Candle[]                │
    │ OUTPUT: DetectedPattern[] {     │
    │   pattern: string,             │
    │   confidence: 0-100,           │
    │   isUptrend: boolean,          │
    │   description: string          │
    │ }                              │
    └───────────────┬────────────────┘
                    │
              ▼ (used by)
    ┌────────────────────────────────┐
    │ ConfluenceEngine               │
    │ generateSignal()               │
    │                                │
    │ Uses patterns for:             │
    │ - Pattern score calculation    │
    │ - Direction determination      │
    │ - Rationale generation         │
    │ - Component identification     │
    └────────────────────────────────┘
```

---

## 🔐 Fluxo de Segurança

```
┌─────────────────────────────────────┐
│ HTTP REQUEST                        │
│ POST /api/signals/generate/PETR4    │
│ Headers: Authorization: Bearer JWT  │
└──────────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────────────────┐
    │ authMiddleware               │
    │                              │
    │ 1. Extract token from header │
    │ 2. Verify JWT signature      │
    │ 3. Check token expiration    │
    │ 4. Validate user exists      │
    │ 5. Check user role (TRADER)  │
    │                              │
    │ if VALID:                    │
    │   req.user = {id, email, ...}│
    │   next()                     │
    │ else:                        │
    │   return 401 Unauthorized    │
    └──────────────┬───────────────┘
                   │
            ▼ (VALID)
    ┌──────────────────────────────┐
    │ Joi Validation               │
    │                              │
    │ - ticker: string (required)  │
    │ - days: int 1-365 (optional) │
    │ - minConfidence: int 0-100   │
    │                              │
    │ if INVALID:                  │
    │   return 400 Bad Request     │
    └──────────────┬───────────────┘
                   │
            ▼ (VALID)
    ┌──────────────────────────────┐
    │ Logging                      │
    │                              │
    │ logger.info('Signal gen...', │
    │   {ticker, days, user.id}    │
    │ )                            │
    └──────────────┬───────────────┘
                   │
            ▼ (Process)
    ┌──────────────────────────────┐
    │ Try-Catch Error Handling     │
    │                              │
    │ try {                        │
    │   ... (signal generation)    │
    │ } catch (error) {            │
    │   logger.error(...)          │
    │   return 500 Server Error    │
    │ }                            │
    └──────────────────────────────┘
```

---

## 📋 Resumo de Fluxos

| Fluxo | Entrada | Processamento | Saída |
|-------|---------|---------------|-------|
| **Generate** | ticker, days | Fetch → Indicators → Patterns → Signal | TradingSignal |
| **Trend Score** | indicators, candles | EMA/SMA alignment | 0-100 |
| **Momentum** | indicators | RSI/MACD zones | 0-100 |
| **Direction** | scores, patterns | Count bullish/bearish | BUY/SELL/NEUTRAL |
| **Scan Batch** | tickers[], filters | Parallel processing | Signal[], stats |
| **Risk/Reward** | candle, direction, atr | SL/TP calculation | {SL, TP, RR, distances} |

---

*Documentação de Fluxos - Fase 2G*  
*Gerada em: 14 de Janeiro de 2025*
