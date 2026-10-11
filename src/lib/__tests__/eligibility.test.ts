/**
 * eligibility.test.ts
 *
 * TDD tests for the eligibility filter.
 * Seam: checkEligibility, filterEligible (public interface of eligibility.ts).
 */

import { describe, it, expect } from "vitest";
import { checkEligibility, filterEligible } from "../eligibility";
import { BorrowerOpportunity } from "../data";

// Base valid opportunity for testing
const baseOpp: BorrowerOpportunity = {
  id: "TEST-001",
  label: "Test Borrower",
  purpose: "Test Purpose",
  requestedAmount: 10000,
  fundedAmount: 2000,
  remainingAmount: 8000,
  minTicket: 250,
  annualRate: 0.12,
  termMonths: 12,
  defaultProbability: 0.05,
  recoveryRate: 0.40,
  probabilitySource: "demo_fallback",
  fundingStatus: "open",
  createdAt: "2026-01-01T00:00:00Z",
  dataQuality: "good",
};

describe("checkEligibility — eligible case", () => {
  it("marks a valid opportunity with sufficient budget as eligible", () => {
    const result = checkEligibility(baseOpp, 1000);
    expect(result.eligible).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });
});

describe("checkEligibility — ineligible cases", () => {
  it("rejects funded opportunities", () => {
    const result = checkEligibility({ ...baseOpp, fundingStatus: "funded" }, 1000);
    expect(result.eligible).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("rejects closed opportunities", () => {
    const result = checkEligibility({ ...baseOpp, fundingStatus: "closed" }, 1000);
    expect(result.eligible).toBe(false);
  });

  it("rejects expired opportunities", () => {
    const result = checkEligibility({ ...baseOpp, fundingStatus: "expired" }, 1000);
    expect(result.eligible).toBe(false);
  });

  it("rejects opportunities with zero remaining amount", () => {
    const result = checkEligibility({ ...baseOpp, remainingAmount: 0 }, 1000);
    expect(result.eligible).toBe(false);
    expect(result.reasons.some(r => r.includes("remaining"))).toBe(true);
  });

  it("rejects when budget is below minimum ticket", () => {
    const result = checkEligibility(baseOpp, 100); // minTicket=250
    expect(result.eligible).toBe(false);
    expect(result.reasons.some(r => r.includes("minimum ticket"))).toBe(true);
  });

  it("rejects when budget exactly equals zero", () => {
    const result = checkEligibility(baseOpp, 0);
    expect(result.eligible).toBe(false);
  });

  it("rejects when budget is NaN", () => {
    const result = checkEligibility(baseOpp, NaN);
    expect(result.eligible).toBe(false);
  });

  it("rejects when default probability is NaN (missing risk data)", () => {
    const result = checkEligibility(
      { ...baseOpp, defaultProbability: NaN, dataQuality: "missing_risk" },
      1000
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons.some(r => r.includes("Invalid risk data"))).toBe(true);
  });

  it("rejects when default probability > 1", () => {
    const result = checkEligibility({ ...baseOpp, defaultProbability: 1.5 }, 1000);
    expect(result.eligible).toBe(false);
  });

  it("rejects when default probability < 0", () => {
    const result = checkEligibility({ ...baseOpp, defaultProbability: -0.1 }, 1000);
    expect(result.eligible).toBe(false);
  });

  it("budget exactly at minimum ticket is eligible", () => {
    const result = checkEligibility(baseOpp, 250); // budget == minTicket
    expect(result.eligible).toBe(true);
  });

  it("budget one dollar below minimum ticket is ineligible", () => {
    const result = checkEligibility(baseOpp, 249);
    expect(result.eligible).toBe(false);
  });
});

describe("filterEligible", () => {
  const opportunities: BorrowerOpportunity[] = [
    baseOpp,
    { ...baseOpp, id: "TEST-002", fundingStatus: "funded", remainingAmount: 0 },
    { ...baseOpp, id: "TEST-003", minTicket: 5000 }, // budget won't cover
    { ...baseOpp, id: "TEST-004", defaultProbability: NaN, dataQuality: "missing_risk" },
    { ...baseOpp, id: "TEST-005" }, // second eligible
  ];

  it("returns only eligible opportunities for a given budget", () => {
    const eligible = filterEligible(opportunities, 1000);
    const ids = eligible.map(o => o.id);
    expect(ids).toContain("TEST-001");
    expect(ids).toContain("TEST-005");
    expect(ids).not.toContain("TEST-002"); // funded
    expect(ids).not.toContain("TEST-003"); // minTicket too high
    expect(ids).not.toContain("TEST-004"); // invalid risk data
  });

  it("returns empty array when budget is 0", () => {
    const eligible = filterEligible(opportunities, 0);
    expect(eligible).toHaveLength(0);
  });

  it("returns empty array for empty opportunity list", () => {
    const eligible = filterEligible([], 1000);
    expect(eligible).toHaveLength(0);
  });

  it("returns empty array when all opportunities are funded", () => {
    const allFunded = opportunities.map(o => ({ ...o, fundingStatus: "funded" as const }));
    const eligible = filterEligible(allFunded, 1000);
    expect(eligible).toHaveLength(0);
  });
});
