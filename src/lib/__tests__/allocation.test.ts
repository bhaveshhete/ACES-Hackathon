/**
 * allocation.test.ts
 *
 * TDD tests for the ranking and allocation engine.
 * Seams: rankOpportunities, allocate, buildAllocationPlan (public interface of allocation.ts).
 */

import { describe, it, expect } from "vitest";
import { rankOpportunities, allocate, buildAllocationPlan, MAX_RECOMMENDATIONS } from "../allocation";
import { BorrowerOpportunity } from "../data";

const makeOpp = (overrides: Partial<BorrowerOpportunity> & { id: string }): BorrowerOpportunity => {
  const defaults: BorrowerOpportunity = {
    id: overrides.id,
    label: `Borrower ${overrides.id}`,
    purpose: "Test",
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
  return { ...defaults, ...overrides };
};


describe("rankOpportunities", () => {
  it("returns same count as input", () => {
    const opps = [makeOpp({ id: "A" }), makeOpp({ id: "B" })];
    const ranked = rankOpportunities(opps, 5000, 50);
    expect(ranked).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    const ranked = rankOpportunities([], 5000, 50);
    expect(ranked).toHaveLength(0);
  });

  it("assigns a matchScore to every opportunity", () => {
    const opps = [makeOpp({ id: "A" }), makeOpp({ id: "B" })];
    const ranked = rankOpportunities(opps, 5000, 50);
    for (const opp of ranked) {
      expect(typeof opp.matchScore).toBe("number");
      expect(Number.isFinite(opp.matchScore)).toBe(true);
    }
  });

  it("sorts highest score first", () => {
    // Higher PD (riskier) opportunity vs lower PD (safer), at appetite=0 (safety-first)
    const safer = makeOpp({ id: "SAFE", defaultProbability: 0.02, annualRate: 0.09 });
    const riskier = makeOpp({ id: "RISKY", defaultProbability: 0.25, annualRate: 0.20 });
    const ranked = rankOpportunities([riskier, safer], 5000, 0);
    // At appetite=0, safety dominates — safer should rank first
    expect(ranked[0].id).toBe("SAFE");
  });

  it("at high risk appetite, high-return opportunity ranks higher", () => {
    const highReturn = makeOpp({ id: "HIGH", defaultProbability: 0.15, annualRate: 0.22 });
    const lowReturn = makeOpp({ id: "LOW", defaultProbability: 0.03, annualRate: 0.08 });
    const ranked = rankOpportunities([lowReturn, highReturn], 5000, 95);
    expect(ranked[0].id).toBe("HIGH");
  });

  it("tie-breaking preserves original order", () => {
    // Create two identical opportunities — scores will be identical
    const a = makeOpp({ id: "FIRST" });
    const b = makeOpp({ id: "SECOND" });
    const ranked = rankOpportunities([a, b], 5000, 50);
    // FIRST should remain before SECOND (stable sort)
    expect(ranked[0].id).toBe("FIRST");
    expect(ranked[1].id).toBe("SECOND");
  });
});

describe("allocate", () => {
  const opps = [
    makeOpp({ id: "A", remainingAmount: 3000, minTicket: 250 }),
    makeOpp({ id: "B", remainingAmount: 4000, minTicket: 100 }),
    makeOpp({ id: "C", remainingAmount: 2000, minTicket: 500 }),
  ];

  it("never allocates more than the investor budget", () => {
    const ranked = rankOpportunities(opps, 2000, 50);
    const plan = allocate(ranked, 2000);
    expect(plan.totalAllocated).toBeLessThanOrEqual(2000);
  });

  it("never allocates more than opportunity remaining amount", () => {
    const ranked = rankOpportunities(opps, 100000, 50);
    const plan = allocate(ranked, 100000);
    for (const rec of plan.recommendations) {
      expect(rec.proposedAllocation).toBeLessThanOrEqual(rec.remainingAmount);
    }
  });

  it("never allocates below minimum ticket", () => {
    const ranked = rankOpportunities(opps, 5000, 50);
    const plan = allocate(ranked, 5000);
    for (const rec of plan.recommendations) {
      expect(rec.proposedAllocation).toBeGreaterThanOrEqual(rec.minTicket);
    }
  });

  it("totalAllocated + unallocated = budget", () => {
    const budget = 5000;
    const ranked = rankOpportunities(opps, budget, 50);
    const plan = allocate(ranked, budget);
    expect(plan.totalAllocated + plan.unallocated).toBeCloseTo(budget, 5);
  });

  it("shows unallocated when budget cannot meet any min ticket", () => {
    const highMinTicket = [makeOpp({ id: "A", minTicket: 10000, remainingAmount: 50000 })];
    const ranked = rankOpportunities(highMinTicket, 100, 50);
    const plan = allocate(ranked, 100);
    expect(plan.recommendations).toHaveLength(0);
    expect(plan.unallocated).toBe(100);
    expect(plan.totalAllocated).toBe(0);
  });

  it("returns at most MAX_RECOMMENDATIONS opportunities", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      makeOpp({ id: `OPP-${i}`, remainingAmount: 1000, minTicket: 50 })
    );
    const ranked = rankOpportunities(many, 100000, 50);
    const plan = allocate(ranked, 100000);
    expect(plan.recommendations.length).toBeLessThanOrEqual(MAX_RECOMMENDATIONS);
  });

  it("handles empty eligible list", () => {
    const plan = allocate([], 5000);
    expect(plan.recommendations).toHaveLength(0);
    expect(plan.totalAllocated).toBe(0);
    expect(plan.unallocated).toBe(5000);
  });

  it("does not allocate negative amounts", () => {
    const ranked = rankOpportunities(opps, 5000, 50);
    const plan = allocate(ranked, 5000);
    for (const rec of plan.recommendations) {
      expect(rec.proposedAllocation).toBeGreaterThan(0);
    }
  });

  it("stops allocating when budget is fully spent", () => {
    // Two tiny-remaining opportunities and a large budget
    const tinyOpps = [
      makeOpp({ id: "T1", remainingAmount: 100, minTicket: 50 }),
      makeOpp({ id: "T2", remainingAmount: 100, minTicket: 50 }),
    ];
    const ranked = rankOpportunities(tinyOpps, 10000, 50);
    const plan = allocate(ranked, 10000);
    expect(plan.totalAllocated).toBe(200); // can only allocate 200 total
    expect(plan.unallocated).toBe(9800);
  });
});

describe("buildAllocationPlan — integration", () => {
  it("combines ranking and allocation correctly", () => {
    const eligible = [
      makeOpp({ id: "A", defaultProbability: 0.05, annualRate: 0.12 }),
      makeOpp({ id: "B", defaultProbability: 0.20, annualRate: 0.20 }),
    ];
    const plan = buildAllocationPlan(eligible, 5000, 50);
    expect(plan.recommendations.length).toBeGreaterThan(0);
    expect(plan.totalAllocated + plan.unallocated).toBeCloseTo(5000, 5);
  });

  it("returns empty recommendations for empty eligible list", () => {
    const plan = buildAllocationPlan([], 5000, 50);
    expect(plan.recommendations).toHaveLength(0);
    expect(plan.unallocated).toBe(5000);
  });
});
