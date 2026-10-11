"use client";

import { ChevronDown, ChevronUp, Cpu, Database, AlertCircle } from "lucide-react";
import { AllocatedOpportunity } from "@/lib/allocation";
import { ScoreBar } from "./ScoreBar";
import { OpportunityDetail } from "./OpportunityDetail";

type Props = {
  opportunity: AllocatedOpportunity;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
  riskAppetite: number;
};

function formatUSD(n: number, decimals = 0): string {
  return "$" + n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const PURPOSE_COLORS: Record<string, string> = {
  "Small Business Expansion": "#60A5FA",
  "Agricultural Equipment": "#34D399",
  "Education Fees": "#A78BFA",
  "Medical Expenses": "#F87171",
  "Inventory Purchase": "#FBBF24",
  "Home Improvement": "#FB923C",
  "Small Business Startup": "#F472B6",
  "Emergency Working Capital": "#94A3B8",
  "Solar Panel Installation": "#4ADE80",
  "Livestock Purchase": "#86EFAC",
};

function purposeColor(purpose: string): string {
  return PURPOSE_COLORS[purpose] ?? "var(--blue-light)";
}

export function OpportunityCard({ opportunity: opp, rank, isExpanded, onToggle, riskAppetite }: Props) {
  const roi = opp.financials.expectedROI;
  const roiPositive = roi >= 0;
  const isModelBacked = opp.probabilitySource === "model_backed";
  const isInsufficient = opp.probabilitySource === "insufficient_input";

  return (
    <article
      className="rounded-lg border overflow-hidden transition-colors"
      style={{
        backgroundColor: "var(--surface-1)",
        borderColor: isExpanded ? "var(--blue)" : "var(--border)",
      }}
      aria-label={`Opportunity ${opp.id}: ${opp.label}, rank ${rank}`}
    >
      {/* Card header — clickable toggle */}
      <button
        className="w-full text-left"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`detail-${opp.id}`}
      >
        <div className="px-4 py-4 sm:px-5">
          {/* Top row: rank badge + label + model indicator */}
          <div className="flex items-start gap-3">
            {/* Rank */}
            <span
              className="flex-shrink-0 tabular text-xs font-bold w-6 h-6 rounded flex items-center justify-center mt-0.5"
              style={{
                backgroundColor: rank === 1 ? "var(--gold)" : "var(--surface-3)",
                color: rank === 1 ? "var(--navy)" : "var(--muted)",
              }}
              aria-label={`Rank ${rank}`}
            >
              {rank}
            </span>

            {/* Label + purpose + model provenance badge */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold" style={{ color: "var(--silver)" }}>
                  {opp.label}
                </span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: "color-mix(in srgb, " + purposeColor(opp.purpose) + " 15%, transparent)",
                    color: purposeColor(opp.purpose),
                    border: "1px solid color-mix(in srgb, " + purposeColor(opp.purpose) + " 30%, transparent)",
                  }}
                >
                  {opp.purpose}
                </span>

                {/* Risk category badge */}
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1"
                  style={{
                    backgroundColor:
                      (opp.riskCategory ?? (opp.defaultProbability <= 0.05 ? "Low" : opp.defaultProbability <= 0.12 ? "Moderate" : "High")) === "Low"
                        ? "rgba(34, 197, 94, 0.15)"
                        : (opp.riskCategory ?? (opp.defaultProbability <= 0.05 ? "Low" : opp.defaultProbability <= 0.12 ? "Moderate" : "High")) === "Moderate"
                        ? "rgba(214, 168, 79, 0.15)"
                        : "rgba(248, 113, 113, 0.15)",
                    color:
                      (opp.riskCategory ?? (opp.defaultProbability <= 0.05 ? "Low" : opp.defaultProbability <= 0.12 ? "Moderate" : "High")) === "Low"
                        ? "var(--positive)"
                        : (opp.riskCategory ?? (opp.defaultProbability <= 0.05 ? "Low" : opp.defaultProbability <= 0.12 ? "Moderate" : "High")) === "Moderate"
                        ? "var(--gold)"
                        : "var(--coral)",
                    border: `1px solid ${
                      (opp.riskCategory ?? (opp.defaultProbability <= 0.05 ? "Low" : opp.defaultProbability <= 0.12 ? "Moderate" : "High")) === "Low"
                        ? "rgba(34, 197, 94, 0.3)"
                        : (opp.riskCategory ?? (opp.defaultProbability <= 0.05 ? "Low" : opp.defaultProbability <= 0.12 ? "Moderate" : "High")) === "Moderate"
                        ? "rgba(214, 168, 79, 0.3)"
                        : "rgba(248, 113, 113, 0.3)"
                    }`,
                  }}
                >
                  {(opp.riskCategory ?? (opp.defaultProbability <= 0.05 ? "Low" : opp.defaultProbability <= 0.12 ? "Moderate" : "High"))} Risk
                </span>

                {/* Model provenance badge */}
                {isModelBacked ? (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1"
                    style={{
                      backgroundColor: "rgba(59, 130, 246, 0.15)",
                      color: "var(--blue-light)",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                    }}
                  >
                    <Cpu size={10} />
                    ML Predicted: {opp.modelMetadata?.predictionLabel || "Scored"}
                  </span>
                ) : isInsufficient ? (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1"
                    style={{
                      backgroundColor: "rgba(248, 113, 113, 0.15)",
                      color: "var(--coral)",
                      border: "1px solid rgba(248, 113, 113, 0.3)",
                    }}
                  >
                    <AlertCircle size={10} />
                    Insufficient Data
                  </span>
                ) : (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1"
                    style={{
                      backgroundColor: "var(--surface-2)",
                      color: "var(--muted)",
                      border: "1px solid var(--border-md)",
                    }}
                  >
                    <Database size={10} />
                    Demo Assumption
                  </span>
                )}
              </div>

              {/* Key figures row */}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular" style={{ color: "var(--muted)" }}>
                <span>
                  <span style={{ color: "var(--silver)" }} className="font-medium">
                    {(opp.annualRate * 100).toFixed(1)}%
                  </span>{" "}
                  p.a.
                </span>
                <span>
                  <span style={{ color: "var(--silver)" }} className="font-medium">
                    {opp.termMonths}mo
                  </span>{" "}
                  term
                </span>
                <span>
                  Default Probability:{" "}
                  <span
                    style={{
                      color:
                        opp.defaultProbability > 0.15
                          ? "var(--coral)"
                          : isModelBacked
                          ? "var(--blue-light)"
                          : "var(--silver)",
                    }}
                    className="font-medium"
                  >
                    {Number.isFinite(opp.defaultProbability)
                      ? `${(opp.defaultProbability * 100).toFixed(1)}%`
                      : "N/A"}
                  </span>
                  <span className="ml-1 text-[11px]" style={{ color: "var(--muted)" }}>
                    {isModelBacked ? "(HF Pipeline)" : "(demo)"}
                  </span>
                </span>
              </div>
            </div>

            {/* Expand toggle */}
            <span
              className="flex-shrink-0 mt-1"
              style={{ color: "var(--muted)" }}
              aria-hidden="true"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </div>

          {/* Allocation + ROI row */}
          <div
            className="mt-4 grid grid-cols-3 gap-3 rounded p-3"
            style={{ backgroundColor: "var(--surface-2)" }}
          >
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Allocation</p>
              <p className="tabular font-semibold text-sm mt-0.5" style={{ color: "var(--gold)" }}>
                {formatUSD(opp.proposedAllocation)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Est. Return</p>
              <p
                className="tabular font-semibold text-sm mt-0.5"
                style={{ color: roiPositive ? "var(--positive)" : "var(--coral)" }}
              >
                {formatUSD(opp.financials.expectedProfit, 0)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>ROI</p>
              <p
                className="tabular font-semibold text-sm mt-0.5"
                style={{ color: roiPositive ? "var(--positive)" : "var(--coral)" }}
              >
                {roi.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Match score bar */}
          <div className="mt-3">
            <ScoreBar score={opp.matchScore} label="Match score" />
          </div>

          {/* Reason pills */}
          {opp.reasons.length > 0 && (
            <div className="mt-3 flex flex-col gap-1">
              {opp.reasons.map((reason, i) => (
                <p key={i} className="text-xs" style={{ color: "var(--muted)" }}>
                  {reason}
                </p>
              ))}
            </div>
          )}
        </div>
      </button>

      {/* Detail panel */}
      {isExpanded && (
        <div id={`detail-${opp.id}`} role="region" aria-label={`Details for ${opp.label}`}>
          <div style={{ borderTop: "1px solid var(--border)" }}>
            <OpportunityDetail opportunity={opp} riskAppetite={riskAppetite} />
          </div>
        </div>
      )}
    </article>
  );
}
