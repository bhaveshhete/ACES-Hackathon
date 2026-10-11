import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as matchPost } from "@/app/api/match/route";
import { GET as opportunitiesGet } from "@/app/api/opportunities/route";

describe("Phase 3 API Integration Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/opportunities", () => {
    it("returns all 12 synthetic opportunities", async () => {
      const req = new Request("http://localhost:3000/api/opportunities");
      const res = await opportunitiesGet(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.total).toBe(12);
      expect(data.count).toBe(12);
      expect(Array.isArray(data.opportunities)).toBe(true);
      expect(data.opportunities[0]).toHaveProperty("applicantProfile");
    });

    it("filters opportunities by fundingStatus", async () => {
      const req = new Request("http://localhost:3000/api/opportunities?status=open");
      const res = await opportunitiesGet(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.opportunities.every((o: { fundingStatus: string }) => o.fundingStatus === "open")).toBe(true);
    });

    it("filters opportunities by minBudget threshold", async () => {
      const req = new Request("http://localhost:3000/api/opportunities?minBudget=100");
      const res = await opportunitiesGet(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.opportunities.every((o: { minTicket: number }) => o.minTicket <= 100)).toBe(true);
    });
  });

  describe("POST /api/match Validation", () => {
    it("rejects non-positive budget with 400", async () => {
      const req = new Request("http://localhost:3000/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: -500, riskAppetite: 50 }),
      });
      const res = await matchPost(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("budget");
    });

    it("rejects non-finite budget with 400", async () => {
      const req = new Request("http://localhost:3000/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: "invalid", riskAppetite: 50 }),
      });
      const res = await matchPost(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("rejects risk appetite outside [0, 100] with 400", async () => {
      const req = new Request("http://localhost:3000/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: 5000, riskAppetite: 150 }),
      });
      const res = await matchPost(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("risk appetite");
    });

    it("rejects invalid minTargetReturn with 400", async () => {
      const req = new Request("http://localhost:3000/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: 5000, riskAppetite: 50, minTargetReturn: 1000 }),
      });
      const res = await matchPost(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("minTargetReturn");
    });
  });

  describe("POST /api/match Execution & Financial Validation", () => {
    it("computes verified allocation plan with demo fallback (useLiveModel: false)", async () => {
      const req = new Request("http://localhost:3000/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: 10000, riskAppetite: 50, useLiveModel: false }),
      });
      const res = await matchPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.audit.budgetConserved).toBe(true);
      expect(data.audit.zeroOverruns).toBe(true);
      expect(data.plan.totalAllocated).toBeLessThanOrEqual(10000);
      expect(data.plan.totalAllocated + data.plan.unallocated).toBeCloseTo(10000, 2);
      expect(data.plan.recommendations.length).toBeLessThanOrEqual(5);

      for (const rec of data.plan.recommendations) {
        expect(rec.proposedAllocation).toBeLessThanOrEqual(rec.remainingAmount);
        expect(rec.proposedAllocation).toBeGreaterThanOrEqual(rec.minTicket);
        expect(["Low", "Moderate", "High"]).toContain(rec.riskCategory);
        expect(rec).toHaveProperty("factorScores");
        expect(rec).toHaveProperty("factorWeights");
      }
    });

    it("applies minTargetReturn filter correctly", async () => {
      // 18% ROI target hurdle
      const req = new Request("http://localhost:3000/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: 10000, riskAppetite: 85, minTargetReturn: 18, useLiveModel: false }),
      });
      const res = await matchPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      // All recommendations must meet or exceed 18% expected ROI
      for (const rec of data.plan.recommendations) {
        expect(rec.financials.expectedROI).toBeGreaterThanOrEqual(18);
      }
    });

    it("handles edge case micro-budget ($150) gracefully", async () => {
      const req = new Request("http://localhost:3000/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: 150, riskAppetite: 20, useLiveModel: false }),
      });
      const res = await matchPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.plan.totalAllocated).toBeLessThanOrEqual(150);
      expect(data.audit.budgetConserved).toBe(true);
      for (const rec of data.plan.recommendations) {
        expect(rec.minTicket).toBeLessThanOrEqual(150);
        expect(rec.proposedAllocation).toBeGreaterThanOrEqual(rec.minTicket);
      }
    });

    it("handles upstream model failure gracefully without breaking matching", async () => {
      // Mock fetch rejection (e.g. Hugging Face endpoint offline)
      vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network connection failed"));

      const req = new Request("http://localhost:3000/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: 5000, riskAppetite: 40, useLiveModel: true }),
      });
      const res = await matchPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.modelStatus.status).toBe("unavailable");
      expect(data.plan.recommendations.length).toBeGreaterThan(0);
      expect(data.audit.budgetConserved).toBe(true);
    });
  });
});
