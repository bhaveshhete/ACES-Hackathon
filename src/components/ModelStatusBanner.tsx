"use client";

import { Cpu, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { ModelStatusResponse } from "@/lib/model-adapter";

type Props = {
  modelStatus: ModelStatusResponse | null;
  loading: boolean;
  useLiveModel: boolean;
  onToggleLiveModel: (enabled: boolean) => void;
  onRefresh: () => void;
  appliedCount: number;
  totalCount: number;
};

export function ModelStatusBanner({
  modelStatus,
  loading,
  useLiveModel,
  onToggleLiveModel,
  onRefresh,
  appliedCount,
  totalCount,
}: Props) {
  const isAvailable = modelStatus?.status === "available";
  const isInvalidResponse = modelStatus?.status === "invalid_response";
  const isNotConfigured = modelStatus?.status === "not_configured";

  return (
    <section
      className="rounded-lg border p-4 space-y-3"
      style={{
        backgroundColor: "var(--surface-1)",
        borderColor: useLiveModel ? "var(--blue)" : "var(--border)",
      }}
      aria-label="Hugging Face Model Status"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: useLiveModel ? "var(--blue)" : "var(--surface-3)",
              color: "white",
            }}
          >
            <Cpu size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-silver">
                Hugging Face AI Model
              </span>
              <span
                className="text-xs font-mono px-2 py-0.5 rounded"
                style={{
                  backgroundColor: "var(--surface-2)",
                  color: "var(--blue-light)",
                  border: "1px solid var(--border-md)",
                }}
              >
                JensBender/loan-default-prediction-pipeline
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Scikit-learn Random Forest classifier pipeline via hosted backend API
            </p>
          </div>
        </div>

        {/* Live Model Toggle & Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleLiveModel(!useLiveModel)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium transition-colors"
            style={{
              backgroundColor: useLiveModel ? "var(--blue)" : "var(--surface-2)",
              color: useLiveModel ? "white" : "var(--silver)",
              border: `1px solid ${useLiveModel ? "var(--blue)" : "var(--border-md)"}`,
            }}
            aria-pressed={useLiveModel}
          >
            {useLiveModel ? "Live AI Active" : "Enable Live AI"}
          </button>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded transition-colors"
            style={{
              backgroundColor: "var(--surface-2)",
              color: "var(--muted)",
              border: "1px solid var(--border-md)",
            }}
            title="Refresh model connectivity & predictions"
            aria-label="Refresh model status"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          {loading ? (
            <span className="flex items-center gap-1.5 text-muted">
              <span className="w-2 h-2 rounded-full bg-blue animate-pulse" />
              Checking model service...
            </span>
          ) : isAvailable ? (
            <span className="flex items-center gap-1.5" style={{ color: "var(--positive)" }}>
              <CheckCircle2 size={13} />
              Service Online {modelStatus?.latencyMs ? `(${modelStatus.latencyMs}ms)` : ""}
            </span>
          ) : isInvalidResponse ? (
            <span className="flex items-center gap-1.5" style={{ color: "var(--warning)" }}>
              <AlertTriangle size={13} />
              Model Schema Error (Fallback active)
            </span>
          ) : isNotConfigured ? (
            <span className="flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
              <AlertTriangle size={13} />
              Model Not Configured (Fallback active)
            </span>
          ) : (
            <span className="flex items-center gap-1.5" style={{ color: "var(--coral)" }}>
              <XCircle size={13} />
              Service Offline (Fallback active)
            </span>
          )}

          <span className="text-muted tabular">
            • {useLiveModel ? `${appliedCount} of ${totalCount} live predictions applied` : "Using Phase 1 synthetic baselines"}
          </span>
        </div>

        <span className="text-muted">
          {useLiveModel
            ? "Risk ratings driven by validated ML predictions"
            : "Risk ratings driven by synthetic demo assumptions"}
        </span>
      </div>
    </section>
  );
}
