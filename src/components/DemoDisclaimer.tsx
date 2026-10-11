import { AlertTriangle } from "lucide-react";

export function DemoDisclaimer() {
  return (
    <div
      className="flex items-start gap-3 rounded px-4 py-3 text-xs"
      style={{
        backgroundColor: "color-mix(in srgb, var(--gold) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--gold) 30%, transparent)",
        color: "var(--gold-light)",
      }}
      role="note"
      aria-label="Demo data disclaimer"
    >
      <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
      <p>
        <strong>Demo data only.</strong> Borrower records are synthetic. Default probabilities are demo
        assumptions, not predictions from any AI model. Estimated returns are illustrative calculations
        under stated assumptions — not guarantees of repayment or actual returns. This tool does not
        constitute financial advice.
      </p>
    </div>
  );
}
