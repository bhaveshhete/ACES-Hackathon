"use client";

import { RotateCcw, DollarSign, Percent, AlertCircle, Sparkles } from "lucide-react";

export type PresetScenario = {
  id: "conservative" | "balanced" | "aggressive" | "edge";
  label: string;
  description: string;
  budget: number;
  riskAppetite: number;
  minTargetReturn?: number;
};

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: "conservative",
    label: "Conservative",
    description: "$5k • Safe • 8% ROI",
    budget: 5000,
    riskAppetite: 15,
    minTargetReturn: 8,
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "$10k • Balanced • 12% ROI",
    budget: 10000,
    riskAppetite: 50,
    minTargetReturn: 12,
  },
  {
    id: "aggressive",
    label: "Aggressive",
    description: "$20k • High Return • 18% ROI",
    budget: 20000,
    riskAppetite: 85,
    minTargetReturn: 18,
  },
  {
    id: "edge",
    label: "Edge Case",
    description: "$150 micro-budget",
    budget: 150,
    riskAppetite: 50,
    minTargetReturn: undefined,
  },
];

type Props = {
  budgetInput: string;
  budgetValid: boolean;
  riskAppetite: number;
  minTargetReturnInput: string;
  onBudgetChange: (raw: string) => void;
  onRiskAppetiteChange: (value: number) => void;
  onMinTargetReturnChange: (raw: string) => void;
  onSelectPreset: (preset: PresetScenario) => void;
  onReset: () => void;
};

const RISK_LABELS: Record<number, string> = {
  0: "Capital preservation",
  25: "Conservative",
  50: "Balanced",
  75: "Growth-oriented",
  100: "Speculative",
};

function getRiskLabel(value: number): string {
  const breakpoints = [0, 25, 50, 75, 100];
  let closest = breakpoints[0];
  let minDist = Math.abs(value - breakpoints[0]);
  for (const bp of breakpoints) {
    const dist = Math.abs(value - bp);
    if (dist < minDist) {
      minDist = dist;
      closest = bp;
    }
  }
  return RISK_LABELS[closest];
}

/** Returns a CSS hue-rotate color for the slider track fill based on risk appetite. */
function getRiskColor(value: number): string {
  if (value <= 30) return "var(--positive)";
  if (value <= 60) return "var(--blue)";
  if (value <= 80) return "var(--warning)";
  return "var(--coral)";
}

export function InvestorControls({
  budgetInput,
  budgetValid,
  riskAppetite,
  minTargetReturnInput,
  onBudgetChange,
  onRiskAppetiteChange,
  onMinTargetReturnChange,
  onSelectPreset,
  onReset,
}: Props) {
  const riskColor = getRiskColor(riskAppetite);

  return (
    <section
      className="rounded-lg border p-5 space-y-6"
      style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
      aria-label="Investor controls"
    >
      {/* Title & Reset */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          Investor Controls
        </h2>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded transition-colors"
          style={{
            color: "var(--muted)",
            border: "1px solid var(--border-md)",
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--surface-3)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--silver)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
          }}
          title="Reset to defaults"
          aria-label="Reset parameters to defaults"
        >
          <RotateCcw size={11} />
          Reset
        </button>
      </div>

      {/* Demo Preset Scenarios */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} style={{ color: "var(--gold)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--silver)" }}>
            Quick Presets (Judge Demo)
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_SCENARIOS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className="text-left px-2.5 py-2 rounded text-xs transition-colors border"
              style={{
                backgroundColor: "var(--surface-2)",
                borderColor: "var(--border)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--blue)";
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--surface-3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--surface-2)";
              }}
            >
              <div className="font-semibold text-[11px]" style={{ color: "var(--silver)" }}>
                {preset.label}
              </div>
              <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Budget input */}
      <div className="space-y-2">
        <label htmlFor="budget-input" className="block text-sm font-medium" style={{ color: "var(--silver)" }}>
          Investment Budget
        </label>
        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
            style={{ color: "var(--muted)" }}
            aria-hidden="true"
          >
            <DollarSign size={14} />
          </span>
          <input
            id="budget-input"
            type="number"
            inputMode="numeric"
            value={budgetInput}
            onChange={(e) => onBudgetChange(e.target.value)}
            min={1}
            step={100}
            placeholder="e.g. 5000"
            className="w-full rounded pl-8 pr-3 py-2.5 text-sm tabular transition-colors"
            style={{
              backgroundColor: "var(--surface-2)",
              border: `1px solid ${budgetValid ? "var(--border-md)" : "var(--coral)"}`,
              color: "var(--silver)",
              outline: "none",
            }}
            onFocus={(e) => {
              (e.target as HTMLInputElement).style.borderColor = "var(--blue)";
            }}
            onBlur={(e) => {
              (e.target as HTMLInputElement).style.borderColor = budgetValid ? "var(--border-md)" : "var(--coral)";
            }}
            aria-describedby={!budgetValid ? "budget-error" : undefined}
            aria-invalid={!budgetValid}
          />
        </div>
        {!budgetValid && (
          <p id="budget-error" className="flex items-center gap-1.5 text-xs" style={{ color: "var(--coral)" }} role="alert">
            <AlertCircle size={11} aria-hidden="true" />
            Enter a positive dollar amount to see recommendations.
          </p>
        )}
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Total capital available to invest across opportunities.
        </p>
      </div>

      {/* Desired Return Target Input (Optional) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="target-return-input" className="block text-sm font-medium" style={{ color: "var(--silver)" }}>
            Desired Return <span className="text-xs font-normal" style={{ color: "var(--muted)" }}>(Min ROI %)</span>
          </label>
          {minTargetReturnInput && (
            <button
              onClick={() => onMinTargetReturnChange("")}
              className="text-[10px] underline"
              style={{ color: "var(--muted)" }}
            >
              Clear
            </button>
          )}
        </div>
        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
            style={{ color: "var(--muted)" }}
            aria-hidden="true"
          >
            <Percent size={14} />
          </span>
          <input
            id="target-return-input"
            type="number"
            inputMode="numeric"
            value={minTargetReturnInput}
            onChange={(e) => onMinTargetReturnChange(e.target.value)}
            min={0}
            max={100}
            step={0.5}
            placeholder="e.g. 10 (Optional filter)"
            className="w-full rounded pl-8 pr-3 py-2 text-sm tabular transition-colors"
            style={{
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border-md)",
              color: "var(--silver)",
              outline: "none",
            }}
            onFocus={(e) => {
              (e.target as HTMLInputElement).style.borderColor = "var(--blue)";
            }}
            onBlur={(e) => {
              (e.target as HTMLInputElement).style.borderColor = "var(--border-md)";
            }}
          />
        </div>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Optional hurdle: excludes loans with expected ROI below this target.
        </p>
      </div>

      {/* Risk appetite slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="risk-slider" className="block text-sm font-medium" style={{ color: "var(--silver)" }}>
            Risk Appetite
          </label>
          <span
            className="tabular text-sm font-semibold"
            style={{ color: riskColor }}
            aria-live="polite"
            aria-atomic="true"
          >
            {riskAppetite}
          </span>
        </div>

        <input
          id="risk-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={riskAppetite}
          onChange={(e) => onRiskAppetiteChange(Number(e.target.value))}
          className="w-full"
          style={{
            background: `linear-gradient(to right, ${riskColor} 0%, ${riskColor} ${riskAppetite}%, var(--surface-3) ${riskAppetite}%, var(--surface-3) 100%)`,
          }}
          aria-label={`Risk appetite: ${riskAppetite} out of 100`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={riskAppetite}
        />

        <div className="flex items-center justify-between text-xs" style={{ color: "var(--muted)" }}>
          <span>Safe</span>
          <span
            className="font-medium text-xs px-2 py-0.5 rounded"
            style={{ backgroundColor: "var(--surface-2)", color: riskColor }}
            aria-live="polite"
          >
            {getRiskLabel(riskAppetite)}
          </span>
          <span>Speculative</span>
        </div>

        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Higher values shift ranking weight from safety toward expected return.
        </p>
      </div>
    </section>
  );
}
