type Props = {
  score: number;  // 0–100
  label?: string;
};

export function ScoreBar({ score, label }: Props) {
  const clamped = Math.max(0, Math.min(100, score));

  // Color: high score = blue, medium = gold, low = coral
  const color =
    clamped >= 70 ? "var(--blue)" :
    clamped >= 45 ? "var(--gold)" :
    "var(--coral)";

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between items-baseline">
          <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
          <span className="tabular text-xs font-semibold" style={{ color }}>
            {clamped.toFixed(1)}
          </span>
        </div>
      )}
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--surface-3)" }}
        role="meter"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? `${label}: ${clamped.toFixed(1)} out of 100` : `Score: ${clamped.toFixed(1)} out of 100`}
      >
        <div
          className="h-full rounded-full score-bar-fill"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
