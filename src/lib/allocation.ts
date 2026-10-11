/**
 * allocation.ts
 *
 * Budget-constrained greedy allocation across ranked eligible opportunities.
 *
 * Strategy: allocate to highest-ranked opportunities first (Top 5 max),
 * never exceeding investor budget or each opportunity's remaining funding.
 * Allocation per opportunity = min(budget_remaining, opp.remainingAmount).
 * Minimum ticket is always respected.
 *
 * Ranking and allocation are separate steps — a high-ranked opportunity
 * still cannot receive more than its remaining funding or the residual budget.
 */

import { BorrowerOpportunity } from "./data";
import {
  calcFinancials,
  calcMatchScore,
  calcCapitalFitScore,
  explainMatchScore,
  getRiskCategory,
  RiskCategory,
  calcRiskScore,
  calcReturnScore,
  normalizeRiskAppetite,
} from "./finance";

export const MAX_RECOMMENDATIONS = 5;

export type FactorScores = {
  safetyScore: number;     // R_score in [0, 100]
  returnScore: number;     // T_score in [0, 100]
  capitalFitScore: number; // F_score in [0, 100]
};

export type FactorWeights = {
  safetyWeight: number;     // w_r
  returnWeight: number;     // w_t
  capitalFitWeight: number; // w_f (0.05)
};

export type RankedOpportunity = BorrowerOpportunity & {
  matchScore: number;
  financials: ReturnType<typeof calcFinancials>;
  scoredCapitalFit: number;
  reasons: string[];
  riskCategory: RiskCategory;
  factorScores: FactorScores;
  factorWeights: FactorWeights;
};

export type AllocatedOpportunity = RankedOpportunity & {
  proposedAllocation: number;
};

export type AllocationPlan = {
  recommendations: AllocatedOpportunity[];
  totalAllocated: number;
  unallocated: number;
  budget: number;
};

/**
 * Scores and ranks eligible opportunities by match score (descending).
 * Tie-breaking: stable sort (original dataset order preserved for equal scores).
 */
export function rankOpportunities(
  eligible: BorrowerOpportunity[],
  budget: number,
  riskAppetiteSlider: number,
): RankedOpportunity[] {
  const a = normalizeRiskAppetite(riskAppetiteSlider);
  const w_r = Number((0.65 - 0.40 * a).toFixed(4));
  const w_t = Number((0.30 + 0.40 * a).toFixed(4));
  const w_f = 0.05;

  const scored = eligible.map((opp): RankedOpportunity => {
    // Use a representative allocation for scoring (min of budget and remaining)
    const representativeAlloc = Math.min(budget, opp.remainingAmount);

    const financials = calcFinancials({
      allocation: representativeAlloc,
      annualRate: opp.annualRate,
      termMonths: opp.termMonths,
      defaultProbability: opp.defaultProbability,
      recoveryRate: opp.recoveryRate,
    });

    const capitalFit = calcCapitalFitScore(budget, opp.minTicket, opp.remainingAmount);
    const matchScore = calcMatchScore(
      opp.defaultProbability,
      financials.expectedROI,
      capitalFit,
      riskAppetiteSlider,
    );
    const reasons = explainMatchScore(
      opp.defaultProbability,
      financials.expectedROI,
      capitalFit,
      riskAppetiteSlider,
    );
    const riskCategory = getRiskCategory(opp.defaultProbability);
    const safetyScore = calcRiskScore(opp.defaultProbability);
    const returnScore = calcReturnScore(financials.expectedROI);

    return {
      ...opp,
      matchScore,
      financials,
      scoredCapitalFit: capitalFit,
      reasons,
      riskCategory,
      factorScores: {
        safetyScore,
        returnScore,
        capitalFitScore: capitalFit,
      },
      factorWeights: {
        safetyWeight: w_r,
        returnWeight: w_t,
        capitalFitWeight: w_f,
      },
    };
  });

  // Stable sort: highest score first. Ties preserve original order.
  return scored
    .map((opp, index) => ({ opp, index }))
    .sort((a, b) => b.opp.matchScore - a.opp.matchScore || a.index - b.index)
    .map(({ opp }) => opp);
}

/**
 * Creates a budget-constrained allocation plan for the top-ranked opportunities.
 *
 * Rules:
 *  - At most MAX_RECOMMENDATIONS (5) opportunities are considered.
 *  - Never allocate more than the investor's remaining budget.
 *  - Never allocate more than the opportunity's remaining funding.
 *  - Never allocate below the minimum ticket.
 *  - Allocation per opportunity = min(budget_remaining, remainingAmount).
 *  - If min ticket cannot be met with remaining budget, skip that opportunity.
 *  - Reports unallocated capital and the reason if applicable.
 */
export function allocate(
  ranked: RankedOpportunity[],
  budget: number,
): AllocationPlan {
  const topCandidates = ranked.slice(0, MAX_RECOMMENDATIONS);
  const recommendations: AllocatedOpportunity[] = [];
  let budgetRemaining = budget;

  for (const opp of topCandidates) {
    if (budgetRemaining < opp.minTicket) {
      // Can't meet minimum ticket — skip but don't include in recommendations
      continue;
    }

    const proposedAllocation = Math.min(budgetRemaining, opp.remainingAmount);

    // Safety check: ensure allocation meets minimum ticket (shouldn't fail given check above)
    if (proposedAllocation < opp.minTicket) continue;

    // Recalculate financials with the actual proposed allocation
    const financials = calcFinancials({
      allocation: proposedAllocation,
      annualRate: opp.annualRate,
      termMonths: opp.termMonths,
      defaultProbability: opp.defaultProbability,
      recoveryRate: opp.recoveryRate,
    });

    recommendations.push({
      ...opp,
      financials, // override with actual-allocation financials
      proposedAllocation,
    });

    budgetRemaining -= proposedAllocation;

    if (budgetRemaining <= 0) break;
  }

  const totalAllocated = budget - budgetRemaining;

  return {
    recommendations,
    totalAllocated,
    unallocated: budgetRemaining,
    budget,
  };
}

/**
 * Combines ranking and allocation into a single call.
 * This is the primary API for the dashboard.
 */
export function buildAllocationPlan(
  eligible: BorrowerOpportunity[],
  budget: number,
  riskAppetiteSlider: number,
): AllocationPlan {
  const ranked = rankOpportunities(eligible, budget, riskAppetiteSlider);
  return allocate(ranked, budget);
}
