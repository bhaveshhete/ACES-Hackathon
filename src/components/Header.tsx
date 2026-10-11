import { TrendingUp, Cpu } from "lucide-react";

export function Header() {
  return (
    <header
      className="border-b"
      style={{ backgroundColor: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "var(--blue)", opacity: 0.9 }}
            aria-hidden="true"
          >
            <TrendingUp size={16} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--silver)" }}>
              LendMatch
            </span>
            <span
              className="hidden sm:inline ml-2 text-xs font-medium uppercase tracking-widest"
              style={{ color: "var(--gold)", opacity: 0.9 }}
            >
              P2P Micro-Lending Matchmaker
            </span>
          </div>
        </div>

        <nav aria-label="Phase indicator" className="flex items-center gap-2">
          <span
            className="text-xs font-medium px-2 py-1 rounded flex items-center gap-1.5"
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              color: "var(--blue-light)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
            }}
          >
            <Cpu size={12} />
            Phase 2 &mdash; Hugging Face ML Pipeline
          </span>
        </nav>
      </div>
    </header>
  );
}
