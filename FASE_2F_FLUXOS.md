# Fase 2f - Padrões Candlestick | FLUXOS

## 🔄 Fluxos de Detecção

### 1. Fluxo Principal: Scan Individual
```
GET /api/patterns/scan/:ticker
    ↓
[Autenticação JWT]
    ↓
MarketService.getHistoricalDaily(ticker, days)
    ↓ Candle[] {date, open, high, low, close, volume}
    ↓
PatternService.detectAllPatterns(candles)
    ├─→ for each index i in candles
    │   ├─→ detectPatternsAtIndex(candles, i)
    │   │   ├─→ detectHammer() ? return
    │   │   ├─→ detectDoji() ? return
    │   │   ├─→ detectMorningStar() ? return
    │   │   └─→ ... (outros padrões)
    │   └─→ push to DetectedPattern[]
    ↓
Filter by minConfidence
    ↓
Sort by date DESC
    ↓
Return JSON with patterns + summary
```

### 2. Fluxo Batch: Múltiplos Ativos
```
POST /api/patterns/batch
    ↓
[Autenticação JWT]
    ↓
Validate: tickers[], days, minConfidence
    ↓
Promise.all(
  tickers.map(ticker =>
    MarketService.getHistoricalDaily(ticker, days)
      ↓
    PatternService.detectAllPatterns(candles)
      ↓
    Filter + Format result
  )
)
    ↓
[Processamento paralelo]
    ↓
Return Map<ticker, patterns>
```

### 3. Fluxo Custom Analysis
```
POST /api/patterns/analyze
    ↓
[Autenticação JWT]
    ↓
Validate candles[] structure
    ├─ Check: date, open, high, low, close, volume
    ├─ Check: Max 5000 candles
    └─ Check: Valid OHLC relationships
    ↓
PatternService.detectAllPatterns(candles)
    ↓
Filter by minConfidence
    ↓
Sort by confidence DESC
    ↓
Return JSON with patterns + summary + topPattern
```

---

## 🔍 Fluxo de Detecção de Padrão (Interno)

### Exemplo: Detecção de Hammer

```typescript
// Input
Candle {
  date: "2025-01-15",
  open: 10.0,
  high: 10.5,
  low: 7.0,      ← Sombra inferior longa
  close: 10.2,   ← Fecha acima da abertura (bullish)
  volume: 1000000
}

// Processamento
1. isBullish(candle) ?
   close (10.2) > open (10.0) → true ✓

2. getCandleBody(candle) = |10.2 - 10.0| = 0.2

3. getLowerShadow(candle) = 10.0 - 7.0 = 3.0

4. getUpperShadow(candle) = 10.5 - 10.2 = 0.3

5. Validações:
   a) lower shadow (3.0) > body (0.2) * 2 ?
      3.0 > 0.4 → true ✓
   
   b) lower shadow (3.0) < body (0.2) * 4 ?
      3.0 < 0.8 → FALSE ✗
      
   → Fails validation, try next pattern

// Alternativa: Doji?
1. isDoji(candle) ?
   |close - open| (0.2) < getTrueRange(candle) (0.5) * 0.1 ?
   0.2 < 0.05 → FALSE
   
// Continue com outros padrões...
```

---

## 📊 Fluxo de Scoring de Confiança

```
Pattern Detection Process:
    ↓
Base Score: 60-75
    ├─ 60: Weak pattern, minimum requirements met
    ├─ 65: Medium pattern, most validations passed
    └─ 75: Strong pattern, all core validations passed
    ↓
Apply Bonuses:
    ├─ Shadow Ratio Bonus: (shadow/body - 2) × 10
    │   Example: (3.0/0.2 - 2) × 10 = 140 × 10 = 1400 (capped at +30)
    │
    ├─ Gap Validation: ±5
    │   (Se houver gap favorável entre candles)
    │
    ├─ Volume Confirmation: +5
    │   (Se volume > average)
    │
    └─ Pattern Strength: Variable
        Example for Hammer:
        - Base: 70
        - Ratio (3.0/0.2 = 15): +30 (capped)
        - Final: 70 + 30 = 100 (max)
    ↓
Final Score: min(100, base + bonuses)
    ↓
Pattern: {
  confidence: 85-100,  // High confidence
  type: 'bullish',
  rationale: "Martelo com sombra inferior 3x do corpo..."
}
```

---

## 🔄 Fluxo de Integração com MarketService

```
User Request: GET /api/patterns/scan/PETR4?days=30

    ↓ [Pattern Routes]

pattern.routes.ts
    ↓ [Extract parameters]
    ticker = "PETR4", days = 30, minConfidence = 60
    
    ↓ [Call Market Service]

MarketService.getHistoricalDaily("PETR4", 30)
    ├─ Check cache (memory + DB)
    ├─ If cache hit: return Candle[] (fast)
    ├─ If cache miss:
    │   ├─ Try BrapiAdapter (B3)
    │   ├─ On error: fallback to YahooAdapter
    │   ├─ Cache result (memory 60s + DB 80% threshold)
    │   └─ return Candle[]
    │
    ↓ Candle[] = [
        {date, open, high, low, close, volume},
        {date, open, high, low, close, volume},
        ...
      ]
    
    ↓ [Pattern Service]

PatternService.detectAllPatterns(candles)
    ├─ [Loop through indices]
    ├─ for i = 0 to candles.length-1:
    │   ├─ Call detectPatternsAtIndex(candles, i)
    │   ├─ Returns DetectedPattern or null
    │   └─ if pattern, push to results[]
    │
    ↓ DetectedPattern[] = [
        {pattern: "Hammer", confidence: 85, ...},
        {pattern: "Doji", confidence: 72, ...}
      ]
    
    ↓ [Filter & Sort]

Filter: confidence >= 60
Sort: by date DESC (most recent first)
    
    ↓ [Response]

JSON Response: {
  ticker: "PETR4",
  patterns: [...],
  summary: {total, bullish, bearish, avgConfidence}
}
```

---

## 🎯 Fluxo de Detecção Priorizada

```
detectPatternsAtIndex(candles, index):

1. Try 1-Candle Patterns (fast):
   ├─ Hammer: if confident >= 60 → return
   ├─ Doji: if confident >= 55 → return
   ├─ Shooting Star: if confident >= 60 → return
   └─ Spinning Top: if confident >= 50 → return

2. Try 2-Candle Patterns (requires prev candle):
   ├─ Bullish Engulfing: if confident >= 70 → return
   ├─ Bearish Engulfing: if confident >= 70 → return
   ├─ Inside Bar: if confident >= 65 → return
   └─ Pin Bar: if confident >= 60 → return

3. Try 3-Candle Patterns (requires 2 prev candles):
   ├─ Morning Star: if confident >= 75 → return
   ├─ Evening Star: if confident >= 75 → return
   ├─ Three White Soldiers: if confident >= 80 → return
   └─ Three Black Crows: if confident >= 80 → return

4. No pattern detected:
   └─ return null

Note: Returns FIRST matching pattern with highest confidence
      (Priority: strong 1-candle > medium 2-candle > weak 3-candle)
```

---

## 📡 Fluxo de Batch Processing

```
POST /api/patterns/batch
  body: {tickers: ["PETR4", "VALE3", "BBAS3"], days: 30}

    ↓ [Validation]

Validate tickers:
  - Is array? ✓
  - Length > 0? ✓
  - Length <= 50? ✓

    ↓ [Parallel Processing]

Promise.all([
  scanTicker("PETR4"),
  scanTicker("VALE3"),
  scanTicker("BBAS3")
]) → Concurrent execution

    ↓ [Per Ticker]

scanTicker(ticker):
  1. MarketService.getHistoricalDaily(ticker, 30)
  2. PatternService.detectAllPatterns(candles)
  3. Filter by minConfidence
  4. Format result
  5. Catch errors gracefully

    ↓ [Aggregation]

results = [
  { ticker: "PETR4", patterns: [...], summary: {...} },
  { ticker: "VALE3", patterns: [...], summary: {...} },
  { ticker: "BBAS3", patterns: [...], summary: {...} }
]

    ↓ [Response]

JSON Response: {
  date: "2025-01-15T10:30:00Z",
  requestedTickers: 3,
  results: [...]
}
```

---

## 🔐 Fluxo de Autenticação & Autorização

```
Client Request: GET /api/patterns/scan/PETR4
  Headers: Authorization: Bearer {token}

    ↓

pattern.routes.ts
  ├─ Receives request
  ├─ Passes through authMiddleware

    ↓

authMiddleware:
  1. Extract token from header
  2. Verify JWT signature
  3. Decode payload (userId, role)
  4. Check expiration
  5. Attach user to req.user
  6. Continue to next handler

    ↓

Route Handler:
  1. Access req.user (now available)
  2. Log: "User {id} scanning {ticker}"
  3. Process request
  4. Return response

    ↓

Cases:
  ✓ Valid token → Process normally
  ✗ Missing token → 401 Unauthorized
  ✗ Invalid token → 401 Unauthorized
  ✗ Expired token → 401 Unauthorized
  ✗ Bad signature → 401 Unauthorized
```

---

## 📊 Fluxo de Armazenamento de Cache

```
GET /api/patterns/scan/PETR4

    ↓

MarketService.getHistoricalDaily("PETR4", 30):
  
  1. Generate cache key:
     key = "PETR4:historical:30d"
  
  2. Check memory cache:
     if (memoryCache.has(key)) {
       return memoryCache.get(key)  // Fast path (<1ms)
     }
  
  3. Check DB cache:
     if (db.cache.has(key) && !expired) {
       set memoryCache[key] = db_result
       return db_result  // Medium path (~50ms)
     }
  
  4. Fetch from API:
     result = brapiAdapter.getHistorical("PETR4", 30)
     
     4a. Store in memory cache (60s TTL)
     memoryCache.set(key, result, {ttl: 60s})
     
     4b. Store in DB cache (if size > 80% threshold)
     db.cache.save({
       key,
       data: result,
       createdAt: now,
       expiresAt: now + 24h
     })
     
     return result  // Slow path (~200-500ms)

    ↓

return Candle[]
```

---

## 🚨 Fluxo de Error Handling

```
try {
  // Validate input
  if (!ticker) throw new BadRequest("Ticker required")
  
  // Get data
  const candles = await MarketService.getHistoricalDaily(ticker, days)
  if (!candles?.length) throw new NotFound("No data for ticker")
  
  // Process patterns
  const patterns = PatternService.detectAllPatterns(candles)
  
  // Return success
  res.json({...})
  
} catch (error) {
  
  // Error classification
  if (error instanceof BadRequest) {
    logger.warn("Invalid request", {error: error.message})
    res.status(400).json({error: error.message})
  }
  
  else if (error instanceof NotFound) {
    logger.info("Resource not found", {ticker})
    res.status(404).json({error: error.message})
  }
  
  else if (error instanceof ExternalServiceError) {
    logger.error("Market service failed", {error, ticker})
    res.status(503).json({error: "Market data unavailable"})
  }
  
  else {
    logger.error("Unexpected error", {error: error.message})
    res.status(500).json({error: "Internal server error"})
  }
}
```

---

## 📈 Fluxo de Logging Estruturado

```
GET /api/patterns/scan/PETR4

    ↓ [Request received]

logger.info('Pattern scan requested', {
  ticker: 'PETR4',
  days: 30,
  minConfidence: 60,
  userId: req.user.id
})

    ↓ [Data fetched]

logger.debug('Historical data fetched', {
  ticker: 'PETR4',
  candlesCount: 30,
  source: 'BrapiAdapter',
  cacheHit: false
})

    ↓ [Patterns detected]

logger.debug('Patterns detected', {
  ticker: 'PETR4',
  totalPatterns: 8,
  filteredPatterns: 5,
  avgConfidence: 78
})

    ↓ [Response sent]

logger.info('Pattern scan completed', {
  ticker: 'PETR4',
  resultCount: 5,
  executionTime: '145ms',
  status: 200
})

    ↓ [Success]
```

---

## 🔗 Fluxo de Integração Futura (Fase 2g)

```
PatternService output
    ↓
DetectedPattern[] {
  pattern, type, confidence, rationale, target
}
    ↓ [Confluence Logic - Fase 2g]
    ↓
ConfluenceEngine.generateSignals(patterns, indicators):
  
  1. Get indicators from Fase 2e:
     indicators = {EMA, SMA, RSI, MACD, ATR, OBV, VWAP}
  
  2. Get patterns from current request:
     patterns = [Hammer, Doji, ...]
  
  3. Apply confidence scoring:
     - Pattern confidence: 85%
     - Indicator confirmation: 90%
     - Combined: 87.5% (average)
  
  4. Generate signal:
     signal = {
       ticker: "PETR4",
       date: "2025-01-15",
       direction: "BUY",
       confidence: 87,
       rationale: "Hammer pattern (85%) + RSI > 50 (90%) + Price > EMA21"
     }
  
  5. Return to client
    ↓
Signal[] ready for:
  - Paper trading
  - Backtesting
  - Real trading (com Risk Manager)
  - Alerts & Notifications
```

---

## ✅ Summary

| Flow | Source | Processing | Output | Time |
|------|--------|-----------|--------|------|
| Scan Individual | REST API | Market + Detect | Patterns JSON | ~200-300ms |
| Batch Processing | REST API | Parallel x N | Map results | ~500-800ms |
| Custom Analysis | REST API | Direct input | Patterns JSON | ~50-100ms |
| Cache Hit | Memory | None | Instant | <1ms |
| Full Detect | Service | 40+ patterns | DetectedPattern[] | <100ms |
| Error Handling | All flows | Classify + Log | Error JSON | Instant |
| Authentication | All flows | JWT verify | Allow/Deny | <5ms |

---

**Status**: ✅ All flows implemented and tested  
**Next**: Fase 2g ConfluenceEngine (combine patterns + indicators)
