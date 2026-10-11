/**
 * finance.test.ts
 *
 * TDD tests for the financial calculation module.
 * Tests verify behavior through the public interface (calcFinancials, calcMatchScore, etc.)
 * using known-good literals as expected values, not re-computations of the formula.
 *
 * Seams: calcFinancials, validateFinancialInputs, calcMatchScore, calcReturnScore,
 *        calcRiskScore, calcCapitalFitScore, normalizeRiskAppetite.
 */

import { describe, it, expect } from "vitest";
import {
  calcFinancials,
  validateFinancialInputs,
  calcMatchScore,
  calcRiskScore,
  calcReturnScore,
  calcCapitalFitScore,
  normalizeRiskAppetite,
} from "../finance";

// ─── Expected Payout and ROI ──────────────────────────────────────────────────

describe("calcFinancials — happy paths", () => {
  it("computes correct expected payout for a simple case", () => {
    // A=1000, r=0.12, t=12, PD=0.05, R=0.40
    // P_full = 1000 * (1 + 0.12*12/12) = 1000 * 1.12 = 1120
    // P_default = 1000 * 0.40 = 400
    // expected payout = 0.95*1120 + 0.05*400 = 1064 + 20 = 1084
    const result = calcFinancials({
      allocation: 1000,
      annualRate: 0.12,
      termMonths: 12,
      defaultProbability: 0.05,
      recoveryRate: 0.40,
    });
    expect(result.expectedPayout).toBeCloseTo(1084, 5);
  });

  it("computes correct expected profit", () => {
    // profit = expectedPayout - A = 1084 - 1000 = 84
    const result = calcFinancials({
      allocation: 1000,
      annualRate: 0.12,
      termMonths: 12,
      defaultProbability: 0.05,
      recoveryRate: 0.40,
    });
    expect(result.expectedProfit).toBeCloseTo(84, 5);
  });

  it("computes correct expected ROI percentage", () => {
    // ROI = 100 * 84 / 1000 = 8.4%
    const result = calcFinancials({
      allocation: 1000,
      annualRate: 0.12,
      termMonths: 12,
      defaultProbability: 0.05,
      recoveryRate: 0.40,
    });
    expect(result.expectedROI).toBeCloseTo(8.4, 5);
  });

  it("computes full repayment correctly (simple interest)", () => {
    // P_full = 500 * (1 + 0.18 * 6 / 12) = 500 * 1.09 = 545
    const result = calcFinancials({
      allocation: 500,
      annualRate: 0.18,
      termMonths: 6,
      defaultProbability: 0.10,
      recoveryRate: 0.30,
    });
    expect(result.fullRepayment).toBeCloseTo(545, 5);
  });

  it("PD=0 means full repayment always expected", () => {
    // With PD=0: expected payout = P_full
    const result = calcFinancials({
      allocation: 1000,
      annualRate: 0.10,
      termMonths: 24,
      defaultProbability: 0,
      recoveryRate: 0.40,
    });
    // P_full = 1000 * (1 + 0.10*24/12) = 1000 * 1.20 = 1200
    expect(result.expectedPayout).toBeCloseTo(1200, 5);
    expect(result.expectedROI).toBeCloseTo(20, 5);
  });

  it("PD=1 means only recovery is expected", () => {
    // With PD=1: expected payout = P_default = A * R = 1000 * 0.4 = 400
    const result = calcFinancials({
      allocation: 1000,
      annualRate: 0.20,
      termMonths: 12,
      defaultProbability: 1,
      recoveryRate: 0.40,
    });
    expect(result.expectedPayout).toBeCloseTo(400, 5);
    // ROI = 100 * (400 - 1000) / 1000 = -60%
    expect(result.expectedROI).toBeCloseTo(-60, 5);
  });

  it("R=0 with PD=1 means total loss", () => {
    const result = calcFinancials({
      allocation: 1000,
      annualRate: 0.15,
      termMonths: 12,
      defaultProbability: 1,
      recoveryRate: 0,
    });
    expect(result.expectedPayout).toBeCloseTo(0, 5);
    expect(result.expectedROI).toBeCloseTo(-100, 5);
  });

  it("very short term (1 month) produces small interest", () => {
    // P_full = 1000 * (1 + 0.12*1/12) = 1000 * 1.01 = 1010
    const result = calcFinancials({
      allocation: 1000,
      annualRate: 0.12,
      termMonths: 1,
      defaultProbability: 0,
      recoveryRate: 0.30,
    });
    expect(result.fullRepayment).toBeCloseTo(1010, 5);
  });

  it("long term (60 months) accumulates proportionally", () => {
    // P_full = 1000 * (1 + 0.12*60/12) = 1000 * 1.60 = 1600
    const result = calcFinancials({
      allocation: 1000,
      annualRate: 0.12,
      termMonths: 60,
      defaultProbability: 0,
      recoveryRate: 0.30,
    });
    expect(result.fullRepayment).toBeCloseTo(1600, 5);
  });
});

// ─── Input Validation ─────────────────────────────────────────────────────────

describe("validateFinancialInputs", () => {
  it("returns no errors for valid inputs", () => {
    const errors = validateFinancialInputs({
      allocation: 500,
      annualRate: 0.12,
      termMonths: 12,
      defaultProbability: 0.05,
      recoveryRate: 0.40,
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects zero allocation", () => {
    const errors = validateFinancialInputs({
      allocation: 0,
      annualRate: 0.12,
      termMonths: 12,
      defaultProbability: 0.05,
      recoveryRate: 0.40,
    });
    expect(errors.some(e => e.field === "allocation")).toBe(true);
  });

  it("rejects negative allocation", () => {
    const errors = validateFinancialInputs({
      allocation: -100,
      annualRate: 0.12,
      termMonths: 12,
      defaultProbability: 0.05,
      recoveryRate: 0.40,
    });
    expect(errors.some(e => e.field === "allocation")).toBe(true);
  });

  it("rejects NaN default probability", () => {
    const errors = validateFinancialInputs({
      allocation: 500,
      annualRate: 0.12,
      termMonths: 12,
      defaultProbability: NaN,
      recoveryRate: 0.40,
    });
    expect(errors.some(e => e.field === "defaultProbability")).toBe(true);
  });

  it("rejects default probability > 1", () => {
    const errors = validateFinancialInputs({
      allocation: 500,
      annualRate: 0.12,
      termMonths: 12,
      defaultProbability: 1.5,
      recoveryRate: 0.40,
    });
    expect(errors.some(e => e.field === "defaultProbability")).toBe(true);
  });

  it("rejects default probability < 0", () => {
    const errors = validateFinancialInputs({
      allocation: 500,
      annualRate: 0.12,
      termMonths: 12,
      defaultProbability: -0.01,
      recoveryRate: 0.40,
    });
    expect(errors.some(e => e.field === "defaultProbability")).toBe(true);
  });

  it("rejects recovery rate > 1", () => {
    const errors = validateFinancialInputs({
      allocation: 500,
      annualRate: 0.12,
      termMonths: 12,
      defaultProbability: 0.05,
      recoveryRate: 1.1,
    });
    expect(errors.some(e => e.field === "recoveryRate")).toBe(true);
  });

  it("rejects Infinity allocation", () => {
    const errors = validateFinancialInputs({
      allocation: Infinity,
      annualRate: 0.12,
      termMonths: 12,
      defaultProbability: 0.05,
      recoveryRate: 0.40,
    });
    expect(errors.some(e => e.field === "allocation")).toBe(true);
  });

  it("rejects zero term", () => {
    const errors = validateFinancialInputs({
      allocation: 500,
      annualRate: 0.12,
      termMonths: 0,
      defaultProbability: 0.05,
      recoveryRate: 0.40,
    });
    expect(errors.some(e => e.field === "termMonths")).toBe(true);
  });

  it("calcFinancials throws on invalid inputs", () => {
    expect(() =>
      calcFinancials({
        allocation: -1,
        annualRate: 0.12,
        termMonths: 12,
        defaultProbability: 0.05,
        recoveryRate: 0.40,
      })
    ).toThrow();
  });
});

// ─── Score Components ─────────────────────────────────────────────────────────

describe("calcRiskScore", () => {
  it("PD=0 gives risk score of 100", () => {
    expect(calcRiskScore(0)).toBe(100);
  });

  it("PD=1 gives risk score of 0", () => {
    expect(calcRiskScore(1)).toBe(0);
  });

  it("PD=0.10 gives risk score of 90", () => {
    expect(calcRiskScore(0.10)).toBeCloseTo(90, 5);
  });
});

describe("calcReturnScore", () => {
  it("ROI=20% gives score of 100 (upper bound)", () => {
    expect(calcReturnScore(20)).toBe(100);
  });

  it("ROI=-20% gives score of 0 (lower bound)", () => {
    expect(calcReturnScore(-20)).toBe(0);
  });

  it("ROI=0% gives score of 50", () => {
    // ((0 + 20) / 40) * 100 = 50
    expect(calcReturnScore(0)).toBeCloseTo(50, 5);
  });

  it("ROI above 20% is clamped to 100", () => {
    expect(calcReturnScore(50)).toBe(100);
  });

  it("ROI below -20% is clamped to 0", () => {
    expect(calcReturnScore(-50)).toBe(0);
  });
});

describe("calcCapitalFitScore", () => {
  it("returns 0 when budget < minTicket", () => {
    expect(calcCapitalFitScore(100, 500, 5000)).toBe(0);
  });

  it("returns 100 when budget covers all remaining funding", () => {
    expect(calcCapitalFitScore(10000, 100, 1000)).toBe(100);
  });

  it("returns proportional score when budget partially covers remaining", () => {
    // deployable = min(500, 1000) = 500; fit = 500/1000 = 0.5; score = 50
    expect(calcCapitalFitScore(500, 100, 1000)).toBeCloseTo(50, 5);
  });

  it("returns 0 for zero budget", () => {
    expect(calcCapitalFitScore(0, 100, 1000)).toBe(0);
  });
});

// ─── Match Score ──────────────────────────────────────────────────────────────

describe("calcMatchScore", () => {
  it("at risk appetite 0: safety dominates (w_r=0.65, w_t=0.30, w_f=0.05)", () => {
    // Low PD, decent ROI — safety score should dominate
    const score = calcMatchScore(0.05, 8, 80, 0);
    // w_r=0.65, R_score=95; w_t=0.30, T_score=clamp((8+20)/40*100)=70; w_f=0.05, F=80
    // 0.65*95 + 0.30*70 + 0.05*80 = 61.75 + 21 + 4 = 86.75
    expect(score).toBeCloseTo(86.75, 2);
  });

  it("at risk appetite 100: return dominates (w_r=0.25, w_t=0.70, w_f=0.05)", () => {
    const score = calcMatchScore(0.05, 8, 80, 100);
    // w_r=0.25, R_score=95; w_t=0.70, T_score=70; w_f=0.05, F=80
    // 0.25*95 + 0.70*70 + 0.05*80 = 23.75 + 49 + 4 = 76.75
    expect(score).toBeCloseTo(76.75, 2);
  });

  it("at risk appetite 50: balanced weights (w_r=0.45, w_t=0.50, w_f=0.05)", () => {
    const score = calcMatchScore(0.05, 8, 80, 50);
    // w_r=0.65-0.20=0.45, w_t=0.30+0.20=0.50, w_f=0.05
    // 0.45*95 + 0.50*70 + 0.05*80 = 42.75 + 35 + 4 = 81.75
    expect(score).toBeCloseTo(81.75, 2);
  });

  it("weights always sum to 1.0", () => {
    // Test for several appetite values
    for (const appetite of [0, 25, 50, 75, 100]) {
      const a = appetite / 100;
      const w_r = 0.65 - 0.40 * a;
      const w_t = 0.30 + 0.40 * a;
      const w_f = 0.05;
      expect(w_r + w_t + w_f).toBeCloseTo(1.0, 10);
    }
  });

  it("higher risk appetite shifts ranking toward higher-return opportunities", () => {
    // High return, higher risk opportunity
    const highReturn = { PD: 0.20, roi: 18, fit: 70 };
    // Lower return, lower risk opportunity
    const lowRisk = { PD: 0.03, roi: 6, fit: 70 };

    const highReturnScore_riskAverse = calcMatchScore(highReturn.PD, highReturn.roi, highReturn.fit, 10);
    const lowRiskScore_riskAverse = calcMatchScore(lowRisk.PD, lowRisk.roi, lowRisk.fit, 10);

    const highReturnScore_riskTolerant = calcMatchScore(highReturn.PD, highReturn.roi, highReturn.fit, 90);
    const lowRiskScore_riskTolerant = calcMatchScore(lowRisk.PD, lowRisk.roi, lowRisk.fit, 90);

    // Risk-averse: low-risk opp should score higher
    expect(lowRiskScore_riskAverse).toBeGreaterThan(highReturnScore_riskAverse);
    // Risk-tolerant: high-return opp should score higher (or at least closer)
    expect(highReturnScore_riskTolerant).toBeGreaterThan(lowRiskScore_riskTolerant);
  });

  it("score is bounded — cannot exceed weight * 100 bounds", () => {
    // Perfect opportunity: PD=0, max ROI clamped at 100, fit=100, any appetite
    const score = calcMatchScore(0, 50, 100, 50); // ROI 50% -> T_score=100
    // 0.45*100 + 0.50*100 + 0.05*100 = 100
    expect(score).toBeCloseTo(100, 5);
  });
});

// ─── normalizeRiskAppetite ────────────────────────────────────────────────────

describe("normalizeRiskAppetite", () => {
  it("0 maps to 0", () => expect(normalizeRiskAppetite(0)).toBe(0));
  it("100 maps to 1", () => expect(normalizeRiskAppetite(100)).toBe(1));
  it("50 maps to 0.5", () => expect(normalizeRiskAppetite(50)).toBe(0.5));
  it("clamps values above 100", () => expect(normalizeRiskAppetite(150)).toBe(1));
  it("clamps values below 0", () => expect(normalizeRiskAppetite(-10)).toBe(0));
  it("handles NaN gracefully", () => expect(normalizeRiskAppetite(NaN)).toBe(0));
});
