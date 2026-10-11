/**
 * eligibility.ts
 *
 * Determines which borrower opportunities are eligible for a given investor budget.
 *
 * Eligibility criteria (PRD-sourced):
 *  1. Funding status is "open"
 *  2. Remaining amount > 0
 *  3. Investor budget >= minimum ticket
 *  4. Default probability is a valid finite number in [0, 1]
 *  5. Recovery rate is a valid finite number in [0, 1]
 *  6. Annual rate and term are valid positive numbers
 */

import { BorrowerOpportunity } from "./data";
import { validateFinancialInputs } from "./finance";

export type EligibilityResult = {
  eligible: boolean;
  reasons: string[];
};

/**
 * Evaluates a single opportunity against investor budget.
 * Returns eligibility status and the reasons for any exclusions.
 */
export function checkEligibility(
  opp: BorrowerOpportunity,
  investorBudget: number,
): EligibilityResult {
  const reasons: string[] = [];

  if (opp.fundingStatus !== "open") {
    reasons.push(`Opportunity is not open for funding (status: ${opp.fundingStatus}).`);
  }

  if (opp.remainingAmount <= 0) {
    reasons.push("No funding capacity remaining.");
  }

  if (!Number.isFinite(investorBudget) || investorBudget <= 0) {
    reasons.push("Investor budget is invalid.");
  } else if (investorBudget < opp.minTicket) {
    reasons.push(
      `Budget (\$${investorBudget.toLocaleString()}) is below the minimum ticket (\$${opp.minTicket.toLocaleString()}).`
    );
  }

  // Validate the financial inputs needed for calculations
  const validationErrors = validateFinancialInputs({
    allocation: opp.minTicket, // use minTicket as stand-in for validation
    annualRate: opp.annualRate,
    termMonths: opp.termMonths,
    defaultProbability: opp.defaultProbability,
    recoveryRate: opp.recoveryRate,
  });
  for (const err of validationErrors) {
    if (err.field !== "allocation") { // allocation validated separately via budget
      reasons.push(`Invalid risk data: ${err.message}`);
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

/**
 * Filters the full opportunity list to only those eligible for the given budget.
 */
export function filterEligible(
  opportunities: BorrowerOpportunity[],
  investorBudget: number,
): BorrowerOpportunity[] {
  return opportunities.filter(
    (opp) => checkEligibility(opp, investorBudget).eligible
  );
}
