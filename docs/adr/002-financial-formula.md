# ADR 002: Financial Calculation Model, Ranking Weights, and Allocation Strategy

## Status
Accepted

## Context
The application needs deterministic formulas for calculating expected payout, expected profit, expected ROI, match score ranking, and budget-constrained portfolio allocation across synthetic borrower opportunities. The prompt provided explicit formulas sourced from the PRD, based on simple interest and expected value under default probability (PD) and recovery rate (R).

## Decision
1. **Repayment Model**:
   - `P_full = A * (1 + r * t / 12)` (simple interest across term `t` in months at annual rate `r`)
   - `P_default = A * R` (principal recovered under default at recovery rate `R`)
   - `Expected Payout = (1 - PD) * P_full + PD * P_default`
   - `Expected Profit = Expected Payout - A`
   - `Expected ROI (%) = 100 * Expected Profit / A`
2. **Match Score Formula**:
   - Normalized risk appetite `a = clamp(slider / 100, 0, 1)`
   - Safety weight `w_r = 0.65 - 0.40 * a`
   - Return weight `w_t = 0.30 + 0.40 * a`
   - Capital fit weight `w_f = 0.05`
   - Component scores:
     - Safety score: `R_score = (1 - PD) * 100`
     - Return score: `T_score = clamp(((ROI_pct + 20) / 40) * 100, 0, 100)`
     - Capital fit score: `F_score = clamp(min(budget, remaining) / remaining, 0, 1) * 100` (or 0 if budget < minTicket)
   - `Match Score = w_r * R_score + w_t * T_score + w_f * F_score`
3. **Allocation Strategy**:
   - Deterministic greedy allocation prioritizing highest match score first, capped at Top 5 recommendations.
   - For each candidate: allocation = `min(remaining_budget, opportunity_remaining_capacity)`.
   - Hard constraints: allocation must be >= `minTicket`. If remaining budget cannot satisfy the minimum ticket, the opportunity is skipped and unallocated capital is explicitly surfaced with reasons.
4. **Disclaimers & Truthfulness**:
   - Calculations are explicit estimates under stated assumptions.
   - The match score is explicitly presented as investor preference alignment, never as a credit rating or repayment probability guarantee.

## Consequences
- **Positive**: Formulas are pure functions, deterministic, auditable, and isolated into `src/lib/finance.ts`, `src/lib/eligibility.ts`, and `src/lib/allocation.ts`.
- **Assumptions**: Uses simple interest rather than monthly compounding or amortized annuity schedules (which can be introduced in later phases if required by production underwriting).
