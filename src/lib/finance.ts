/**
 * finance.ts
 *
 * Pure financial calculation functions for the P2P Micro-Lending Matchmaker.
 *
 * Formula source: PRD (as specified in project prompt, simple-interest assumption).
 * All results are estimates under stated assumptions, NOT guarantees of repayment or returns.
 *
 * Notation:
 *   A   = proposed investment allocation (currency)
 *   r   = annual interest rate as a decimal (e.g. 0.12 for 12%)
 *   t   = loan term in months
 *   PD  = default probability in [0, 1]
 *   R   = recovery fraction in [0, 1]
 *   a   = normalized risk appetite in [0, 1]
 */

export type FinancialInputs = {
  allocation: number;  // A
  annualRate: number;  // r (decimal, e.g. 0.12)
  termMonths: number;  // t
  defaultProbability: number;  // PD
  recoveryRate: number;  // R
};

export type FinancialResult = {
  expectedPayout: number;
  expectedProfit: number;
  expectedROI: number;  // percentage, e.g. 8.5
  fullRepayment: number;
  defaultRecovery: number;
};

export type ValidationError = {
  field: string;
  message: string;
};

/**
 * Validates all financial inputs. Returns an array of errors (empty = valid).
 * Rejects non-finite values, out-of-range probabilities, and zero/negative amounts.
 */
export function validateFinancialInputs(inputs: FinancialInputs): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Number.isFinite(inputs.allocation) || inputs.allocation <= 0) {
    errors.push({ field: "allocation", message: "Investment amount must be a positive number." });
  }
  if (!Number.isFinite(inputs.annualRate) || inputs.annualRate < 0 || inputs.annualRate > 10) {
    errors.push({ field: "annualRate", message: "Annual rate must be between 0 and 1000%." });
  }
  if (!Number.isInteger(inputs.termMonths) && !Number.isFinite(inputs.termMonths)) {
    errors.push({ field: "termMonths", message: "Term must be a positive number of months." });
  } else if (inputs.termMonths <= 0) {
    errors.push({ field: "termMonths", message: "Loan term must be greater than zero months." });
  }
  if (!Number.isFinite(inputs.defaultProbability) || inputs.defaultProbability < 0 || inputs.defaultProbability > 1) {
    errors.push({ field: "defaultProbability", message: "Default probability must be between 0 and 1." });
  }
  if (!Number.isFinite(inputs.recoveryRate) || inputs.recoveryRate < 0 || inputs.recoveryRate > 1) {
    errors.push({ field: "recoveryRate", message: "Recovery rate must be between 0 and 1." });
  }

  return errors;
}

/**
 * Computes expected financial outcomes using the simple-interest expected-value formula.
 *
 * P_full     = A × (1 + r × t / 12)
 * P_default  = A × R
 * Expected payout  = (1 − PD) × P_full + PD × P_default
 * Expected profit  = Expected payout − A
 * Expected ROI (%) = 100 × Expected profit / A
 *
 * Throws if inputs are invalid (call validateFinancialInputs first, or let this throw).
 */
export function calcFinancials(inputs: FinancialInputs): FinancialResult {
  const errors = validateFinancialInputs(inputs);
  if (errors.length > 0) {
    throw new Error(`Invalid financial inputs: ${errors.map(e => e.message).join("; ")}`);
  }

  const { allocation: A, annualRate: r, termMonths: t, defaultProbability: PD, recoveryRate: R } = inputs;

  const fullRepayment = A * (1 + r * t / 12);
  const defaultRecovery = A * R;
  const expectedPayout = (1 - PD) * fullRepayment + PD * defaultRecovery;
  const expectedProfit = expectedPayout - A;
  // A > 0 guaranteed by validation
  const expectedROI = 100 * expectedProfit / A;

  return {
    expectedPayout,
    expectedProfit,
    expectedROI,
    fullRepayment,
    defaultRecovery,
  };
}

/**
 * Score component: safety score from default probability.
 * R_score = (1 − PD) × 100
 */
export function calcRiskScore(PD: number): number {
  return (1 - PD) * 100;
}

/**
 * Score component: return score clamped to [0, 100].
 * T_score = clamp(((ROI_pct + 20) / 40) × 100, 0, 100)
 */
export function calcReturnScore(roiPct: number): number {
  const raw = ((roiPct + 20) / 40) * 100;
  return Math.max(0, Math.min(100, raw));
}

/**
 * Capital-fit score: how well the investor's budget covers the minimum ticket,
 * and how much of the opportunity's remaining funding can be utilized.
 * Returns 0–100.
 */
export function calcCapitalFitScore(
  budget: number,
  minTicket: number,
  remaining: number,
): number {
  if (budget <= 0 || minTicket <= 0 || remaining <= 0) return 0;
  if (budget < minTicket) return 0;
  // How much can be deployed (up to what the budget allows)
  const deployable = Math.min(budget, remaining);
  // Fit = share of remaining that can be covered, capped at 1
  const fit = Math.min(deployable / remaining, 1);
  return fit * 100;
}

/**
 * Normalizes a 0–100 slider value to [0, 1].
 */
export function normalizeRiskAppetite(slider: number): number {
  if (!Number.isFinite(slider)) return 0;
  return Math.max(0, Math.min(1, slider / 100));
}

/**
 * Computes the weighted match score for an opportunity.
 *
 * a (normalized risk appetite) drives:
 *   w_r = 0.65 − 0.40 × a   (weight on safety)
 *   w_t = 0.30 + 0.40 × a   (weight on return)
 *   w_f = 0.05               (weight on capital fit)
 *
 * Weights always sum to 1.0.
 * Match score = w_r × R_score + w_t × T_score + w_f × F_score
 *
 * Higher risk appetite shifts weight from safety toward return.
 * This score reflects investor preference alignment, NOT credit quality.
 */
export function calcMatchScore(
  PD: number,
  roiPct: number,
  capitalFitScore: number,
  riskAppetiteSlider: number,
): number {
  const a = normalizeRiskAppetite(riskAppetiteSlider);
  const w_r = 0.65 - 0.40 * a;
  const w_t = 0.30 + 0.40 * a;
  const w_f = 0.05;
  // Weights sum to 1.0 by construction

  const R_score = calcRiskScore(PD);
  const T_score = calcReturnScore(roiPct);
  const F_score = capitalFitScore;

  return w_r * R_score + w_t * T_score + w_f * F_score;
}

/**
 * Returns a human-readable explanation of what drove the match score.
 */
export function explainMatchScore(
  PD: number,
  roiPct: number,
  capitalFitScore: number,
  riskAppetiteSlider: number,
): string[] {
  const a = normalizeRiskAppetite(riskAppetiteSlider);
  const w_r = 0.65 - 0.40 * a;
  const w_t = 0.30 + 0.40 * a;
  const R_score = calcRiskScore(PD);
  const T_score = calcReturnScore(roiPct);

  const reasons: string[] = [];

  if (R_score >= 80) {
    reasons.push(`Low estimated default risk (${(PD * 100).toFixed(1)}% demo probability) contributes positively.`);
  } else if (R_score < 50) {
    reasons.push(`Elevated default risk (${(PD * 100).toFixed(1)}% demo probability) reduces safety score.`);
  }

  if (T_score >= 70) {
    reasons.push(`Strong estimated return (${roiPct.toFixed(1)}% ROI) aligns with your risk appetite.`);
  } else if (T_score < 40) {
    reasons.push(`Modest estimated return (${roiPct.toFixed(1)}% ROI) at current risk appetite.`);
  }

  if (w_t > w_r) {
    reasons.push(`Your risk appetite (${riskAppetiteSlider}/100) prioritizes return over safety.`);
  } else {
    reasons.push(`Your risk appetite (${riskAppetiteSlider}/100) prioritizes safety over return.`);
  }

  return reasons.slice(0, 2);
}

export type RiskCategory = "Low" | "Moderate" | "High";

/**
 * Maps default probability (PD) to explicit Phase 3 risk category:
 * - Low: PD <= 5%
 * - Moderate: 5% < PD <= 12%
 * - High: PD > 12%
 */
export function getRiskCategory(pd: number): RiskCategory {
  if (!Number.isFinite(pd)) return "High";
  if (pd <= 0.05) return "Low";
  if (pd <= 0.12) return "Moderate";
  return "High";
}
