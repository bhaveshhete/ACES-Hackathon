import { Info, ShieldCheck, TrendingUp, Calculator, Cpu, User } from "lucide-react";
import { AllocatedOpportunity } from "@/lib/allocation";
import { normalizeRiskAppetite, calcRiskScore, calcReturnScore } from "@/lib/finance";
import { ScoreBar } from "./ScoreBar";
import { FundingBar } from "./FundingBar";

type Props = {
  opportunity: AllocatedOpportunity;
  riskAppetite: number;
};

function Row({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="tabular text-xs font-medium text-right" style={{ color: "var(--silver)" }}>
        {value}
        {sub && <span className="block text-xs font-normal" style={{ color: "var(--muted)" }}>{sub}</span>}
      </span>
    </div>
  );
}

function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-4">
      <span style={{ color: "var(--blue-light)" }} aria-hidden="true">{icon}</span>
      <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
        {label}
      </h3>
    </div>
  );
}

export function OpportunityDetail({ opportunity: opp, riskAppetite }: Props) {
  const a = normalizeRiskAppetite(riskAppetite);
  const w_r = (0.65 - 0.40 * a).toFixed(2);
  const w_t = (0.30 + 0.40 * a).toFixed(2);
  const w_f = "0.05";

  const R_score = calcRiskScore(opp.defaultProbability);
  const T_score = calcReturnScore(opp.financials.expectedROI);
  const F_score = opp.scoredCapitalFit;

  const fin = opp.financials;
  const isModelBacked = opp.probabilitySource === "model_backed";
  const profile = opp.applicantProfile;
  const metadata = opp.modelMetadata;

  return (
    <div className="px-4 py-4 sm:px-5 space-y-1" style={{ backgroundColor: "var(--surface-2)" }}>

      {/* ── ML Input Features (Applicant Profile) ─────────────────────────── */}
      <SectionHeading icon={<User size={13} />} label="Applicant Demographic Features (ML Inputs)" />
      {profile ? (
        <>
          <Row
            label="Annual income"
            value={`₹${profile.income.toLocaleString()}`}
            sub="Model input feature (INR)"
          />
          <Row
            label="Demographics"
            value={`${profile.age} yrs • ${profile.married ?? "single"} • ${profile.experience} yrs exp`}
          />
          <Row
            label="Profession"
            value={profile.profession.replace(/_/g, " ")}
            sub="Verified model category"
          />
          <Row
            label="Location"
            value={`${profile.city.replace(/_/g, " ")}, ${profile.state.replace(/_/g, " ")}`}
          />
          <Row
            label="Housing & Vehicle"
            value={`House: ${profile.house_ownership ?? "rented"} • Car: ${profile.car_ownership ?? "no"}`}
            sub={`${profile.current_house_yrs} yrs in house, ${profile.current_job_yrs} yrs in job`}
          />
        </>
      ) : (
        <div className="py-2 text-xs" style={{ color: "var(--coral)" }}>
          No applicant demographic profile available for this listing. Model inference cannot execute without required features.
        </div>
      )}

      {/* ── Hugging Face Model Inference Metadata ──────────────────────────── */}
      <SectionHeading icon={<Cpu size={13} />} label="Hugging Face Inference Details" />
      <Row
        label="Model ID"
        value={<span className="font-mono text-[11px]">{metadata?.modelId || "JensBender/loan-default-prediction-pipeline"}</span>}
      />
      <Row
        label="Data Provenance"
        value={
          isModelBacked ? (
            <span style={{ color: "var(--blue-light)" }}>Real Hugging Face Model Inference</span>
          ) : opp.probabilitySource === "insufficient_input" ? (
            <span style={{ color: "var(--coral)" }}>Insufficient Input Data</span>
          ) : (
            <span style={{ color: "var(--gold)" }}>Synthetic Demo Baseline</span>
          )
        }
      />
      {isModelBacked && metadata?.predictionLabel && (
        <>
          <Row
            label="Pipeline Classification"
            value={
              <span
                style={{
                  color: metadata.predictionLabel === "No Default" ? "var(--positive)" : "var(--coral)",
                }}
              >
                {metadata.predictionLabel}
              </span>
            }
            sub={
              metadata.probabilities
                ? `Default: ${(metadata.probabilities.defaultProb * 100).toFixed(1)}% | Safe: ${(metadata.probabilities.noDefaultProb * 100).toFixed(1)}%`
                : undefined
            }
          />
          {metadata.latencyMs && (
            <Row label="Inference latency" value={`${metadata.latencyMs}ms`} />
          )}
          {metadata.inferenceTimestamp && (
            <Row label="Timestamp" value={new Date(metadata.inferenceTimestamp).toLocaleTimeString()} />
          )}
        </>
      )}

      {/* ── Eligibility ───────────────────────────────────────────────────── */}
      <SectionHeading icon={<ShieldCheck size={13} />} label="Eligibility Status" />
      <Row label="Funding status" value={<span style={{ color: "var(--positive)" }}>Open</span>} />
      <Row
        label="Risk Category"
        value={
          <span
            style={{
              color:
                (opp.riskCategory ?? (opp.defaultProbability <= 0.05 ? "Low" : opp.defaultProbability <= 0.12 ? "Moderate" : "High")) === "Low"
                  ? "var(--positive)"
                  : (opp.riskCategory ?? (opp.defaultProbability <= 0.05 ? "Low" : opp.defaultProbability <= 0.12 ? "Moderate" : "High")) === "Moderate"
                  ? "var(--gold)"
                  : "var(--coral)",
              fontWeight: 600,
            }}
          >
            {(opp.riskCategory ?? (opp.defaultProbability <= 0.05 ? "Low" : opp.defaultProbability <= 0.12 ? "Moderate" : "High"))} Risk
          </span>
        }
        sub={
          (opp.riskCategory ?? (opp.defaultProbability <= 0.05 ? "Low" : opp.defaultProbability <= 0.12 ? "Moderate" : "High")) === "Low"
            ? "PD ≤ 5% (Low default risk)"
            : (opp.riskCategory ?? (opp.defaultProbability <= 0.05 ? "Low" : opp.defaultProbability <= 0.12 ? "Moderate" : "High")) === "Moderate"
            ? "5% < PD ≤ 12% (Moderate default risk)"
            : "PD > 12% (High default risk)"
        }
      />
      <Row
        label="Remaining funding"
        value={`$${opp.remainingAmount.toLocaleString()}`}
        sub={`of $${opp.requestedAmount.toLocaleString()} requested`}
      />
      <Row label="Minimum ticket" value={`$${opp.minTicket.toLocaleString()}`} />
      <div className="py-2">
        <FundingBar funded={opp.fundedAmount} total={opp.requestedAmount} />
      </div>

      {/* ── Calculation assumptions ───────────────────────────────────────── */}
      <SectionHeading icon={<Calculator size={13} />} label="Financial Assumptions" />
      <Row label="Proposed allocation (A)" value={`$${opp.proposedAllocation.toLocaleString()}`} />
      <Row label="Annual interest rate (r)" value={`${(opp.annualRate * 100).toFixed(2)}%`} />
      <Row label="Loan term (t)" value={`${opp.termMonths} months`} />
      <Row
        label="Default probability (PD)"
        value={
          <span>
            {Number.isFinite(opp.defaultProbability) ? `${(opp.defaultProbability * 100).toFixed(1)}%` : "N/A"}{" "}
            <span style={{ color: isModelBacked ? "var(--blue-light)" : "var(--gold)", fontWeight: 400 }}>
              {isModelBacked ? "(HF model prediction)" : "(demo assumption)"}
            </span>
          </span>
        }
      />
      <Row label="Recovery rate (R)" value={`${(opp.recoveryRate * 100).toFixed(0)}%`} sub="Assumed fraction" />

      {/* ── Financial outputs ─────────────────────────────────────────────── */}
      <SectionHeading icon={<TrendingUp size={13} />} label="Expected Financial Outcomes" />
      <Row label="Full repayment (no default)" value={`$${fin.fullRepayment.toFixed(2)}`}
        sub="A × (1 + r × t / 12)" />
      <Row label="Default recovery" value={`$${fin.defaultRecovery.toFixed(2)}`} sub="A × R" />
      <Row
        label="Expected payout"
        value={`$${fin.expectedPayout.toFixed(2)}`}
        sub={`(1−PD) × $${fin.fullRepayment.toFixed(0)} + PD × $${fin.defaultRecovery.toFixed(0)}`}
      />
      <Row
        label="Expected profit"
        value={
          <span style={{ color: fin.expectedProfit >= 0 ? "var(--positive)" : "var(--coral)" }}>
            {fin.expectedProfit >= 0 ? "+" : ""}${fin.expectedProfit.toFixed(2)}
          </span>
        }
        sub="Expected payout − A"
      />
      <Row
        label="Expected ROI"
        value={
          <span style={{ color: fin.expectedROI >= 0 ? "var(--positive)" : "var(--coral)" }}>
            {fin.expectedROI >= 0 ? "+" : ""}{fin.expectedROI.toFixed(2)}%
          </span>
        }
        sub="100 × Profit / A"
      />

      {/* ── Score breakdown ───────────────────────────────────────────────── */}
      <SectionHeading icon={<Info size={13} />} label="Match Score Breakdown" />
      <div className="space-y-3 py-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: "var(--muted)" }}>Safety score (R_score)</span>
            <span className="tabular font-medium" style={{ color: "var(--silver)" }}>
              {R_score.toFixed(1)} &times; w<sub>r</sub>={w_r}
            </span>
          </div>
          <ScoreBar score={R_score} />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: "var(--muted)" }}>Return score (T_score)</span>
            <span className="tabular font-medium" style={{ color: "var(--silver)" }}>
              {T_score.toFixed(1)} &times; w<sub>t</sub>={w_t}
            </span>
          </div>
          <ScoreBar score={T_score} />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: "var(--muted)" }}>Capital fit (F_score)</span>
            <span className="tabular font-medium" style={{ color: "var(--silver)" }}>
              {F_score.toFixed(1)} &times; w<sub>f</sub>={w_f}
            </span>
          </div>
          <ScoreBar score={F_score} />
        </div>
        <div
          className="rounded px-3 py-2 flex justify-between items-center"
          style={{ backgroundColor: "var(--surface-3)" }}
        >
          <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
            Match score
          </span>
          <span className="tabular font-bold text-sm" style={{ color: "var(--blue-light)" }}>
            {opp.matchScore.toFixed(1)}
          </span>
        </div>
      </div>

      {/* ── Model limitations disclaimer ─────────────────────────────────── */}
      <div
        className="rounded px-3 py-3 mt-3 text-xs space-y-1.5"
        style={{
          backgroundColor: "color-mix(in srgb, var(--gold) 6%, transparent)",
          border: "1px solid color-mix(in srgb, var(--gold) 20%, transparent)",
          color: "var(--gold-light)",
        }}
        role="note"
      >
        <p className="font-semibold">Model Limitations & Financial Disclosures:</p>
        <p>
          The default probability is estimated by a prototype scikit-learn Random Forest model trained on 252,000 historical Indian loan records. It has not been independently evaluated for production lending, and does not constitute creditworthiness verification or guaranteed repayment.
        </p>
      </div>
    </div>
  );
}
