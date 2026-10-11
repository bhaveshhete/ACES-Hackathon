# LendMatch — Hackathon Judge Demo Script

**Application URL:** [http://localhost:3000](http://localhost:3000)  
**Backend Reference:** `backend/main.py` (FastAPI)  
**Integrated AI Model:** [`JensBender/loan-default-prediction-pipeline`](https://huggingface.co/JensBender/loan-default-prediction-pipeline)  
**Test Suite:** 105 passing tests across 5 test suites (`npm run test`)

---

## 3-Minute Live Walkthrough Guide

### Step 1: Verify AI Model Connectivity (30 seconds)
1. Open [http://localhost:3000](http://localhost:3000) in your browser.
2. Observe the **Hugging Face AI Model Status Banner** at the top:
   - Status badge shows: **`Service Online (~4ms)`** (Green checkmark).
   - Provenance indicator reads: **`11 of 12 live predictions applied`** (Borrower L / OPP-012 intentionally omits features to verify clean handling of `insufficient_input`).
   - Click the **Refresh** button (circular arrow) to demonstrate live health check to the hosted Hugging Face Space API (`https://jensbender-loan-default-prediction-app.hf.space/api/predict`).
3. **Talking Point:** *"Our backend connects directly to the hosted scikit-learn Random Forest model on Hugging Face Space. Rather than mock data, default probabilities are computed live from validated applicant demographic features."*

---

### Step 2: Scenario A — Conservative Investor (30 seconds)
1. In the **Investor Controls** sidebar on the left, click the quick preset button: **`Conservative`**.
2. Automatically populates:
   - **Investment Budget:** `$5,000`
   - **Desired Return:** `8%` Min ROI
   - **Risk Appetite:** `15` ("Conservative")
3. **Observations to Highlight:**
   - Top-ranked opportunities are **Low Risk** ($PD \le 5\%$, e.g., Borrower B, Borrower I).
   - Match score weights safety heavily ($w_r = 0.65 - 0.40 \times 0.15 = 0.59$, safety weighted at 59%).
   - All recommended loans meet or exceed the 8% return hurdle.
   - Total capital allocated is exactly within budget ($5,000 allocated, $0 overrun).

---

### Step 3: Scenario B — Aggressive Growth Investor (30 seconds)
1. Click the quick preset button: **`Aggressive`**.
2. Automatically populates:
   - **Investment Budget:** `$20,000`
   - **Desired Return:** `18%` Min ROI
   - **Risk Appetite:** `85` ("Growth-oriented")
3. **Observations to Highlight:**
   - Ranking completely flips: high-yielding opportunities (e.g. 20% p.a., 18% p.a.) rank at the top.
   - Return weight dominates: $w_t = 0.30 + 0.40 \times 0.85 = 0.64$ (64% weight on return).
   - Low-yield loans (e.g. 9% p.a. or 11% p.a.) are filtered out by the 18% ROI target hurdle.
   - Budget allocation distributes across top-5 opportunities with zero overruns.

---

### Step 4: Explainable Match Deep Dive (45 seconds)
1. Click on the first recommended card to expand the **Transparent Financial & ML Breakdown**:
   - **Applicant Demographic Features:** Displays real ML inputs (Income, Age, Experience, Profession, Housing, City, Job Duration).
   - **ML Inference Details:** Shows model ID, classification (`No Default` / `Default`), exact model probabilities, and latency.
   - **Eligibility & Risk Category:** Shows explicit bucket (**Low Risk** $\le 5\%$, **Moderate Risk** $5-12\%$, or **High Risk** $> 12\%$).
   - **Expected Financial Outcomes:** Shows full repayment ($A \times (1 + r \times t / 12)$), default recovery ($A \times R$), expected payout, profit, and expected ROI.
   - **Score Breakdown:** Shows exact formula contributions ($R_{\text{score}} \times w_r + T_{\text{score}} \times w_t + F_{\text{score}} \times w_f$).
2. **Talking Point:** *"Every calculation is completely transparent and audit-ready. The investor can see exactly why a loan was matched, what the model predicted, and the mathematical expected value under conservative recovery assumptions."*

---

### Step 5: Edge Case & Graceful Fallback (30 seconds)
1. Click the quick preset button: **`Edge Case`** ($150 micro-budget).
   - **Observations:** Only opportunities with $\text{minTicket} \le \$150$ are eligible (e.g., OPP-008 with $50 minTicket, OPP-003 with $100 minTicket). Loans requiring $250+ minTicket are safely excluded with clear reasons.
2. In the AI Model banner, click **`Live AI Active`** to toggle off live AI.
   - **Observations:** The app transitions seamlessly to Phase 1 synthetic demo baselines. Opportunity badges update from `ML Predicted` to `Demo Assumption`. No errors, no broken layouts, 100% uptime.
   - Toggle **`Enable Live AI`** back on to restore live model inference.

---

### Step 6: Automated Verification (15 seconds)
Open terminal in the project directory and run:
```bash
npm run test
```
Result: **105 passing tests** across 5 test suites:
- `finance.test.ts` (43 tests — financial formulas, recovery, validation)
- `eligibility.test.ts` (17 tests — ticket size, funding status, capacity)
- `allocation.test.ts` (17 tests — greedy budget allocation, top-5, ties)
- `model-adapter.test.ts` (17 tests — 4 model states, validation, caching)
- `match-api.test.ts` (11 tests — end-to-end API integration, hurdle filter)

Run typecheck and lint:
```bash
npm run typecheck   # 0 errors
npm run lint        # 0 warnings / errors
```

---

## Judge Q&A Cheat Sheet

| Question | Answer |
| :--- | :--- |
| **Why not train your own model?** | The PRD and Phase 2 specifically directed integrating the existing verified Hugging Face pipeline (`JensBender/loan-default-prediction-pipeline`). We validated its OpenAPI contract and built a production-grade adapter with schema validation, LRU caching, and timeout resilience. |
| **How did you solve the schema mismatch?** | The model requires demographic attributes (`income`, `age`, `profession`), NOT loan terms (`annualRate`, `termMonths`). We strictly decoupled `ApplicantProfile` from loan parameters in `src/lib/data.ts`. Missing profiles (like OPP-012) trigger `insufficient_input` cleanly without fabricating data. |
| **How do you prevent budget overruns?** | The greedy allocation algorithm enforces $\sum \text{allocated} \le \text{budget}$, $\text{allocation} \le \text{remainingAmount}$, and $\text{allocation} \ge \text{minTicket}$. Both client and backend route handlers assert financial invariants and budget conservation. |
| **Is this investment advice?** | No. Prominent disclaimers, alerts, and model limitation notices are displayed throughout the UI. Calculations represent mathematical expected values under stated assumptions, not repayment guarantees. |
