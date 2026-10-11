# LendMatch — Project Context (Phase 3)

Domain terminology, architectural conventions, and stable decisions for this codebase.

---

## Domain Terminology

| Term | Definition |
|---|---|
| **Opportunity** | A single borrower's loan request, partially or fully open for investment. |
| **Applicant Profile** | Synthetic demographic attributes (`income`, `age`, `experience`, `profession`, `city`, `state`, `current_job_yrs`, `current_house_yrs`) required by the Hugging Face scikit-learn pipeline for default prediction. |
| **Budget** | The investor's total capital available to distribute across opportunities. |
| **Allocation** | The amount actually proposed for investment in a single opportunity. |
| **Unallocated** | Budget remaining after all allocations (cannot be placed due to min-ticket constraints or exhausted capacity). |
| **Eligibility** | Whether an opportunity passes all hard filters for a given budget (open status, capacity > 0, budget >= minTicket, valid non-NaN default probability, optional hurdle return). |
| **Hurdle Return / Desired Return** | Investor-specified minimum ROI % threshold (`minTargetReturn`). Opportunities yielding below this hurdle are excluded from allocation. |
| **Risk Category** | Explicit default risk classification bucket: Low ($PD \le 5\%$), Moderate ($5\% < PD \le 12\%$), or High ($PD > 12\%$). |
| **Match score** | A weighted composite preference-alignment score (0–100) combining safety ($R_{\text{score}}$), return ($T_{\text{score}}$), and capital fit ($F_{\text{score}}$); reflects investor preference alignment, not an absolute credit guarantee. |
| **Risk appetite** | A 0–100 investor preference slider that shifts ranking weight between safety ($w_r = 0.65 - 0.40a$) and return ($w_t = 0.30 + 0.40a$). |
| **PD** | Default probability — estimated likelihood a borrower defaults; either predicted by the live Hugging Face model or derived from demo baseline assumptions. |
| **Model-Backed Prediction** | A verified default probability returned by the Hugging Face pipeline (`JensBender/loan-default-prediction-pipeline`). |
| **Demo Fallback** | Baseline synthetic probability used when live inference is disabled or offline. |
| **Insufficient Input** | State when required applicant demographic features are missing or invalid (e.g. OPP-012), preventing inference without making an invalid upstream call. |
| **Four Model States** | `available` (online 200), `unavailable` (network failure/timeout), `invalid_response` (HTTP 422 schema error), `not_configured` (missing endpoint). |

---

## Model Provenance & Limitations

- **Model ID**: `JensBender/loan-default-prediction-pipeline`
- **Model Type**: Scikit-learn Random Forest classifier pipeline with preprocessing.
- **Training Data**: 252,000 historical consumer loan applications from an Indian dataset.
- **Fairness & Operational Caveats**:
  - The model is a prototype dependency for decision-support demonstrations.
  - It is not an officially calibrated credit underwriting model.
  - Model output does not constitute guaranteed repayment or financial advice.
  - Real-world lending requires independent fairness, bias, and calibration audits.

---

## Phase Boundaries

| Phase | Scope | Status |
|---|---|---|
| Phase 1 | Synthetic data, local financial calculations, ranking, and budget-constrained greedy allocation. | Completed |
| Phase 2 | Real Hugging Face model integration via backend API routes (`/api/predict`, `/api/predict/batch`, `/api/model/status`, `/api/health`), strict schema separation between loan terms and applicant demographics, in-memory caching, live inference fallback states, and Python FastAPI reference. | Completed |
| Phase 3 | End-to-end integration, unified matching endpoint (`POST /api/match`), catalog API (`GET /api/opportunities`), 4-state model resilience, explicit risk categories, hurdle target filtering, one-click demo presets, and judge demo script. | Completed |
