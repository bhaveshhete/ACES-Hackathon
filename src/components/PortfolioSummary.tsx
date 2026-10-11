import { Wallet, TrendingUp, BarChart3, Target } from "lucide-react";
import { AllocationPlan } from "@/lib/allocation";

type Props = {
  budget: number;
  budgetValid: boolean;
  plan: AllocationPlan | null;
  eligibleCount: number;
  totalOpportunities: number;
};

type MetricProps = {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color?: string;
  muted?: boolean;
};

function Metric({ label, value, sub, icon, color, muted }: MetricProps) {
  return (
    <div
      className="rounded p-3 space-y-1.5"
      style={{ backgroundColor: "var(--surface-2)" }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: color ?? "var(--muted)" }} aria-hidden="true">
          {icon}
        </span>
        <span className="text-xs uppercase tracking-wider font-medium" style={{ color: "var(--muted)" }}>
          {label}
        </span>
      </div>
      <p
        className="tabular text-lg font-semibold leading-none"
        style={{ color: muted ? "var(--muted)" : (color ?? "var(--silver)") }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs" style={{ color: "var(--muted)" }}>{sub}</p>
      )}
    </div>
  );
}

function formatUSD(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function PortfolioSummary({ budget, budgetValid, plan, eligibleCount, totalOpportunities }: Props) {
  const allocated = plan?.totalAllocated ?? 0;
  const unallocated = plan?.unallocated ?? (budgetValid ? budget : 0);

  const totalExpectedProfit = plan
    ? plan.recommendations.reduce((sum, rec) => sum + rec.financials.expectedProfit, 0)
    : 0;
  const totalExpectedROI = allocated > 0 ? (100 * totalExpectedProfit / allocated) : 0;

  return (
    <section
      className="rounded-lg border p-5 space-y-4"
      style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
      aria-label="Portfolio summary"
    >
      <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
        Allocation Summary
      </h2>

      <div className="grid grid-cols-2 gap-2">
        <Metric
          label="Allocated"
          value={budgetValid ? formatUSD(allocated) : "—"}
          sub={budgetValid && allocated > 0 ? `of ${formatUSD(budget)}` : undefined}
          icon={<Wallet size={13} />}
          color="var(--gold)"
          muted={!budgetValid || allocated === 0}
        />
        <Metric
          label="Unallocated"
          value={budgetValid ? formatUSD(unallocated) : "—"}
          sub={budgetValid && unallocated > 0 ? "not yet placed" : undefined}
          icon={<Target size={13} />}
          color={unallocated > 0 && budgetValid ? "var(--muted)" : "var(--positive)"}
          muted={!budgetValid}
        />
        <Metric
          label="Est. Return"
          value={budgetValid && allocated > 0 ? `${totalExpectedROI.toFixed(1)}%` : "—"}
          sub="Under demo assumptions"
          icon={<TrendingUp size={13} />}
          color={totalExpectedROI >= 0 ? "var(--positive)" : "var(--coral)"}
          muted={!budgetValid || allocated === 0}
        />
        <Metric
          label="Eligible"
          value={budgetValid ? String(eligibleCount) : "—"}
          sub={`of ${totalOpportunities} total`}
          icon={<BarChart3 size={13} />}
          color="var(--blue-light)"
          muted={!budgetValid}
        />
      </div>

      {budgetValid && allocated > 0 && (
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Estimated return is the weighted expected ROI across allocated opportunities under
          simple-interest, expected-value assumptions with demo default probabilities.
          Not a prediction of actual returns.
        </p>
      )}
    </section>
  );
}
