/**
 * RiskManager Tests
 * Testes para todos os algoritmos de position sizing e risk management
 */

import RiskManager, {
  PositionSizingMethod,
  RiskParameters,
  TradeSetup,
} from '../RiskManager';

describe('RiskManager', () => {
  /**
   * ===== HELPERS =====
   */

  const createRiskParams = (
    method: PositionSizingMethod = PositionSizingMethod.FIXED_RISK_PERCENT
  ): RiskParameters => ({
    method,
    accountSize: 10000,        // $10k account
    riskPerTrade: 2,           // 2% risk per trade or $200
    maxDailyLoss: 300,         // Max $300 daily loss (3%)
    maxDrawdown: 10,           // Max 10% drawdown
    slippagePercent: 0.5,      // 0.5% slippage
    minRiskRewardRatio: 2.0,   // Minimum 2:1 RR
  });

  const createTradeSetup = (
    direction: 'BUY' | 'SELL' = 'BUY'
  ): TradeSetup => ({
    ticker: 'PETR4',
    entryPrice: 100,
    direction,
    stopLoss: direction === 'BUY' ? 98 : 102,    // 2$ risk
    takeProfit: direction === 'BUY' ? 104 : 96,  // 4$ reward (2:1 RR)
    riskRewardRatio: 2.0,
  });

  /**
   * ===== KELLY CRITERION TESTS =====
   */

  describe('calculateKellySize', () => {
    it('should calculate Kelly position size with 55% win rate', () => {
      const params = createRiskParams(PositionSizingMethod.KELLY_CRITERION);
      const trade = createTradeSetup();

      const position = RiskManager.calculateKellySize(params, trade, 0.55);

      expect(position.shares).toBeGreaterThan(0);
      expect(position.method).toBe(PositionSizingMethod.KELLY_CRITERION);
      expect(position.rationale).toContain('Kelly Criterion');
      expect(position.riskAmount).toBeGreaterThan(0);
    });

    it('should reduce Kelly size with lower win rate', () => {
      const params = createRiskParams(PositionSizingMethod.KELLY_CRITERION);
      const trade = createTradeSetup();

      const position55 = RiskManager.calculateKellySize(params, trade, 0.55);
      const position45 = RiskManager.calculateKellySize(params, trade, 0.45);

      expect(position45.shares).toBeLessThan(position55.shares);
    });

    it('should return zero shares if risk amount is zero', () => {
      const params = createRiskParams(PositionSizingMethod.KELLY_CRITERION);
      const trade: TradeSetup = {
        ...createTradeSetup(),
        stopLoss: 100, // Same as entry price
      };

      const position = RiskManager.calculateKellySize(params, trade);

      expect(position.shares).toBe(0);
      expect(position.rationale).toContain('Risk amount is zero');
    });

    it('should apply Kelly fraction multiplier', () => {
      const params: RiskParameters = {
        ...createRiskParams(PositionSizingMethod.KELLY_CRITERION),
        kellyFraction: 0.25, // 25% of Kelly
      };
      const trade = createTradeSetup();

      const position = RiskManager.calculateKellySize(params, trade, 0.55);

      expect(position.rationale).toContain('25%');
      expect(position.shares).toBeGreaterThan(0);
    });

    it('should apply slippage adjustment', () => {
      const params = createRiskParams(PositionSizingMethod.KELLY_CRITERION);
      const trade = createTradeSetup();

      const position = RiskManager.calculateKellySize(params, trade);

      // Shares should be less due to slippage reduction
      expect(position.shares).toBeGreaterThan(0);
      expect(position.positionSize).toBeLessThan(position.shares * 100.5); // 100.5 = entry with slippage
    });
  });

  /**
   * ===== FIXED RISK PERCENT TESTS =====
   */

  describe('calculateFixedRiskSize', () => {
    it('should calculate fixed risk percentage position', () => {
      const params = createRiskParams(PositionSizingMethod.FIXED_RISK_PERCENT);
      const trade = createTradeSetup();

      // 2% of $10k = $200 risk
      const position = RiskManager.calculateFixedRiskSize(params, trade);

      expect(position.shares).toBeGreaterThan(0);
      expect(position.method).toBe(PositionSizingMethod.FIXED_RISK_PERCENT);
      expect(position.riskAmount).toBeCloseTo(200, -1); // ~$200 (2% of account)
    });

    it('should return zero shares if risk amount is zero', () => {
      const params = createRiskParams(PositionSizingMethod.FIXED_RISK_PERCENT);
      const trade: TradeSetup = {
        ...createTradeSetup(),
        stopLoss: 100,
      };

      const position = RiskManager.calculateFixedRiskSize(params, trade);

      expect(position.shares).toBe(0);
    });

    it('should calculate correct position size for SELL direction', () => {
      const params = createRiskParams(PositionSizingMethod.FIXED_RISK_PERCENT);
      const trade = createTradeSetup('SELL');

      const position = RiskManager.calculateFixedRiskSize(params, trade);

      expect(position.shares).toBeGreaterThan(0);
      expect(position.riskAmount).toBeCloseTo(200, -1);
    });

    it('should respect risk amount cap', () => {
      const params: RiskParameters = {
        ...createRiskParams(PositionSizingMethod.FIXED_RISK_PERCENT),
        riskPerTrade: 10, // 10% risk
      };
      const trade = createTradeSetup();

      const position = RiskManager.calculateFixedRiskSize(params, trade);

      // 10% of $10k = $1000 risk
      expect(position.riskAmount).toBeCloseTo(1000, -1);
    });
  });

  /**
   * ===== FIXED AMOUNT TESTS =====
   */

  describe('calculateFixedAmountSize', () => {
    it('should calculate fixed amount position', () => {
      const params: RiskParameters = {
        ...createRiskParams(PositionSizingMethod.FIXED_AMOUNT),
        riskPerTrade: 100, // Fixed $100 risk
      };
      const trade = createTradeSetup();

      const position = RiskManager.calculateFixedAmountSize(params, trade);

      expect(position.shares).toBeGreaterThan(0);
      expect(position.method).toBe(PositionSizingMethod.FIXED_AMOUNT);
      expect(position.riskAmount).toBeCloseTo(100, -1); // ~$100
    });

    it('should return zero shares if risk amount is zero', () => {
      const params: RiskParameters = {
        ...createRiskParams(PositionSizingMethod.FIXED_AMOUNT),
        riskPerTrade: 200,
      };
      const trade: TradeSetup = {
        ...createTradeSetup(),
        stopLoss: 100,
      };

      const position = RiskManager.calculateFixedAmountSize(params, trade);

      expect(position.shares).toBe(0);
    });
  });

  /**
   * ===== POSITION SIZE ORCHESTRATOR TESTS =====
   */

  describe('calculatePositionSize (orchestrator)', () => {
    it('should use Kelly method when specified', () => {
      const params = createRiskParams(PositionSizingMethod.KELLY_CRITERION);
      const trade = createTradeSetup();

      const position = RiskManager.calculatePositionSize(params, trade, 0.55);

      expect(position.method).toBe(PositionSizingMethod.KELLY_CRITERION);
      expect(position.shares).toBeGreaterThan(0);
    });

    it('should use fixed risk method when specified', () => {
      const params = createRiskParams(PositionSizingMethod.FIXED_RISK_PERCENT);
      const trade = createTradeSetup();

      const position = RiskManager.calculatePositionSize(params, trade);

      expect(position.method).toBe(PositionSizingMethod.FIXED_RISK_PERCENT);
      expect(position.shares).toBeGreaterThan(0);
    });

    it('should reject trade with insufficient RR ratio', () => {
      const params = createRiskParams();
      const trade: TradeSetup = {
        ...createTradeSetup(),
        takeProfit: 101, // Only 1:1 RR
        riskRewardRatio: 1.0,
      };

      const position = RiskManager.calculatePositionSize(params, trade);

      expect(position.shares).toBe(0);
      expect(position.rationale).toContain('below minimum');
    });

    it('should respect minimum RR ratio', () => {
      const params: RiskParameters = {
        ...createRiskParams(),
        minRiskRewardRatio: 3.0, // Require 3:1 minimum
      };
      const trade: TradeSetup = {
        ...createTradeSetup(),
        // Default is 2:1
        riskRewardRatio: 2.0,
      };

      const position = RiskManager.calculatePositionSize(params, trade);

      expect(position.shares).toBe(0);
    });
  });

  /**
   * ===== RISK ASSESSMENT TESTS =====
   */

  describe('assessRisk', () => {
    it('should approve trade with low risk', () => {
      const params = createRiskParams();
      const position = RiskManager.calculateFixedRiskSize(
        params,
        createTradeSetup()
      );

      const assessment = RiskManager.assessRisk(params, position, 0, 0);

      expect(assessment.canTrade).toBe(true);
      expect(assessment.riskLevel).toBe('LOW');
      expect(assessment.warnings).toHaveLength(0);
    });

    it('should reject trade after daily limit reached', () => {
      const params = createRiskParams();
      const position = RiskManager.calculateFixedRiskSize(
        params,
        createTradeSetup()
      );

      // Already lost 3% (= daily limit)
      const assessment = RiskManager.assessRisk(params, position, 0, 3);

      expect(assessment.canTrade).toBe(false);
      expect(assessment.riskLevel).toBe('EXTREME');
      expect(assessment.reason).toContain('Daily loss limit');
    });

    it('should warn when daily loss is near limit', () => {
      const params = createRiskParams();
      const position = RiskManager.calculateFixedRiskSize(
        params,
        createTradeSetup()
      );

      // Lost 2.5% (near 3% limit)
      const assessment = RiskManager.assessRisk(params, position, 0, 2.5);

      expect(assessment.canTrade).toBe(true);
      expect(assessment.riskLevel).toBe('HIGH');
      expect(assessment.warnings.length).toBeGreaterThan(0);
    });

    it('should reject trade after max drawdown reached', () => {
      const params = createRiskParams();
      const position = RiskManager.calculateFixedRiskSize(
        params,
        createTradeSetup()
      );

      // Already at 10% drawdown (= max)
      const assessment = RiskManager.assessRisk(params, position, 10, 0);

      expect(assessment.canTrade).toBe(false);
      expect(assessment.riskLevel).toBe('EXTREME');
      expect(assessment.reason).toContain('drawdown');
    });

    it('should warn when position size is large', () => {
      const params = createRiskParams();
      const largePosition = {
        shares: 200,
        riskAmount: 400,
        positionSize: 20000, // 200% of account!
        expectedProfit: 800,
        method: PositionSizingMethod.FIXED_RISK_PERCENT,
        rationale: 'Test',
      };

      const assessment = RiskManager.assessRisk(params, largePosition, 0, 0);

      expect(assessment.warnings.length).toBeGreaterThan(0);
      expect(assessment.riskLevel).toBe('MEDIUM');
    });

    it('should reject trade if position size is zero', () => {
      const params = createRiskParams();
      const zeroPosition = {
        shares: 0,
        riskAmount: 0,
        positionSize: 0,
        expectedProfit: 0,
        method: PositionSizingMethod.FIXED_RISK_PERCENT,
        rationale: 'Test',
      };

      const assessment = RiskManager.assessRisk(params, zeroPosition, 0, 0);

      expect(assessment.canTrade).toBe(false);
      expect(assessment.riskLevel).toBe('EXTREME');
    });
  });

  /**
   * ===== SLIPPAGE ADJUSTMENT TESTS =====
   */

  describe('calculateSlippageAdjustedStopLoss', () => {
    it('should move BUY stop loss down due to slippage', () => {
      const sl = 98;
      const entry = 100;
      const slippage = 0.5;

      const adjustedSL = RiskManager.calculateSlippageAdjustedStopLoss(
        sl,
        entry,
        slippage,
        'BUY'
      );

      expect(adjustedSL).toBeLessThan(sl);
      expect(adjustedSL).toBeCloseTo(97.99, 1);
    });

    it('should move SELL stop loss up due to slippage', () => {
      const sl = 102;
      const entry = 100;
      const slippage = 0.5;

      const adjustedSL = RiskManager.calculateSlippageAdjustedStopLoss(
        sl,
        entry,
        slippage,
        'SELL'
      );

      expect(adjustedSL).toBeGreaterThan(sl);
      expect(adjustedSL).toBeCloseTo(102.01, 1);
    });
  });

  describe('calculateSlippageAdjustedTakeProfit', () => {
    it('should move BUY take profit down due to slippage', () => {
      const tp = 104;
      const entry = 100;
      const slippage = 0.5;

      const adjustedTP = RiskManager.calculateSlippageAdjustedTakeProfit(
        tp,
        entry,
        slippage,
        'BUY'
      );

      expect(adjustedTP).toBeLessThan(tp);
      expect(adjustedTP).toBeCloseTo(103.98, 1);
    });

    it('should move SELL take profit up due to slippage', () => {
      const tp = 96;
      const entry = 100;
      const slippage = 0.5;

      const adjustedTP = RiskManager.calculateSlippageAdjustedTakeProfit(
        tp,
        entry,
        slippage,
        'SELL'
      );

      expect(adjustedTP).toBeGreaterThan(tp);
      expect(adjustedTP).toBeCloseTo(96.02, 1);
    });
  });

  /**
   * ===== TRAILING STOP TESTS =====
   */

  describe('calculateTrailingStop', () => {
    it('should calculate trailing stop for BUY (below highest)', () => {
      const current = 105;
      const highest = 108;
      const trailingPercent = 5; // 5% trailing

      const trailingStop = RiskManager.calculateTrailingStop(
        current,
        highest,
        trailingPercent,
        'BUY'
      );

      // 108 - (108 * 0.05) = 108 - 5.4 = 102.6
      expect(trailingStop).toBeCloseTo(102.6, 1);
      expect(trailingStop).toBeLessThan(highest);
    });

    it('should calculate trailing stop for SELL (above highest)', () => {
      const current = 95;
      const highest = 92; // Highest means best profit point for SELL
      const trailingPercent = 5;

      const trailingStop = RiskManager.calculateTrailingStop(
        current,
        highest,
        trailingPercent,
        'SELL'
      );

      // 92 + (92 * 0.05) = 92 + 4.6 = 96.6
      expect(trailingStop).toBeCloseTo(96.6, 1);
      expect(trailingStop).toBeGreaterThan(highest);
    });
  });

  /**
   * ===== TRADE TRACKING TESTS =====
   */

  describe('Trade Recording', () => {
    beforeEach(() => {
      RiskManager.resetSession();
    });

    it('should record trade', () => {
      const trade = RiskManager.recordTrade(
        'PETR4',
        100,
        'BUY',
        50,
        98,
        104,
        5000,
        100
      );

      expect(trade.ticker).toBe('PETR4');
      expect(trade.status).toBe('OPEN');
      expect(trade.entryPrice).toBe(100);
      expect(trade.shares).toBe(50);
    });

    it('should close trade with TP', () => {
      RiskManager.recordTrade('PETR4', 100, 'BUY', 50, 98, 104, 5000, 100);
      const closed = RiskManager.closeTrade('PETR4', 104, 'TP');

      expect(closed).not.toBeNull();
      expect(closed!.status).toBe('CLOSED_TP');
      expect(closed!.profit).toBe(200); // 50 shares * (104-100)
      expect(closed!.profitPercent).toBe(4);
    });

    it('should close trade with SL', () => {
      RiskManager.recordTrade('PETR4', 100, 'BUY', 50, 98, 104, 5000, 100);
      const closed = RiskManager.closeTrade('PETR4', 98, 'SL');

      expect(closed).not.toBeNull();
      expect(closed!.status).toBe('CLOSED_SL');
      expect(closed!.profit).toBe(-100); // 50 shares * (98-100)
      expect(closed!.profitPercent).toBe(-2);
    });

    it('should calculate correct P&L for SELL trade', () => {
      RiskManager.recordTrade('VALE3', 100, 'SELL', 30, 102, 96, 3000, 60);
      const closed = RiskManager.closeTrade('VALE3', 96, 'TP');

      expect(closed!.profit).toBe(120); // 30 shares * (100-96)
      expect(closed!.profitPercent).toBe(4);
    });

    it('should get session metrics', () => {
      RiskManager.recordTrade('PETR4', 100, 'BUY', 50, 98, 104, 5000, 100);
      RiskManager.recordTrade('VALE3', 50, 'BUY', 100, 48, 54, 5000, 200);

      const metrics = RiskManager.getSessionMetrics(10000);

      expect(metrics.tradesOpen).toBe(2);
      expect(metrics.totalRiskExposed).toBe(300);
      expect(metrics.accountValueCurrent).toBe(10000);
    });

    it('should get trade history', () => {
      RiskManager.recordTrade('PETR4', 100, 'BUY', 50, 98, 104, 5000, 100);
      RiskManager.recordTrade('VALE3', 50, 'BUY', 100, 48, 54, 5000, 200);
      RiskManager.closeTrade('PETR4', 104, 'TP');

      const history = RiskManager.getTradeHistory();
      const openOnly = RiskManager.getTradeHistory('OPEN');
      const petr4Only = RiskManager.getTradeHistory(undefined, 'PETR4');

      expect(history).toHaveLength(2);
      expect(openOnly).toHaveLength(1);
      expect(petr4Only).toHaveLength(1);
    });
  });

  /**
   * ===== INTEGRATION TESTS =====
   */

  describe('Integration', () => {
    beforeEach(() => {
      RiskManager.resetSession();
    });

    it('should complete full trading workflow', () => {
      const params = createRiskParams();
      const trade = createTradeSetup();

      // 1. Calculate position size
      const position = RiskManager.calculatePositionSize(params, trade);
      expect(position.shares).toBeGreaterThan(0);

      // 2. Assess risk
      const assessment = RiskManager.assessRisk(params, position, 0, 0);
      expect(assessment.canTrade).toBe(true);

      // 3. Record trade
      const recorded = RiskManager.recordTrade(
        trade.ticker,
        trade.entryPrice,
        trade.direction,
        position.shares,
        trade.stopLoss,
        trade.takeProfit,
        position.positionSize,
        position.riskAmount
      );
      expect(recorded.status).toBe('OPEN');

      // 4. Close with profit
      const closed = RiskManager.closeTrade(trade.ticker, trade.takeProfit, 'TP');
      expect(closed!.profit).toBeGreaterThan(0);

      // 5. Check session metrics
      const metrics = RiskManager.getSessionMetrics(10200);
      expect(metrics.totalProfit).toBeGreaterThan(0);
    });

    it('should enforce risk limits across multiple trades', () => {
      const params = createRiskParams();

      // First trade - should pass
      const trade1 = RiskManager.calculateFixedRiskSize(
        params,
        createTradeSetup()
      );
      const assessment1 = RiskManager.assessRisk(params, trade1, 0, 0);
      expect(assessment1.canTrade).toBe(true);

      // Simulate daily loss, second trade should be rejected
      const trade2 = RiskManager.calculateFixedRiskSize(
        params,
        createTradeSetup()
      );
      const assessment2 = RiskManager.assessRisk(params, trade2, 0, 3);
      expect(assessment2.canTrade).toBe(false);
    });
  });
});
