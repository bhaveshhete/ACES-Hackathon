import { AlertCircle, SearchX, BadgeDollarSign } from "lucide-react";

type Props =
  | { type: "invalid-budget" }
  | { type: "no-eligible"; budget: number }
  | { type: "cannot-allocate"; budget: number };

export function EmptyState(props: Props) {
  if (props.type === "invalid-budget") {
    return (
      <EmptyStateShell
        icon={<AlertCircle size={24} style={{ color: "var(--coral)" }} aria-hidden="true" />}
        title="Enter a valid budget"
        body="Set a positive investment budget in the controls panel to see recommendations."
      />
    );
  }

  if (props.type === "no-eligible") {
    return (
      <EmptyStateShell
        icon={<SearchX size={24} style={{ color: "var(--muted)" }} aria-hidden="true" />}
        title="No eligible opportunities"
        body={
          props.budget < 50
            ? `Your budget of $${props.budget.toLocaleString()} is below the minimum ticket for all open opportunities. Try increasing your budget.`
            : `No open opportunities match your budget of $${props.budget.toLocaleString()}. Some may be fully funded or require a higher minimum investment.`
        }
      />
    );
  }

  // cannot-allocate
  return (
    <EmptyStateShell
      icon={<BadgeDollarSign size={24} style={{ color: "var(--muted)" }} aria-hidden="true" />}
      title="Budget cannot be allocated"
      body={`Your budget of $${props.budget.toLocaleString()} cannot meet the minimum ticket for any of the eligible opportunities after ranking. Try increasing your budget.`}
    />
  );
}

function EmptyStateShell({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div
      className="rounded-lg border py-12 px-8 text-center space-y-3"
      style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
      role="status"
      aria-live="polite"
    >
      <div className="flex justify-center">{icon}</div>
      <p className="text-sm font-semibold" style={{ color: "var(--silver)" }}>
        {title}
      </p>
      <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--muted)" }}>
        {body}
      </p>
    </div>
  );
}
