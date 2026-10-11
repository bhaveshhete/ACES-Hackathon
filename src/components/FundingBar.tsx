type Props = {
  funded: number;
  total: number;
};

export function FundingBar({ funded, total }: Props) {
  if (total <= 0) return null;
  const pct = Math.min(100, (funded / total) * 100);
  const remaining = total - funded;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs tabular" style={{ color: "var(--muted)" }}>
        <span>${funded.toLocaleString()} funded</span>
        <span>${remaining.toLocaleString()} remaining</span>
      </div>
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--surface-3)" }}
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct.toFixed(0)}% funded`}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: pct >= 80 ? "var(--warning)" : "var(--positive)",
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        {pct.toFixed(0)}% funded of ${total.toLocaleString()} requested
      </p>
    </div>
  );
}
