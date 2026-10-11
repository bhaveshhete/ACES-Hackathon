"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { BORROWER_OPPORTUNITIES, BorrowerOpportunity } from "@/lib/data";
import { filterEligible } from "@/lib/eligibility";
import { buildAllocationPlan, AllocationPlan } from "@/lib/allocation";
import { calcFinancials } from "@/lib/finance";
import { ModelPredictionResult, ModelStatusResponse } from "@/lib/model-adapter";
import { Header } from "@/components/Header";
import { InvestorControls, PresetScenario } from "@/components/InvestorControls";
import { PortfolioSummary } from "@/components/PortfolioSummary";
import { OpportunityCard } from "@/components/OpportunityCard";
import { EmptyState } from "@/components/EmptyState";
import { DemoDisclaimer } from "@/components/DemoDisclaimer";
import { ModelStatusBanner } from "@/components/ModelStatusBanner";

const DEFAULT_BUDGET = 5000;
const DEFAULT_RISK_APPETITE = 40;

export default function DashboardPage() {
  const [budget, setBudget] = useState<number>(DEFAULT_BUDGET);
  const [budgetInput, setBudgetInput] = useState<string>(String(DEFAULT_BUDGET));
  const [riskAppetite, setRiskAppetite] = useState<number>(DEFAULT_RISK_APPETITE);
  const [minTargetReturnInput, setMinTargetReturnInput] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Phase 2 & 3 Model Integration State
  const [useLiveModel, setUseLiveModel] = useState<boolean>(true);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [predictions, setPredictions] = useState<Record<string, ModelPredictionResult>>({});

  const budgetValid = Number.isFinite(budget) && budget > 0;
  const parsedMinTargetReturn = minTargetReturnInput.trim() !== ""
    ? parseFloat(minTargetReturnInput)
    : NaN;

  // Fetch model status and predictions from backend API
  const fetchModelPredictions = useCallback(async () => {
    setModelLoading(true);

    try {
      // 1. Check model status
      const statusRes = await fetch("/api/model/status");
      const statusData: ModelStatusResponse = await statusRes.json();
      setModelStatus(statusData);

      // 2. Fetch batch predictions for all opportunities with applicant profiles
      const batchPayload = {
        items: BORROWER_OPPORTUNITIES.map((opp) => ({
          borrowerId: opp.id,
          applicantProfile: opp.applicantProfile,
        })),
      };

      const predictRes = await fetch("/api/predict/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchPayload),
      });

      if (predictRes.ok) {
        const predictData = await predictRes.json();
        const predMap: Record<string, ModelPredictionResult> = {};
        for (const item of predictData.results || []) {
          predMap[item.borrowerId] = item;
        }
        setPredictions(predMap);
      }
    } catch (err) {
      console.error("Failed to fetch model predictions:", err);
      setModelStatus({
        status: "unavailable",
        modelId: "JensBender/loan-default-prediction-pipeline",
        endpoint: "/api/predict",
        notes: "Unable to reach backend prediction service.",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setModelLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModelPredictions();
  }, [fetchModelPredictions]);

  // Merge model predictions into opportunity listings
  const activeOpportunities = useMemo((): BorrowerOpportunity[] => {
    if (!useLiveModel) {
      // When live model is disabled, use baseline demo assumptions
      return BORROWER_OPPORTUNITIES.map((opp) => ({
        ...opp,
        probabilitySource: "demo_fallback",
      }));
    }

    return BORROWER_OPPORTUNITIES.map((opp): BorrowerOpportunity => {
      const pred = predictions[opp.id];

      if (!pred) {
        return opp;
      }

      if (pred.status === "model" && typeof pred.defaultProbability === "number" && Number.isFinite(pred.defaultProbability)) {
        return {
          ...opp,
          defaultProbability: pred.defaultProbability,
          probabilitySource: "model_backed",
          modelMetadata: {
            modelId: pred.modelId,
            predictionLabel: pred.predictionLabel,
            probabilities: pred.probabilities,
            inferenceTimestamp: pred.timestamp,
            latencyMs: pred.latencyMs,
            notes: pred.notes,
          },
        };
      }

      if (pred.status === "insufficient_input") {
        return {
          ...opp,
          defaultProbability: NaN, // Insufficient data invalidates calculation
          probabilitySource: "insufficient_input",
          modelMetadata: {
            modelId: pred.modelId,
            notes: pred.notes,
          },
        };
      }

      // Fallback for unavailable or error
      return {
        ...opp,
        probabilitySource: pred.status === "unavailable" ? "unavailable" : "demo_fallback",
        modelMetadata: {
          modelId: pred.modelId,
          notes: pred.notes,
        },
      };
    });
  }, [useLiveModel, predictions]);

  const eligible = useMemo(() => {
    if (!budgetValid) return [];
    const base = filterEligible(activeOpportunities, budget);
    if (!Number.isFinite(parsedMinTargetReturn)) return base;

    return base.filter((opp) => {
      try {
        const repAlloc = Math.min(budget, opp.remainingAmount);
        const fin = calcFinancials({
          allocation: repAlloc,
          annualRate: opp.annualRate,
          termMonths: opp.termMonths,
          defaultProbability: opp.defaultProbability,
          recoveryRate: opp.recoveryRate,
        });
        return fin.expectedROI >= parsedMinTargetReturn;
      } catch {
        return false;
      }
    });
  }, [activeOpportunities, budget, budgetValid, parsedMinTargetReturn]);

  const plan = useMemo((): AllocationPlan | null => {
    if (!budgetValid || eligible.length === 0) return null;
    return buildAllocationPlan(eligible, budget, riskAppetite);
  }, [eligible, budget, budgetValid, riskAppetite]);

  const handleBudgetChange = useCallback((raw: string) => {
    setBudgetInput(raw);
    const parsed = parseFloat(raw.replace(/,/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) {
      setBudget(parsed);
    } else {
      setBudget(NaN);
    }
  }, []);

  const handleSelectPreset = useCallback((preset: PresetScenario) => {
    setBudget(preset.budget);
    setBudgetInput(String(preset.budget));
    setRiskAppetite(preset.riskAppetite);
    setMinTargetReturnInput(preset.minTargetReturn !== undefined ? String(preset.minTargetReturn) : "");
    setExpandedId(null);
  }, []);

  const handleReset = useCallback(() => {
    setBudget(DEFAULT_BUDGET);
    setBudgetInput(String(DEFAULT_BUDGET));
    setRiskAppetite(DEFAULT_RISK_APPETITE);
    setMinTargetReturnInput("");
    setExpandedId(null);
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const appliedModelCount = Object.values(predictions).filter((p) => p.status === "model").length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <DemoDisclaimer />

        {/* Phase 3 Hugging Face Model Status Banner */}
        <ModelStatusBanner
          modelStatus={modelStatus}
          loading={modelLoading}
          useLiveModel={useLiveModel}
          onToggleLiveModel={setUseLiveModel}
          onRefresh={fetchModelPredictions}
          appliedCount={appliedModelCount}
          totalCount={BORROWER_OPPORTUNITIES.length}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
          {/* Left panel: controls + summary */}
          <aside className="space-y-4 lg:sticky lg:top-6">
            <InvestorControls
              budgetInput={budgetInput}
              budgetValid={budgetValid}
              riskAppetite={riskAppetite}
              minTargetReturnInput={minTargetReturnInput}
              onBudgetChange={handleBudgetChange}
              onRiskAppetiteChange={setRiskAppetite}
              onMinTargetReturnChange={setMinTargetReturnInput}
              onSelectPreset={handleSelectPreset}
              onReset={handleReset}
            />
            <PortfolioSummary
              budget={budget}
              budgetValid={budgetValid}
              plan={plan}
              eligibleCount={eligible.length}
              totalOpportunities={activeOpportunities.length}
            />
          </aside>

          {/* Right panel: recommendations */}
          <section aria-label="Investment recommendations">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
                  Recommendations
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {useLiveModel
                    ? "Ranked with Hugging Face default probability predictions"
                    : "Ranked with synthetic demo baseline probabilities"}
                </p>
              </div>
              {plan && (
                <span className="text-xs text-muted tabular">
                  {plan.recommendations.length} of {eligible.length} eligible
                </span>
              )}
            </div>

            {!budgetValid ? (
              <EmptyState type="invalid-budget" />
            ) : eligible.length === 0 ? (
              <div
                className="rounded-lg border p-8 text-center space-y-3"
                style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--silver)" }}>
                  No Opportunities Match Your Criteria
                </p>
                <p className="text-xs max-w-md mx-auto" style={{ color: "var(--muted)" }}>
                  {Number.isFinite(parsedMinTargetReturn)
                    ? `No loans currently satisfy your desired return hurdle (>= ${parsedMinTargetReturn}% ROI) within the \$${budget.toLocaleString()} budget.`
                    : `No open loans have a minimum ticket below your \$${budget.toLocaleString()} budget.`}
                </p>
                <button
                  onClick={handleReset}
                  className="text-xs underline"
                  style={{ color: "var(--blue-light)" }}
                >
                  Reset parameters to defaults
                </button>
              </div>
            ) : !plan || plan.recommendations.length === 0 ? (
              <EmptyState type="cannot-allocate" budget={budget} />
            ) : (
              <div className="space-y-3">
                {plan.recommendations.map((rec, index) => (
                  <OpportunityCard
                    key={rec.id}
                    opportunity={rec}
                    rank={index + 1}
                    isExpanded={expandedId === rec.id}
                    onToggle={() => toggleExpand(rec.id)}
                    riskAppetite={riskAppetite}
                  />
                ))}

                {plan.unallocated > 0 && (
                  <div
                    className="rounded border border-subtle px-4 py-3 text-sm"
                    style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
                  >
                    <span className="text-muted">Unallocated balance: </span>
                    <span className="tabular font-semibold" style={{ color: "var(--gold)" }}>
                      ${plan.unallocated.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-muted ml-2 text-xs">
                      — remaining capacity in top opportunities was less than your budget.
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="border-t mt-12 py-6 text-center text-xs text-muted" style={{ borderColor: "var(--border)" }}>
        <p>
          LendMatch Phase 3 &mdash; Integrated with JensBender/loan-default-prediction-pipeline.
          All figures are estimates under stated assumptions. Not financial advice. Not a licensed lender. No real money is involved.
        </p>
      </footer>
    </div>
  );
}
