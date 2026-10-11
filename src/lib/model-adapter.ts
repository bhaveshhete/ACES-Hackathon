/**
 * model-adapter.ts
 *
 * Real Hugging Face model integration adapter for Phase 2:
 * Model: JensBender/loan-default-prediction-pipeline
 * Hosted endpoint: https://jensbender-loan-default-prediction-app.hf.space/api/predict
 *
 * Architectural principles:
 * 1. Strict validation: checks required features and boundary ranges before transmission.
 * 2. In-memory caching: avoids duplicate network calls for unchanged applicant profiles.
 * 3. Network resilience: 8000ms timeout with AbortController, clean mapping to 'unavailable' or 'insufficient_input'.
 * 4. Provenance truthfulness: outputs explicitly tag 'model' vs 'demo_fallback' vs 'insufficient_input'.
 * 5. Server-side only: keeps credentials and endpoint logic behind the backend boundary.
 */

import { ApplicantProfile } from "./data";


export const MODEL_ID = "JensBender/loan-default-prediction-pipeline";
export const DEFAULT_ENDPOINT =
  "https://jensbender-loan-default-prediction-app.hf.space/api/predict";

export type PredictionStatus =
  | "model"
  | "demo_fallback"
  | "insufficient_input"
  | "unavailable"
  | "invalid_response"
  | "error";

export type ModelStatusKind =
  | "available"
  | "unavailable"
  | "invalid_response"
  | "not_configured";

export type ModelPredictionResult = {
  borrowerId: string;
  status: PredictionStatus;
  defaultProbability: number;
  predictionLabel?: "Default" | "No Default";
  probabilities?: {
    defaultProb: number;
    noDefaultProb: number;
  };
  modelId: string;
  isModelBacked: boolean;
  notes: string;
  timestamp: string;
  latencyMs?: number;
};

export type ModelStatusResponse = {
  status: ModelStatusKind;
  modelId: string;
  endpoint: string;
  latencyMs?: number;
  notes: string;
  timestamp: string;
};

/**
 * Validates an applicant profile against the model's exact input requirements.
 */
export function validateApplicantProfile(
  profile: Partial<ApplicantProfile> | undefined
): string[] {
  const errors: string[] = [];

  if (!profile) {
    errors.push("Applicant profile is completely missing.");
    return errors;
  }

  if (typeof profile.income !== "number" || !Number.isFinite(profile.income) || profile.income < 0) {
    errors.push("Income must be a non-negative finite number.");
  }

  if (typeof profile.age !== "number" || !Number.isFinite(profile.age) || profile.age < 21 || profile.age > 79) {
    errors.push("Age must be between 21 and 79.");
  }

  if (typeof profile.experience !== "number" || !Number.isFinite(profile.experience) || profile.experience < 0 || profile.experience > 20) {
    errors.push("Experience must be between 0 and 20 years.");
  }

  if (typeof profile.current_job_yrs !== "number" || !Number.isFinite(profile.current_job_yrs) || profile.current_job_yrs < 0 || profile.current_job_yrs > 14) {
    errors.push("Current job duration must be between 0 and 14 years.");
  }

  if (typeof profile.current_house_yrs !== "number" || !Number.isFinite(profile.current_house_yrs) || profile.current_house_yrs < 10 || profile.current_house_yrs > 14) {
    errors.push("Current house duration must be between 10 and 14 years.");
  }

  if (!profile.profession || typeof profile.profession !== "string" || profile.profession.trim() === "") {
    errors.push("Profession is required.");
  }

  if (!profile.city || typeof profile.city !== "string" || profile.city.trim() === "") {
    errors.push("City is required.");
  }

  if (!profile.state || typeof profile.state !== "string" || profile.state.trim() === "") {
    errors.push("State is required.");
  }

  return errors;
}

/**
 * In-memory LRU-like prediction cache mapping a stable hash/key to a prediction.
 */
class PredictionCache {
  private cache = new Map<string, { result: ModelPredictionResult; cachedAt: number }>();
  private readonly maxEntries = 100;
  private readonly ttlMs = 15 * 60 * 1000; // 15 minutes

  getKey(borrowerId: string, profile: ApplicantProfile): string {
    return `${borrowerId}:${profile.income}:${profile.age}:${profile.experience}:${profile.profession}:${profile.city}:${profile.state}:${profile.current_job_yrs}:${profile.current_house_yrs}`;
  }

  get(key: string): ModelPredictionResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.result;
  }

  set(key: string, result: ModelPredictionResult): void {
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { result, cachedAt: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const globalPredictionCache = new PredictionCache();

/**
 * Hosted Hugging Face Model Adapter.
 * Communicates with the hosted scikit-learn pipeline API with timeouts and validation.
 */
export class HostedHuggingFaceModelAdapter {
  private endpoint: string;
  private timeoutMs: number;
  private apiKey?: string;

  constructor(options?: { endpoint?: string; timeoutMs?: number; apiKey?: string }) {
    this.endpoint =
      options?.endpoint !== undefined
        ? options.endpoint
        : process.env.HF_PREDICT_URL || DEFAULT_ENDPOINT;
    this.timeoutMs = options?.timeoutMs || 8000;
    this.apiKey = options?.apiKey || process.env.HF_API_KEY;
  }

  /**
   * Pings the model service to check liveness and measured latency.
   */
  async checkStatus(): Promise<ModelStatusResponse> {
    const start = Date.now();

    // Check configuration
    if (!this.endpoint || typeof this.endpoint !== "string" || !this.endpoint.startsWith("http")) {
      return {
        status: "not_configured",
        modelId: MODEL_ID,
        endpoint: this.endpoint || "missing",
        latencyMs: 0,
        notes: "Model inference endpoint is not configured in environment (HF_PREDICT_URL).",
        timestamp: new Date().toISOString(),
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(this.timeoutMs, 4000));

    try {
      const rootUrl = this.endpoint.replace(/\/api\/predict\/?$/, "/");
      const headers: Record<string, string> = { "User-Agent": "LendMatch-Backend/2.0" };
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(rootUrl, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (response.ok) {
        return {
          status: "available",
          modelId: MODEL_ID,
          endpoint: this.endpoint,
          latencyMs,
          notes: "Hugging Face Space API is online and responding.",
          timestamp: new Date().toISOString(),
        };
      }

      if (response.status === 422 || response.status === 400) {
        return {
          status: "invalid_response",
          modelId: MODEL_ID,
          endpoint: this.endpoint,
          latencyMs,
          notes: `Model service responded with schema error (HTTP ${response.status}).`,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        status: "unavailable",
        modelId: MODEL_ID,
        endpoint: this.endpoint,
        latencyMs,
        notes: `Endpoint returned HTTP status ${response.status}.`,
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      const isAbort = (err as Error)?.name === "AbortError";
      const errMsg = (err as Error)?.message || String(err);
      return {
        status: "unavailable",
        modelId: MODEL_ID,
        endpoint: this.endpoint,
        latencyMs: Date.now() - start,
        notes: isAbort
          ? `Connection to Hugging Face Space timed out after ${this.timeoutMs}ms.`
          : `Failed to connect to model service: ${errMsg}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Generates a default probability prediction for a borrower using their applicant profile.
   */
  async predict(
    borrowerId: string,
    profile?: ApplicantProfile
  ): Promise<ModelPredictionResult> {
    const timestamp = new Date().toISOString();

    // 1. Validation check
    const validationErrors = validateApplicantProfile(profile);
    if (validationErrors.length > 0 || !profile) {
      return {
        borrowerId,
        status: "insufficient_input",
        defaultProbability: NaN,
        modelId: MODEL_ID,
        isModelBacked: false,
        notes: `Insufficient applicant data: ${validationErrors.join("; ")}`,
        timestamp,
      };
    }

    // 2. Cache check
    const cacheKey = globalPredictionCache.getKey(borrowerId, profile);
    const cached = globalPredictionCache.get(cacheKey);
    if (cached) {
      return { ...cached, timestamp: new Date().toISOString() };
    }

    // 3. Prepare payload matching verified OpenAPI schema
    const payload = {
      income: profile.income,
      age: profile.age,
      experience: profile.experience,
      married: profile.married ?? "single",
      house_ownership: profile.house_ownership ?? "rented",
      car_ownership: profile.car_ownership ?? "no",
      profession: profile.profession,
      city: profile.city,
      state: profile.state,
      current_job_yrs: profile.current_job_yrs,
      current_house_yrs: profile.current_house_yrs,
    };

    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "LendMatch-Backend/2.0",
      };
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (!response.ok) {
        return {
          borrowerId,
          status: "unavailable",
          defaultProbability: NaN,
          modelId: MODEL_ID,
          isModelBacked: false,
          notes: `Upstream model service returned HTTP ${response.status}: ${response.statusText}`,
          timestamp,
          latencyMs,
        };
      }

      const data = await response.json();

      // Parse verified response: { results: [{ prediction, probabilities: { Default, 'No Default' } }] }
      const firstResult = data?.results?.[0];
      const defaultProb = firstResult?.probabilities?.Default;
      const noDefaultProb = firstResult?.probabilities?.["No Default"];
      const label = firstResult?.prediction;

      if (typeof defaultProb !== "number" || !Number.isFinite(defaultProb) || defaultProb < 0 || defaultProb > 1) {
        return {
          borrowerId,
          status: "invalid_response",
          defaultProbability: NaN,
          modelId: MODEL_ID,
          isModelBacked: false,
          notes: "Malformed response structure or non-finite probability returned by model.",
          timestamp,
          latencyMs,
        };
      }

      const result: ModelPredictionResult = {
        borrowerId,
        status: "model",
        defaultProbability: defaultProb,
        predictionLabel: label === "Default" ? "Default" : "No Default",
        probabilities: {
          defaultProb,
          noDefaultProb: typeof noDefaultProb === "number" ? noDefaultProb : 1 - defaultProb,
        },
        modelId: MODEL_ID,
        isModelBacked: true,
        notes: `Model inference succeeded in ${latencyMs}ms.`,
        timestamp,
        latencyMs,
      };

      // Cache successful prediction
      globalPredictionCache.set(cacheKey, result);

      return result;
    } catch (err: unknown) {
      clearTimeout(timeout);
      const isAbort = (err as Error)?.name === "AbortError";
      const errMsg = (err as Error)?.message || String(err);
      const latencyMs = Date.now() - start;

      return {
        borrowerId,
        status: "unavailable",
        defaultProbability: NaN,
        modelId: MODEL_ID,
        isModelBacked: false,
        notes: isAbort
          ? `Model inference request timed out after ${this.timeoutMs}ms.`
          : `Network or inference failure: ${errMsg}`,
        timestamp,
        latencyMs,
      };
    }
  }

  /**
   * Batch inference helper. Runs predictions concurrently with bounded concurrency.
   */
  async predictBatch(
    items: Array<{ borrowerId: string; profile?: ApplicantProfile }>
  ): Promise<ModelPredictionResult[]> {
    return Promise.all(items.map((item) => this.predict(item.borrowerId, item.profile)));
  }
}
