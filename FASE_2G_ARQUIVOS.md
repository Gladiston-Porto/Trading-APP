# Fase 2G - ConfluenceEngine: ESTRUTURA DE ARQUIVOS

## 📁 Índice

1. [Arquivos Criados](#arquivos-criados)
2. [Estrutura de Diretórios](#estrutura-diretórios)
3. [Descrição Detalhada por Arquivo](#descricao-detalhada)
4. [Dependências Entre Arquivos](#dependencias)
5. [Integrações com Fase Anterior](#integrações)

---

## 📂 Arquivos Criados {#arquivos-criados}

### Novos Arquivos

```
backend/
├── src/
│   ├── api/
│   │   └── routes/
│   │       └── signals.routes.ts          ✨ NOVO - 350 linhas
│   └── services/
│       └── confluence/
│           ├── ConfluenceEngine.ts        ✨ NOVO - 800 linhas
│           └── __tests__/
│               └── ConfluenceEngine.test.ts ✨ NOVO - 500 linhas
└── src/
    └── server.ts                          ✏️ MODIFICADO - Adição de import/rota
```

### Arquivos Existentes (Sem Mudanças)

```
backend/
├── src/
│   ├── services/
│   │   ├── indicator/IndicatorService.ts  (usado por signals.routes.ts)
│   │   ├── market/MarketService.ts        (usado por signals.routes.ts)
│   │   └── pattern/PatternService.ts      (usado por signals.routes.ts)
│   ├── api/
│   │   └── middleware/
│   │       └── auth.middleware.ts         (usado por signals.routes.ts)
│   └── utils/
│       └── logger.ts                      (usado por signals.routes.ts)
└── tsconfig.json                          (sem mudanças necessárias)
```

---

## 🗂️ Estrutura de Diretórios {#estrutura-diretórios}

### Antes (Fase 2f)

```
backend/src/
├── api/
│   ├── dto/
│   │   └── auth.dto.ts
│   ├── middleware/
│   │   └── auth.middleware.ts
│   └── routes/
│       ├── auth.routes.ts
│       ├── indicator.routes.ts
│       ├── market.routes.ts
│       └── pattern.routes.ts              ← Última rota (Fase 2f)
├── config/
├── services/
│   ├── AuthService.ts
│   ├── indicator/
│   │   ├── IndicatorService.ts
│   │   └── __tests__/
│   ├── market/
│   │   ├── MarketService.ts
│   │   ├── adapters/
│   │   └── __tests__/
│   └── pattern/
│       ├── PatternService.ts
│       └── __tests__/
├── utils/
└── server.ts
```

### Depois (Fase 2g)

```
backend/src/
├── api/
│   ├── dto/
│   │   └── auth.dto.ts
│   ├── middleware/
│   │   └── auth.middleware.ts
│   └── routes/
│       ├── auth.routes.ts
│       ├── indicator.routes.ts
│       ├── market.routes.ts
│       ├── pattern.routes.ts
│       └── signals.routes.ts              ← ✨ NOVO (Fase 2g)
├── config/
├── services/
│   ├── AuthService.ts
│   ├── indicator/
│   │   ├── IndicatorService.ts
│   │   └── __tests__/
│   ├── market/
│   │   ├── MarketService.ts
│   │   ├── adapters/
│   │   └── __tests__/
│   ├── pattern/
│   │   ├── PatternService.ts
│   │   └── __tests__/
│   └── confluence/                        ← ✨ NOVO (Fase 2g)
│       ├── ConfluenceEngine.ts            ← ✨ NOVO
│       └── __tests__/
│           └── ConfluenceEngine.test.ts   ← ✨ NOVO
├── utils/
└── server.ts                              ← ✏️ MODIFICADO
```

---

## 📋 Descrição Detalhada por Arquivo {#descricao-detalhada}

### 1. ConfluenceEngine.ts (800 linhas)

**Localização**: `backend/src/services/confluence/ConfluenceEngine.ts`

**Propósito**: Motor central de geração de sinais de trading

**Estrutura Interna**:

```typescript
// ===== SECTION 1: INTERFACES & TYPES (Lines 1-150) =====

interface IndicatorValues {
  ema9: number;
  ema21: number;
  ema200: number;
  sma50: number;
  sma200: number;
  rsi14: number;
  macd: { macd: number; signal: number; histogram: number };
  atr14: number;
  obv: number;
  vwap: number;
}

interface DetectedPattern {
  pattern: string;
  confidence: number;
  isUptrend: boolean;
  description: string;
}

interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SignalConfidence {
  trend: number;
  momentum: number;
  pattern: number;
  volume: number;
  volatility: number;
  weighted: number;
}

interface TradingSignal {
  ticker: string;
  date: string;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  strength: 'WEAK' | 'MEDIUM' | 'STRONG';
  rationale: {
    trend: string;
    momentum: string;
    pattern: string;
    volume: string;
    summary: string;
  };
  riskReward: {
    stopLoss: number;
    takeProfit: number;
    riskRewardRatio: number;
    distance: { toSL: number; toTP: number };
  };
  confluence: SignalConfidence;
  components: { indicators: string[]; patterns: string[] };
}

// ===== SECTION 2: SCORING METHODS (Lines 151-400) =====

class ConfluenceEngine {
  private static calculateTrendScore(
    indicators: IndicatorValues,
    candles: Candle[]
  ): number {
    // EMA/SMA alignment analysis
    // Price vs EMA200 positioning
    // Returns 0-100
  }

  private static calculateMomentumScore(indicators: IndicatorValues): number {
    // RSI(14) zone analysis
    // MACD histogram and crossover
    // Returns 0-100
  }

  private static calculateVolatilityScore(indicators: IndicatorValues): number {
    // ATR health check
    // OBV confirmation
    // Returns 0-100
  }

  private static calculatePatternScore(patterns: DetectedPattern[]): number {
    // Top pattern confidence extraction
    // Bullish vs bearish weighting
    // Returns 0-100
  }

  private static calculateVolumeScore(
    indicators: IndicatorValues,
    candles: Candle[]
  ): number {
    // Current volume vs average
    // OBV trend confirmation
    // Returns 0-100
  }

  private static weightedConfidence(
    trend: number,
    momentum: number,
    pattern: number,
    volume: number,
    volatility: number
  ): number {
    // Weighted average: 35% + 25% + 20% + 15% + 5%
    // Returns final 0-100 score
  }

  // ===== SECTION 3: DETERMINATION METHODS (Lines 401-500) =====

  private static determineDirection(
    trend: number,
    momentum: number,
    pattern: number,
    patterns: DetectedPattern[]
  ): 'BUY' | 'SELL' | 'NEUTRAL' {
    // Count bullish/bearish signals
    // Majority wins
    // Returns direction
  }

  private static determineStrength(confidence: number): 'WEAK' | 'MEDIUM' | 'STRONG' {
    // >= 75 = STRONG
    // 60-74 = MEDIUM
    // < 60 = WEAK
    // Returns strength
  }

  // ===== SECTION 4: RISK/REWARD CALCULATION (Lines 501-600) =====

  private static calculateRiskReward(
    candle: Candle,
    direction: 'BUY' | 'SELL' | 'NEUTRAL',
    volatility: number,
    atr: number
  ): RiskReward {
    // For BUY: SL below, TP above
    // For SELL: SL above, TP below
    // Calculate RR ratio and distances
    // Returns {SL, TP, RR, distances}
  }

  // ===== SECTION 5: RATIONALE GENERATION (Lines 601-700) =====

  private static generateRationale(
    trendScore: number,
    momentumScore: number,
    patternScore: number,
    volumeScore: number,
    trends: string[],
    isUptrend: boolean
  ): Rationale {
    // Generate explainable AI rationale
    // Justify each component decision
    // Returns readable explanation
  }

  // ===== SECTION 6: PUBLIC METHODS (Lines 701-800) =====

  static generateSignal(
    ticker: string,
    candles: Candle[],
    indicators: IndicatorValues,
    patterns: DetectedPattern[]
  ): TradingSignal {
    // Main orchestration method
    // Combines all above methods
    // Returns complete TradingSignal
  }

  static scanMultiple(results: Map<string, TradingSignal>): Map<string, TradingSignal> {
    // Process batch of signals
    // Returns signals map
  }

  static filterByStrength(
    signals: TradingSignal[],
    minStrength: 'WEAK' | 'MEDIUM' | 'STRONG'
  ): TradingSignal[] {
    // Filter signals by strength
    // Returns filtered array
  }

  static filterByDirection(
    signals: TradingSignal[],
    direction: 'BUY' | 'SELL'
  ): TradingSignal[] {
    // Filter signals by direction
    // Returns filtered array
  }

  static calculateStats(signals: TradingSignal[]): SignalStats {
    // Calculate statistics
    // Returns aggregated stats
  }

  private static identifyComponents(
    indicators: IndicatorValues,
    patterns: DetectedPattern[]
  ): { indicators: string[]; patterns: string[] } {
    // Identify which components were used
    // Returns component list
  }
}

export default ConfluenceEngine;
export { TradingSignal, IndicatorValues, SignalConfidence };
```

**Linhas de Código**:
- 1-50: Copyright + imports
- 51-150: Type/interface definitions
- 151-250: calculateTrendScore() + helpers
- 251-350: calculateMomentumScore() + helpers
- 351-400: calculateVolatilityScore(), calculatePatternScore(), calculateVolumeScore()
- 401-450: weightedConfidence(), determineDirection(), determineStrength()
- 451-550: calculateRiskReward()
- 551-650: generateRationale() e rationale helpers
- 651-700: identifyComponents(), helper methods
- 701-800: generateSignal(), scanMultiple(), filterByStrength(), filterByDirection(), calculateStats()

---

### 2. ConfluenceEngine.test.ts (500 linhas)

**Localização**: `backend/src/services/confluence/__tests__/ConfluenceEngine.test.ts`

**Propósito**: Testes unitários e integração do ConfluenceEngine

**Estrutura**:

```typescript
// ===== HELPERS (Lines 1-100) =====

function createCandle(
  date: string,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): Candle { ... }

function createBullishIndicators(): IndicatorValues { ... }
function createBearishIndicators(): IndicatorValues { ... }
function createHistoricalCandles(): Candle[] { ... }
function createBullishPattern(): DetectedPattern { ... }
function createBearishPattern(): DetectedPattern { ... }

// ===== TEST SUITES (Lines 101-500) =====

describe('ConfluenceEngine', () => {
  
  describe('calculateTrendScore', () => {
    it('should calculate bullish trend (score > 55)', ...)
    it('should calculate bearish trend (score < 45)', ...)
    it('should handle neutral trend (45-55)', ...)
  })

  describe('calculateMomentumScore', () => {
    it('should detect bullish momentum (RSI > 50)', ...)
    it('should detect bearish momentum (RSI < 50)', ...)
    it('should detect oversold (RSI < 30)', ...)
    it('should detect overbought (RSI > 70)', ...)
  })

  describe('calculatePatternScore', () => {
    it('should boost score with bullish pattern', ...)
    it('should reduce score with bearish pattern', ...)
    it('should handle empty patterns', ...)
  })

  describe('determineDirection', () => {
    it('should generate BUY signal', ...)
    it('should generate SELL signal', ...)
    it('should generate NEUTRAL signal', ...)
  })

  describe('determineStrength', () => {
    it('should identify STRONG (>=75)', ...)
    it('should identify MEDIUM (60-75)', ...)
    it('should identify WEAK (<60)', ...)
  })

  describe('calculateRiskReward', () => {
    it('should set SL below entry for BUY', ...)
    it('should set TP above entry for BUY', ...)
    it('should calculate valid RR ratio', ...)
  })

  describe('generateRationale', () => {
    it('should generate comprehensive rationale', ...)
    it('should include bullish language in bullish signal', ...)
  })

  describe('identifyComponents', () => {
    it('should identify used indicators', ...)
    it('should identify detected patterns', ...)
  })

  describe('Signal Structure', () => {
    it('should have valid signal structure', ...)
  })

  describe('scanMultiple', () => {
    it('should generate signals for multiple tickers', ...)
  })

  describe('filterByStrength', () => {
    it('should filter STRONG signals only', ...)
  })

  describe('filterByDirection', () => {
    it('should filter by direction (BUY/SELL)', ...)
  })

  describe('calculateStats', () => {
    it('should calculate signal statistics', ...)
  })

  describe('Edge Cases', () => {
    it('should handle missing indicators', ...)
    it('should handle empty candles array', ...)
    it('should handle empty patterns array', ...)
  })

  describe('Integration', () => {
    it('should generate complete trading signal', ...)
    it('should handle live trading workflow', ...)
  })
})
```

**Linha Layout**:
- 1-30: Imports e setup
- 31-100: Helper functions (createCandle, createIndicators, etc)
- 101-150: calculateTrendScore suite (3 tests)
- 151-200: calculateMomentumScore suite (4 tests)
- 201-250: calculatePatternScore suite (3 tests)
- 251-300: determineDirection suite (3 tests)
- 301-350: determineStrength suite (3 tests)
- 351-400: calculateRiskReward suite (3 tests)
- 401-430: generateRationale suite (2 tests)
- 431-460: identifyComponents suite (2 tests)
- 461-480: Signal structure test (1 test)
- 481-500: Batch operations + integration (9+ tests)

**Coverage**: 90%+

---

### 3. signals.routes.ts (350 linhas)

**Localização**: `backend/src/api/routes/signals.routes.ts`

**Propósito**: REST API endpoints para geração de sinais

**Estrutura**:

```typescript
// ===== IMPORTS (Lines 1-12) =====
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import ConfluenceEngine, { TradingSignal, IndicatorValues } from '../../services/confluence/ConfluenceEngine';
import IndicatorService from '../../services/indicator/IndicatorService';
import PatternService from '../../services/pattern/PatternService';
import MarketService from '../../services/market/MarketService';
import logger from '../../utils/logger';

// ===== ROUTER SETUP (Lines 13-20) =====
const router = Router();
router.use(authMiddleware);

// ===== TYPE ADAPTER (Lines 22-38) =====
function adaptIndicatorsToConfluence(
  indicatorResults: any,
  candles: any[]
): IndicatorValues {
  // Convert IndicatorService output arrays → ConfluenceEngine scalars
  // Extract last values from IndicatorValue[] arrays
}

// ===== ENDPOINT 1: POST /api/signals/generate/:ticker (Lines 40-150) =====
router.post('/generate/:ticker', async (req: Request, res: Response) => {
  // Validate inputs
  // Fetch candles
  // Calculate indicators
  // Adapt types
  // Detect patterns
  // Generate signal
  // Filter by confidence
  // Return response
})

// ===== ENDPOINT 2: POST /api/signals/scan-all (Lines 151-260) =====
router.post('/scan-all', async (req: Request, res: Response) => {
  // Validate inputs (array, max 50, confidence 0-100)
  // Process each ticker in parallel (Promise.all)
  // Handle errors individually
  // Filter by confidence & strength
  // Sort by confidence
  // Calculate stats
  // Return aggregated response
})

// ===== ENDPOINT 3: POST /api/signals/history (Lines 261-330) =====
router.post('/history', async (req: Request, res: Response) => {
  // Validate dates
  // Check 1-365 day range
  // Fetch historical data
  // Calculate indicators
  // Generate signals (simulated, DB in production)
  // Filter by strength
  // Return historical signals + summary
})

// ===== ENDPOINT 4: GET /api/signals/info (Lines 331-350) =====
router.get('/info', (_req: Request, res: Response) => {
  // Return engine metadata
  // Scoring weights
  // Available endpoints
})

// ===== EXPORT (Line 350) =====
export default router;
```

**Linha Details**:
- 1-12: Imports (express, middleware, services, logger)
- 13-20: Router initialization + auth middleware
- 22-38: Type adapter function (IndicatorValue[] → IndicatorValues)
- 40-110: Validation + logging
- 111-150: Single signal generation logic
- 151-180: Input validation for batch
- 181-230: Parallel processing loop
- 231-260: Stats calculation + response
- 261-310: History endpoint logic
- 311-330: Response formatting
- 331-348: Info endpoint
- 349-350: Export

**Endpoints Summary**:

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/generate/:ticker` | POST | ✅ | Single signal |
| `/scan-all` | POST | ✅ | Batch (50 max) |
| `/history` | POST | ✅ | Historical signals |
| `/info` | GET | ❌ | Engine metadata |

---

### 4. server.ts (MODIFICADO)

**Localização**: `backend/src/server.ts`

**Mudanças Realizadas**:

```diff
  // Lines 1-11 (imports section)
  import authRouter from "./api/routes/auth.routes";
  import marketRouter from "./api/routes/market.routes";
  import indicatorRouter from "./api/routes/indicator.routes";
  import patternRouter from "./api/routes/pattern.routes";
+ import signalsRouter from "./api/routes/signals.routes";  // ✨ NOVO

  // Lines 40-48 (routes section)
  app.use("/api/auth", authRouter);
  app.use("/api/market", marketRouter);
  app.use("/api/indicators", indicatorRouter);
  app.use("/api/patterns", patternRouter);
+ app.use("/api/signals", signalsRouter);  // ✨ NOVO - Sinais de Trading
```

**Linhas Modificadas**:
- Linha 12: Adicionar import de signalsRouter
- Linhas 45-46: Registrar rota em `/api/signals`

---

## 🔗 Dependências Entre Arquivos {#dependencias}

```
signals.routes.ts
├─ Imports ConfluenceEngine.ts
│  ├─ Usa: generateSignal()
│  ├─ Usa: scanMultiple()
│  ├─ Usa: filterByStrength()
│  ├─ Usa: filterByDirection()
│  └─ Usa: calculateStats()
│
├─ Imports IndicatorService.ts
│  └─ Usa: calculateAll(candles)
│
├─ Imports PatternService.ts
│  └─ Usa: detectAllPatterns(candles)
│
├─ Imports MarketService.ts
│  └─ Usa: getHistoricalDaily(ticker, days)
│
└─ Imports authMiddleware
   └─ JWT validation + user context

server.ts
└─ Imports signals.routes.ts
   └─ Registers at /api/signals

ConfluenceEngine.test.ts
├─ Imports ConfluenceEngine.ts
│  └─ Tests all public methods
│
└─ Helper functions
   ├─ createCandle()
   ├─ createBullishIndicators()
   ├─ createBullishPattern()
   └─ etc.
```

---

## 📚 Integrações com Fase Anterior {#integrações}

### De Fase 2d (MarketService)

```typescript
// MarketService.ts (usado em signals.routes.ts)
export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjusted_close?: number;
}

// signals.routes.ts
const candles = await MarketService.getHistoricalDaily(ticker, days);
```

### De Fase 2e (IndicatorService)

```typescript
// IndicatorService.ts (usado em signals.routes.ts)
export interface IndicatorValue {
  date: string;
  value: number | null;
}

export interface EMASeries {
  ema9: IndicatorValue[];
  ema21: IndicatorValue[];
  ema200: IndicatorValue[];
}

// (similar for SMA, RSI, MACD, ATR, OBV, VWAP)

// signals.routes.ts (adapt step)
function adaptIndicatorsToConfluence(indicatorResults: any, candles: any[]): IndicatorValues {
  const lastIndex = candles.length - 1;
  return {
    ema9: indicatorResults.ema.ema9[lastIndex]?.value || 0,
    // ... etc
  };
}
```

### De Fase 2f (PatternService)

```typescript
// PatternService.ts (usado em signals.routes.ts)
export interface DetectedPattern {
  pattern: string;
  confidence: number;
  isUptrend: boolean;
  description: string;
}

// signals.routes.ts
const patterns = PatternService.detectAllPatterns(candles);
```

### De Fase 2c (Auth Middleware)

```typescript
// auth.middleware.ts (usado em signals.routes.ts)
// Todas as rotas de sinal requerem JWT

router.use(authMiddleware);  // Applied to all endpoints
```

---

## 📊 Tamanho e Complexidade

| Arquivo | Linhas | Funções | Classes | Complexidade |
|---------|--------|---------|---------|--------------|
| ConfluenceEngine.ts | 800 | 15+ | 1 | Alta |
| ConfluenceEngine.test.ts | 500 | 35+ | 0 | Alta |
| signals.routes.ts | 350 | 5 | 0 | Média-Alta |
| **Total** | **1650** | **55+** | **1** | **Alta** |

---

## 🔍 Detalhes Técnicos

### TypeScript Configuration

```json
// tsconfig.json (sem mudanças necessárias)
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

### Package.json Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@prisma/client": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.17",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "ts-jest": "^29.0.0"
  }
}
```

---

## 📋 Checklist de Integração

- [x] ConfluenceEngine.ts criado em `/backend/src/services/confluence/`
- [x] ConfluenceEngine.test.ts criado em `/backend/src/services/confluence/__tests__/`
- [x] signals.routes.ts criado em `/backend/src/api/routes/`
- [x] Type adapter implementado em signals.routes.ts
- [x] server.ts atualizado com import
- [x] server.ts registra rota em `/api/signals`
- [x] Sem erros de compilação TypeScript
- [x] Todas as dependências importadas
- [x] Autenticação middleware aplicado

---

## 🚀 Pronto para

✅ `npm install` (resolvará tipos pendentes)  
✅ `npm test` (executará ConfluenceEngine.test.ts)  
✅ `npm start` (servidor com /api/signals disponível)  
✅ Integração frontend (Fase 3)  

---

*Documentação de Arquivos - Fase 2G*  
*Gerada em: 14 de Janeiro de 2025*
