# LendMatch — Peer-to-Peer Micro-Lending Matchmaker (Phase 3)

A decision-support fintech application that helps investors distribute capital across peer-to-peer micro-lending opportunities using transparent financial calculations, risk-appetite controls, hurdle return targets, and real-time machine learning predictions from Hugging Face (`JensBender/loan-default-prediction-pipeline`).

> **Financial Disclaimer**: All borrower listings are synthetic. Predicted default probabilities originate from a prototype scikit-learn Random Forest model trained on 252,000 historical Indian loan records. Model outputs and calculated returns are illustrative estimates under stated assumptions, NOT creditworthiness guarantees, repayment assurances, or financial advice.

---

## Quick Start

### 1. Run the Full-Stack Application (Next.js with Integrated Server Backend)

```powershell
cd C:\Users\ASUS\.gemini\antigravity\scratch\p2p-lending-matchmaker
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 2. (Optional) Run the Standalone Python FastAPI Backend

```powershell
cd C:\Users\ASUS\.gemini\antigravity\scratch\p2p-lending-matchmaker\backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Verification & Commands

| Command | Purpose |
|---|---|
| `npm run test` | Run all 105 unit & integration tests (Vitest) |
| `npm run test:watch` | Watch mode for TDD cycles |
| `npm run typecheck` | TypeScript compiler check (`tsc --noEmit` — 0 errors) |
| `npm run lint` | ESLint verification (0 warnings/errors) |
| `npm run build` | Next.js production build |
| `npm run start` | Serve production build |

---

## Phase 3 Features & Architecture

1. **End-to-End Matching Orchestration (`POST /api/match`)**:
   - Single authoritative endpoint handling parameter validation, live model querying, hurdle return filtering, multi-factor ranking, and greedy allocation.
   - Audits and guarantees financial invariants: zero budget overruns, ticket bounds, capacity limits, and budget conservation.
2. **Four-State Hugging Face Model Health Protocol**:
   - Handles `available` (HTTP 200, online), `unavailable` (offline/timeout), `invalid_response` (HTTP 422 / schema error), and `not_configured`.
   - Never crashes or shows fabricated data; falls back cleanly to synthetic demo baselines with explicit provenance markers.
3. **Explainable Risk Bucketing & Hurdle Targets**:
   - **Low Risk**: $PD \le 5\%$ (positive green badge)
   - **Moderate Risk**: $5\% < PD \le 12\%$ (gold/blue badge)
   - **High Risk**: $PD > 12\%$ (coral badge)
   - Optional **Desired Return (Min ROI %)** filter excludes loans failing to meet the investor's minimum yield requirement.
4. **Hackathon Demo Mode & Presets**:
   - Quick one-click scenarios:
     - **Conservative**: $5k budget • 15 risk • 8% ROI hurdle
     - **Balanced**: $10k budget • 50 risk • 12% ROI hurdle
     - **Aggressive**: $20k budget • 85 risk • 18% ROI hurdle
     - **Edge Case**: $150 micro-budget (tests ticket size constraints)
   - Accompanying step-by-step judge demonstration guide in [`docs/demo-script.md`](./docs/demo-script.md).
5. **Interactive Architecture Visualizer**:
   - Open [`docs/architecture.html`](./docs/architecture.html) in any browser for an interactive pan, zoom, search, and node-inspection map of the system.

---

## Server API Contract

### `GET /api/health`
- Returns service status and version (`3.0.0`).

### `GET /api/opportunities`
- Query params: `status` (e.g. `open`), `minBudget` (e.g. `100`).
- Returns sanitized synthetic borrower opportunity listings.

### `POST /api/match`
- Request body:
```json
{
  "budget": 10000,
  "riskAppetite": 50,
  "minTargetReturn": 12,
  "useLiveModel": true
}
```
- Response returns verified `plan`, `eligibleCount`, `modelStatus`, `appliedModelCount`, and financial invariant `audit`.

### `GET /api/model/status`
- Tests upstream Hugging Face Space connectivity and measures latency in milliseconds.

### `POST /api/predict` & `POST /api/predict/batch`
- Validated individual and batch inference endpoints with schema validation and in-memory caching.

---

## Documentation & ADRs

- [`docs/demo-script.md`](./docs/demo-script.md) — 3-minute hackathon judge demo script
- [`docs/architecture.html`](./docs/architecture.html) — Interactive visual architecture diagram
- [`docs/adr/001-stack-selection.md`](./docs/adr/001-stack-selection.md) — Next.js 14, TypeScript, Tailwind CSS
- [`docs/adr/002-financial-formula.md`](./docs/adr/002-financial-formula.md) — PRD-sourced expected value mathematics
- [`docs/adr/003-hf-model-integration.md`](./docs/adr/003-hf-model-integration.md) — Hugging Face pipeline integration & caching
- [`docs/adr/004-phase3-integration-and-verification.md`](./docs/adr/004-phase3-integration-and-verification.md) — Phase 3 end-to-end integration
