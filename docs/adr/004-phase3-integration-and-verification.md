# ADR 004: Phase 3 End-to-End Integration, Financial Validation, and Deployment Readiness

## Status
Accepted

## Context
Phase 3 requires transforming the frontend, financial formulas, and Hugging Face model integration into a unified, secure, verifiable end-to-end system suitable for demonstration to hackathon judges.

Key requirements addressed:
1. **Server-Side Orchestration**: A unified matching endpoint (`POST /api/match`) that encapsulates model inference, financial calculations, multi-factor ranking, and greedy allocation behind a validated server boundary.
2. **Four-State Model Resilience**: Handling `available`, `unavailable`, `invalid_response`, and `not_configured` without crashing or displaying fabricated probabilities.
3. **Financial Invariants**: Strict enforcement of budget conservation ($\sum \text{allocated} + \text{unallocated} = \text{budget}$), zero capital overruns ($\sum \text{allocated} \le \text{budget}$), ticket constraints ($\text{minTicket} \le \text{allocation} \le \text{remainingAmount}$), and candidate limits ($\le 5$).
4. **Explainable Matching**: Categorizing default risk into explicit buckets (`Low`: $PD \le 5\%$, `Moderate`: $5\% < PD \le 12\%$, `High`: $PD > 12\%$), exposing multi-factor scores ($R_{\text{score}}, T_{\text{score}}, F_{\text{score}}$), and supporting investor hurdle targets (desired return / min ROI %).
5. **Hackathon Demo Presets**: Providing one-click scenario presets (Conservative, Balanced, Aggressive, Edge Case) with an accompanying judge evaluation script.

## Decisions

### 1. Unified Matching Endpoint (`POST /api/match`)
We implemented `/api/match` as the single authoritative server route for the matching engine:
- Validates budget, risk appetite, optional minimum target return, and live model toggle.
- Queries the hosted Hugging Face Space pipeline (`JensBender/loan-default-prediction-pipeline`) with in-memory caching and bounded timeouts.
- Evaluates borrower eligibility: funding status open, capacity remaining, budget $\ge$ minTicket, valid risk inputs, and optional hurdle return constraint.
- Applies PRD-mandated weighting:
  $$w_r = 0.65 - 0.40a, \quad w_t = 0.30 + 0.40a, \quad w_f = 0.05$$
- Executes budget-constrained greedy allocation (maximum 5 opportunities) with ticket bounds.
- Audits and guarantees financial invariants before returning response.

### 2. Four-State Model Health Protocol
To ensure operational honesty and resilience, the model adapter and API routes support four distinct states:
- `available`: Hugging Face Space is live (HTTP 200) and returning validated predictions.
- `unavailable`: Upstream network failure, connection refused, or timeout (> 8,000ms).
- `invalid_response`: Upstream returned malformed JSON or non-finite probabilities (e.g., HTTP 422 schema error).
- `not_configured`: Inference endpoint URL is unset or invalid.

In all non-available states, the system gracefully falls back to synthetic demo baselines, marking provenance as `demo_fallback` or `unavailable` without crashing.

### 3. Explainable Risk Bucketing & Hurdle Targets
- Borrowers are classified into explicit risk categories:
  - **Low Risk**: $PD \le 0.05$ (green badge)
  - **Moderate Risk**: $0.05 < PD \le 0.12$ (gold/blue badge)
  - **High Risk**: $PD > 0.12$ (coral badge)
- Added optional `minTargetReturn` (Min ROI %) control allowing lenders to filter loans failing to meet their minimum yield requirement.

### 4. FastAPI Backend Parity
The Python reference service (`backend/main.py`) was upgraded to version 3.0.0, implementing identical endpoints (`GET /api/opportunities`, `POST /api/match`, `GET /api/model/status`, `POST /api/predict`, `POST /api/predict/batch`) and identical PRD financial calculations.

## Consequences
- **Positive**: Complete end-to-end user flow, 105 passing tests across 5 test suites, zero budget overruns, verifiable model provenance, and robust hackathon demonstration workflow.
- **Limitations**: Synthetic applicant demographic data is used for demonstration purposes. The ML model is a prototype and not an officially certified underwriting platform.
