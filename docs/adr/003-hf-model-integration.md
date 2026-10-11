# ADR 003: Hugging Face Model Integration & Backend Inference Architecture

## Status
Accepted

## Context
Phase 2 requires integrating a verified machine learning model for loan default prediction:
[`JensBender/loan-default-prediction-pipeline`](https://huggingface.co/JensBender/loan-default-prediction-pipeline).
The model is a scikit-learn Random Forest pipeline trained on 252,000 historical Indian loan records. It requires tabular applicant demographic features (`income`, `age`, `experience`, `married`, `house_ownership`, `car_ownership`, `profession`, `city`, `state`, `current_job_yrs`, `current_house_yrs`) rather than loan parameters (`annualRate`, `termMonths`, `minTicket`).

We evaluated two architectural strategies:
1. **Option A (Hosted Model API via Server Backend)**: Utilizing the official, verified hosted Hugging Face Space API (`https://jensbender-loan-default-prediction-app.hf.space/api/predict`), proxied and validated through our server backend.
2. **Option B (Local Model Loading via Python FastAPI)**: Downloading the scikit-learn pickle pipeline and executing it locally inside a separate Python service.

## Decision
1. **Primary Architecture**: We adopted **Option A** using Next.js 14 server-side route handlers (`/api/predict`, `/api/predict/batch`, `/api/model/status`, `/api/health`) running on Node.js.
   - **Reason**: The hosted Hugging Face Space endpoint was verified live and responded with HTTP 200 and accurate default probabilities in under 300ms. Node.js is natively available in the deployment environment. Next.js server routes keep API credentials and network calls strictly server-side, preventing secret leakage or browser CORS constraints.
2. **FastAPI Reference Parity**: A complete standalone Python FastAPI implementation was created in `backend/main.py` providing the identical contract, Pydantic schemas, and endpoints for environments opting for a standalone microservice deployment.
3. **Resolving the Data Schema Mismatch**:
   - Loan-level terms (`requestedAmount`, `annualRate`, `termMonths`, `minTicket`, `remainingAmount`) and applicant demographic features (`ApplicantProfile`) are modeled as distinct, decoupled structures.
   - We do not map loan terms into applicant attributes.
   - When applicant features are missing or invalid (such as synthetic record OPP-012), the adapter returns `insufficient_input` rather than calling the model with fabricated values.
4. **Resilience, Caching, and Provenance**:
   - Upstream calls are bounded by an 8,000ms `AbortController` timeout.
   - Successful predictions are cached in-memory by applicant feature hash to prevent repeated network requests on UI slider changes.
   - All predictions are explicitly tagged with data provenance:
     - `model_backed`: Valid prediction received from the Hugging Face pipeline.
     - `demo_fallback`: Phase 1 synthetic demo baseline used when live model is disabled or offline.
     - `insufficient_input`: Missing or out-of-bounds demographic features.
     - `unavailable`: Upstream service offline or timed out.
5. **Preserving Phase 1 Matching & Safety Math**:
   - Model-backed default probabilities seamlessly feed into the established expected payout, expected profit, expected ROI, safety score ($R_{\text{score}}$), and risk-weighted match scoring formulas without modifying the financial mathematics or violating budget constraints.

## Consequences
- **Positive**: Zero client-side credential exposure, sub-second cached re-ranking, transparent mathematical breakdowns, and high resilience against upstream downtime.
- **Limitations**: The model is a prototype dependency trained on an Indian consumer loan dataset. It is not an officially calibrated underwriting engine, nor does it guarantee repayment or reduce credit risk. Disclaimers are prominently displayed in the UI and documentation.
