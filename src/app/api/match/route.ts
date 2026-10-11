import { NextResponse } from "next/server";
import { BORROWER_OPPORTUNITIES, BorrowerOpportunity } from "@/lib/data";
import { checkEligibility } from "@/lib/eligibility";
import {
  rankOpportunities,
  allocate,
  AllocationPlan,
  MAX_RECOMMENDATIONS,
} from "@/lib/allocation";
import { calcFinancials } from "@/lib/finance";
import {
  HostedHuggingFaceModelAdapter,
  ModelStatusResponse,
  ModelPredictionResult,
} from "@/lib/model-adapter";

export type MatchRequestBody = {
  budget: number;
  riskAppetite: number;
  minTargetReturn?: number;
  useLiveModel?: boolean;
};

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body: MatchRequestBody = await request.json();
    const { budget, riskAppetite, minTargetReturn, useLiveModel = true } = body;

    // 1. Rigorous input validation
    if (typeof budget !== "number" || !Number.isFinite(budget) || budget <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid budget: must be a positive finite dollar amount.",
        },
        { status: 400 }
      );
    }

    if (
      typeof riskAppetite !== "number" ||
      !Number.isFinite(riskAppetite) ||
      riskAppetite < 0 ||
      riskAppetite > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid risk appetite: must be a finite number between 0 and 100.",
        },
        { status: 400 }
      );
    }

    if (
      minTargetReturn !== undefined &&
      minTargetReturn !== null &&
      (!Number.isFinite(minTargetReturn) || minTargetReturn < -100 || minTargetReturn > 500)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid minTargetReturn: must be a finite percentage between -100% and 500%.",
        },
        { status: 400 }
      );
    }

    // 2. Query model status & predictions if live model is requested
    const adapter = new HostedHuggingFaceModelAdapter();
    let modelStatus: ModelStatusResponse = {
      status: "not_configured",
      modelId: "JensBender/loan-default-prediction-pipeline",
      endpoint: "/api/predict",
      notes: "Live model disabled by client request.",
      timestamp: new Date().toISOString(),
    };

    const predictions: Record<string, ModelPredictionResult> = {};

    if (useLiveModel) {
      try {
        modelStatus = await adapter.checkStatus();
        if (modelStatus.status === "available") {
          const batchItems = BORROWER_OPPORTUNITIES.map((opp) => ({
            borrowerId: opp.id,
            profile: opp.applicantProfile,
          }));
          const results = await adapter.predictBatch(batchItems);
          for (const res of results) {
            predictions[res.borrowerId] = res;
          }
        }
      } catch (err: unknown) {
        modelStatus = {
          status: "unavailable",
          modelId: "JensBender/loan-default-prediction-pipeline",
          endpoint: "/api/predict",
          notes: `Failed to reach model service: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // 3. Construct active opportunities with provenance
    let appliedModelCount = 0;
    const activeOpportunities: BorrowerOpportunity[] = BORROWER_OPPORTUNITIES.map((opp) => {
      if (!useLiveModel) {
        return {
          ...opp,
          probabilitySource: "demo_fallback",
        };
      }

      const pred = predictions[opp.id];
      if (!pred) {
        return {
          ...opp,
          probabilitySource: modelStatus.status === "available" ? opp.probabilitySource : "unavailable",
          modelMetadata: {
            modelId: "JensBender/loan-default-prediction-pipeline",
            notes: modelStatus.notes,
          },
        };
      }

      if (pred.status === "model" && Number.isFinite(pred.defaultProbability)) {
        appliedModelCount++;
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
          defaultProbability: NaN,
          probabilitySource: "insufficient_input",
          modelMetadata: {
            modelId: pred.modelId,
            notes: pred.notes,
          },
        };
      }

      return {
        ...opp,
        probabilitySource: pred.status === "unavailable" ? "unavailable" : "demo_fallback",
        modelMetadata: {
          modelId: pred.modelId,
          notes: pred.notes,
        },
      };
    });

    // 4. Filter eligible opportunities
    const eligibleBase = activeOpportunities.filter(
      (opp) => checkEligibility(opp, budget).eligible
    );

    // Optional desired return (minTargetReturn) filtering
    let eligible = eligibleBase;
    if (minTargetReturn !== undefined && minTargetReturn !== null) {
      eligible = eligibleBase.filter((opp) => {
        try {
          const repAlloc = Math.min(budget, opp.remainingAmount);
          const fin = calcFinancials({
            allocation: repAlloc,
            annualRate: opp.annualRate,
            termMonths: opp.termMonths,
            defaultProbability: opp.defaultProbability,
            recoveryRate: opp.recoveryRate,
          });
          return fin.expectedROI >= minTargetReturn;
        } catch {
          return false;
        }
      });
    }

    // 5. Rank and allocate
    const ranked = rankOpportunities(eligible, budget, riskAppetite);
    const plan: AllocationPlan = allocate(ranked, budget);

    // 6. Verify financial invariants
    const budgetConserved = Math.abs((plan.totalAllocated + plan.unallocated) - budget) < 0.01;
    const zeroOverruns = plan.totalAllocated <= budget;
    const capRespected = plan.recommendations.every(
      (rec) => rec.proposedAllocation <= rec.remainingAmount && rec.proposedAllocation >= rec.minTicket
    );
    const topCountRespected = plan.recommendations.length <= MAX_RECOMMENDATIONS;

    if (!budgetConserved || !zeroOverruns || !capRespected || !topCountRespected) {
      return NextResponse.json(
        {
          success: false,
          error: "Financial invariant check failed during plan computation.",
          audit: {
            budgetConserved,
            zeroOverruns,
            capRespected,
            topCountRespected,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan,
      eligibleCount: eligible.length,
      eligibleBaseCount: eligibleBase.length,
      totalOpportunities: BORROWER_OPPORTUNITIES.length,
      modelStatus,
      appliedModelCount,
      minTargetReturn: minTargetReturn ?? null,
      audit: {
        budget,
        riskAppetite,
        minTargetReturn: minTargetReturn ?? null,
        useLiveModel,
        budgetConserved,
        zeroOverruns,
        totalAllocated: plan.totalAllocated,
        unallocated: plan.unallocated,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
