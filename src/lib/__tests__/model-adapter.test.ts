/**
 * model-adapter.test.ts
 *
 * Comprehensive TDD tests for the Phase 2 Hugging Face model adapter.
 * Uses mocked global fetch to test deterministically without external network dependency.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  HostedHuggingFaceModelAdapter,
  validateApplicantProfile,
  globalPredictionCache,
  MODEL_ID,
} from "../model-adapter";
import { ApplicantProfile } from "../data";

const validProfile: ApplicantProfile = {
  isSynthetic: true,
  income: 1200000,
  age: 30,
  experience: 6,
  married: "single",
  house_ownership: "rented",
  car_ownership: "no",
  profession: "software_developer",
  city: "bhopal",
  state: "madhya_pradesh",
  current_job_yrs: 4,
  current_house_yrs: 12,
};

describe("validateApplicantProfile", () => {
  it("passes for a valid profile", () => {
    const errors = validateApplicantProfile(validProfile);
    expect(errors).toHaveLength(0);
  });

  it("fails when profile is undefined", () => {
    const errors = validateApplicantProfile(undefined);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("missing");
  });

  it("fails when income is negative or non-finite", () => {
    expect(validateApplicantProfile({ ...validProfile, income: -100 }).some(e => e.includes("Income"))).toBe(true);
    expect(validateApplicantProfile({ ...validProfile, income: NaN }).some(e => e.includes("Income"))).toBe(true);
  });

  it("fails when age is below 21 or above 79", () => {
    expect(validateApplicantProfile({ ...validProfile, age: 20 }).some(e => e.includes("Age"))).toBe(true);
    expect(validateApplicantProfile({ ...validProfile, age: 80 }).some(e => e.includes("Age"))).toBe(true);
  });

  it("fails when experience is out of [0, 20]", () => {
    expect(validateApplicantProfile({ ...validProfile, experience: -1 }).some(e => e.includes("Experience"))).toBe(true);
    expect(validateApplicantProfile({ ...validProfile, experience: 21 }).some(e => e.includes("Experience"))).toBe(true);
  });

  it("fails when job years or house years are out of range", () => {
    expect(validateApplicantProfile({ ...validProfile, current_job_yrs: 15 }).some(e => e.includes("job"))).toBe(true);
    expect(validateApplicantProfile({ ...validProfile, current_house_yrs: 9 }).some(e => e.includes("house"))).toBe(true);
    expect(validateApplicantProfile({ ...validProfile, current_house_yrs: 15 }).some(e => e.includes("house"))).toBe(true);
  });

  it("fails when required string fields are empty", () => {
    expect(validateApplicantProfile({ ...validProfile, profession: "" }).some(e => e.includes("Profession"))).toBe(true);
    expect(validateApplicantProfile({ ...validProfile, city: " " }).some(e => e.includes("City"))).toBe(true);
    expect(validateApplicantProfile({ ...validProfile, state: "" }).some(e => e.includes("State"))).toBe(true);
  });
});

describe("HostedHuggingFaceModelAdapter", () => {
  beforeEach(() => {
    globalPredictionCache.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns insufficient_input without calling network when profile is missing", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const adapter = new HostedHuggingFaceModelAdapter({ timeoutMs: 1000 });

    const result = await adapter.predict("OPP-012", undefined);

    expect(result.status).toBe("insufficient_input");
    expect(result.isModelBacked).toBe(false);
    expect(Number.isNaN(result.defaultProbability)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("successfully parses valid model response from upstream", async () => {
    const mockApiResponse = {
      results: [
        {
          prediction: "No Default",
          probabilities: {
            Default: 0.185,
            "No Default": 0.815,
          },
        },
      ],
      n_predictions: 1,
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockApiResponse,
    } as Response);

    const adapter = new HostedHuggingFaceModelAdapter({ timeoutMs: 2000 });
    const result = await adapter.predict("OPP-001", validProfile);

    expect(result.status).toBe("model");
    expect(result.isModelBacked).toBe(true);
    expect(result.modelId).toBe(MODEL_ID);
    expect(result.defaultProbability).toBeCloseTo(0.185, 4);
    expect(result.predictionLabel).toBe("No Default");
    expect(result.probabilities?.defaultProb).toBeCloseTo(0.185, 4);
    expect(result.probabilities?.noDefaultProb).toBeCloseTo(0.815, 4);
  });

  it("caches successful predictions to prevent duplicate network requests", async () => {
    const mockApiResponse = {
      results: [
        {
          prediction: "No Default",
          probabilities: { Default: 0.15, "No Default": 0.85 },
        },
      ],
      n_predictions: 1,
    };

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockApiResponse,
    } as Response);

    const adapter = new HostedHuggingFaceModelAdapter({ timeoutMs: 2000 });

    // First call
    const res1 = await adapter.predict("OPP-001", validProfile);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call with same inputs should hit cache
    const res2 = await adapter.predict("OPP-001", validProfile);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(res2.defaultProbability).toBe(res1.defaultProbability);
  });

  it("handles upstream HTTP error (500/503) cleanly as unavailable", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    } as Response);

    const adapter = new HostedHuggingFaceModelAdapter({ timeoutMs: 2000 });
    const result = await adapter.predict("OPP-001", validProfile);

    expect(result.status).toBe("unavailable");
    expect(result.isModelBacked).toBe(false);
    expect(Number.isNaN(result.defaultProbability)).toBe(true);
    expect(result.notes).toContain("503");
  });

  it("handles malformed upstream response structure without crashing", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ unexpected: "structure" }),
    } as Response);

    const adapter = new HostedHuggingFaceModelAdapter({ timeoutMs: 2000 });
    const result = await adapter.predict("OPP-001", validProfile);

    expect(result.status).toBe("invalid_response");
    expect(result.isModelBacked).toBe(false);
    expect(Number.isNaN(result.defaultProbability)).toBe(true);
    expect(result.notes).toContain("Malformed response");
  });

  it("handles network timeout cleanly without fabricating predictions", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(
      Object.assign(new Error("The operation was aborted"), { name: "AbortError" })
    );

    const adapter = new HostedHuggingFaceModelAdapter({ timeoutMs: 500 });
    const result = await adapter.predict("OPP-001", validProfile);

    expect(result.status).toBe("unavailable");
    expect(result.isModelBacked).toBe(false);
    expect(Number.isNaN(result.defaultProbability)).toBe(true);
    expect(result.notes).toContain("timed out");
  });

  it("checkStatus returns available when upstream root responds 200", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);

    const adapter = new HostedHuggingFaceModelAdapter();
    const status = await adapter.checkStatus();

    expect(status.status).toBe("available");
    expect(status.modelId).toBe(MODEL_ID);
    expect(status.notes).toContain("online");
  });

  it("checkStatus returns invalid_response when upstream responds with 422 schema error", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 422,
    } as Response);

    const adapter = new HostedHuggingFaceModelAdapter();
    const status = await adapter.checkStatus();

    expect(status.status).toBe("invalid_response");
    expect(status.notes).toContain("schema error");
  });

  it("checkStatus returns not_configured when endpoint is missing", async () => {
    const adapter = new HostedHuggingFaceModelAdapter({ endpoint: "" });
    const status = await adapter.checkStatus();

    expect(status.status).toBe("not_configured");
    expect(status.notes).toContain("not configured");
  });

  it("checkStatus returns unavailable on network exception", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Connection refused"));

    const adapter = new HostedHuggingFaceModelAdapter();
    const status = await adapter.checkStatus();

    expect(status.status).toBe("unavailable");
    expect(status.notes).toContain("Connection refused");
  });
});
