"""
LendMatch Phase 3 - Python FastAPI Backend Reference Service

Provides:
- GET  /health           : Service liveness
- GET  /api/model/status : Model service connectivity, latency, and 4-state metadata
- POST /api/predict      : Validated inference request for a single borrower
- POST /api/predict/batch: Batch inference for multiple borrowers
- GET  /api/opportunities: Synthetic borrower opportunity listings
- POST /api/match        : End-to-end matching, ranking, and allocation engine
"""

import os
import time
import math
from typing import List, Optional, Literal, Dict, Any
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx

app = FastAPI(
    title="LendMatch Backend API",
    version="3.0.0",
    description="Backend service integrating JensBender/loan-default-prediction-pipeline and PRD allocation engine",
)

# CORS configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

MODEL_ID = "JensBender/loan-default-prediction-pipeline"
DEFAULT_HF_ENDPOINT = "https://jensbender-loan-default-prediction-app.hf.space/api/predict"
HF_ENDPOINT = os.getenv("HF_PREDICT_URL", DEFAULT_HF_ENDPOINT)
HF_API_KEY = os.getenv("HF_API_KEY")


class ApplicantProfileInput(BaseModel):
    income: float = Field(..., ge=0, description="Annual income (INR)")
    age: int = Field(..., ge=21, le=79, description="Applicant age in years")
    experience: int = Field(..., ge=0, le=20, description="Professional experience in years")
    married: Optional[Literal["single", "married"]] = "single"
    house_ownership: Optional[Literal["rented", "owned", "norent_noown"]] = "rented"
    car_ownership: Optional[Literal["yes", "no"]] = "no"
    profession: str = Field(..., min_length=1, description="Profession matching model enum")
    city: str = Field(..., min_length=1, description="City matching model enum")
    state: str = Field(..., min_length=1, description="State matching model enum")
    current_job_yrs: int = Field(..., ge=0, le=14, description="Years in current job")
    current_house_yrs: int = Field(..., ge=10, le=14, description="Years in current house")


class SinglePredictionRequest(BaseModel):
    borrowerId: str = Field(..., min_length=1)
    applicantProfile: Optional[ApplicantProfileInput] = None


class BatchPredictionRequest(BaseModel):
    items: List[SinglePredictionRequest] = Field(..., max_length=25)


class Probabilities(BaseModel):
    defaultProb: float
    noDefaultProb: float


class PredictionResult(BaseModel):
    borrowerId: str
    status: Literal["model", "demo_fallback", "insufficient_input", "unavailable", "invalid_response", "error"]
    defaultProbability: Optional[float]
    predictionLabel: Optional[Literal["Default", "No Default"]] = None
    probabilities: Optional[Probabilities] = None
    modelId: str = MODEL_ID
    isModelBacked: bool
    notes: str
    timestamp: str
    latencyMs: Optional[int] = None


class MatchRequest(BaseModel):
    budget: float = Field(..., gt=0, description="Investor budget in USD")
    riskAppetite: float = Field(..., ge=0, le=100, description="Risk appetite slider [0, 100]")
    minTargetReturn: Optional[float] = Field(None, ge=-100, le=500, description="Optional minimum ROI % target")
    useLiveModel: bool = Field(True, description="Whether to query live Hugging Face model")


# 12 Synthetic Borrower Opportunities (Exact parity with TypeScript data.ts)
SYNTHETIC_OPPORTUNITIES: List[Dict[str, Any]] = [
    {
        "id": "OPP-001",
        "label": "Borrower A",
        "purpose": "Small Business Expansion",
        "requestedAmount": 15000,
        "fundedAmount": 6000,
        "remainingAmount": 9000,
        "minTicket": 250,
        "annualRate": 0.14,
        "termMonths": 24,
        "defaultProbability": 0.06,
        "recoveryRate": 0.35,
        "probabilitySource": "demo_fallback",
        "fundingStatus": "open",
        "createdAt": "2026-09-01T00:00:00Z",
        "dataQuality": "good",
        "applicantProfile": {
            "isSynthetic": True,
            "income": 1300000,
            "age": 32,
            "experience": 6,
            "married": "married",
            "house_ownership": "owned",
            "car_ownership": "yes",
            "profession": "Software_Developer",
            "city": "Bengaluru",
            "state": "Karnataka",
            "current_job_yrs": 5,
            "current_house_yrs": 12,
        },
    },
    {
        "id": "OPP-002",
        "label": "Borrower B",
        "purpose": "Agricultural Equipment",
        "requestedAmount": 8000,
        "fundedAmount": 7000,
        "remainingAmount": 1000,
        "minTicket": 200,
        "annualRate": 0.11,
        "termMonths": 12,
        "defaultProbability": 0.03,
        "recoveryRate": 0.50,
        "probabilitySource": "demo_fallback",
        "fundingStatus": "open",
        "createdAt": "2026-09-05T00:00:00Z",
        "dataQuality": "good",
        "applicantProfile": {
            "isSynthetic": True,
            "income": 850000,
            "age": 45,
            "experience": 15,
            "married": "married",
            "house_ownership": "owned",
            "car_ownership": "no",
            "profession": "Mechanical_Engineer",
            "city": "Nagpur",
            "state": "Maharashtra",
            "current_job_yrs": 8,
            "current_house_yrs": 14,
        },
    },
    {
        "id": "OPP-003",
        "label": "Borrower C",
        "purpose": "Education Fees",
        "requestedAmount": 5000,
        "fundedAmount": 1500,
        "remainingAmount": 3500,
        "minTicket": 100,
        "annualRate": 0.17,
        "termMonths": 18,
        "defaultProbability": 0.11,
        "recoveryRate": 0.20,
        "probabilitySource": "demo_fallback",
        "fundingStatus": "open",
        "createdAt": "2026-09-10T00:00:00Z",
        "dataQuality": "good",
        "applicantProfile": {
            "isSynthetic": True,
            "income": 420000,
            "age": 24,
            "experience": 2,
            "married": "single",
            "house_ownership": "rented",
            "car_ownership": "no",
            "profession": "Technical_writer",
            "city": "Indore",
            "state": "Madhya_Pradesh",
            "current_job_yrs": 2,
            "current_house_yrs": 10,
        },
    },
    {
        "id": "OPP-004",
        "label": "Borrower D",
        "purpose": "Medical Expenses",
        "requestedAmount": 12000,
        "fundedAmount": 12000,
        "remainingAmount": 0,
        "minTicket": 500,
        "annualRate": 0.09,
        "termMonths": 12,
        "defaultProbability": 0.02,
        "recoveryRate": 0.60,
        "probabilitySource": "demo_fallback",
        "fundingStatus": "funded",
        "createdAt": "2026-08-20T00:00:00Z",
        "dataQuality": "good",
        "applicantProfile": {
            "isSynthetic": True,
            "income": 1900000,
            "age": 52,
            "experience": 18,
            "married": "married",
            "house_ownership": "owned",
            "car_ownership": "yes",
            "profession": "Physician",
            "city": "Chennai",
            "state": "Tamil_Nadu",
            "current_job_yrs": 10,
            "current_house_yrs": 14,
        },
    },
    {
        "id": "OPP-005",
        "label": "Borrower E",
        "purpose": "Inventory Purchase",
        "requestedAmount": 20000,
        "fundedAmount": 4000,
        "remainingAmount": 16000,
        "minTicket": 500,
        "annualRate": 0.16,
        "termMonths": 36,
        "defaultProbability": 0.08,
        "recoveryRate": 0.30,
        "probabilitySource": "demo_fallback",
        "fundingStatus": "open",
        "createdAt": "2026-09-12T00:00:00Z",
        "dataQuality": "good",
        "applicantProfile": {
            "isSynthetic": True,
            "income": 1100000,
            "age": 38,
            "experience": 10,
            "married": "married",
            "house_ownership": "rented",
            "car_ownership": "yes",
            "profession": "Architect",
            "city": "Pune",
            "state": "Maharashtra",
            "current_job_yrs": 6,
            "current_house_yrs": 11,
        },
    },
    {
        "id": "OPP-006",
        "label": "Borrower F",
        "purpose": "Home Improvement",
        "requestedAmount": 6000,
        "fundedAmount": 1000,
        "remainingAmount": 5000,
        "minTicket": 200,
        "annualRate": 0.13,
        "termMonths": 24,
        "defaultProbability": 0.05,
        "recoveryRate": 0.40,
        "probabilitySource": "demo_fallback",
        "fundingStatus": "open",
        "createdAt": "2026-09-15T00:00:00Z",
        "dataQuality": "good",
        "applicantProfile": {
            "isSynthetic": True,
            "income": 720000,
            "age": 41,
            "experience": 12,
            "married": "married",
            "house_ownership": "owned",
            "car_ownership": "no",
            "profession": "Civil_engineer",
            "city": "Lucknow",
            "state": "Uttar_Pradesh",
            "current_job_yrs": 7,
            "current_house_yrs": 13,
        },
    },
    {
        "id": "OPP-007",
        "label": "Borrower G",
        "purpose": "Small Business Startup",
        "requestedAmount": 10000,
        "fundedAmount": 2000,
        "remainingAmount": 8000,
        "minTicket": 300,
        "annualRate": 0.20,
        "termMonths": 30,
        "defaultProbability": 0.15,
        "recoveryRate": 0.20,
        "probabilitySource": "demo_fallback",
        "fundingStatus": "open",
        "createdAt": "2026-09-18T00:00:00Z",
        "dataQuality": "good",
        "applicantProfile": {
            "isSynthetic": True,
            "income": 500000,
            "age": 28,
            "experience": 4,
            "married": "single",
            "house_ownership": "rented",
            "car_ownership": "no",
            "profession": "Graphic_Designer",
            "city": "Jaipur",
            "state": "Rajasthan",
            "current_job_yrs": 3,
            "current_house_yrs": 10,
        },
    },
    {
        "id": "OPP-008",
        "label": "Borrower H",
        "purpose": "Emergency Working Capital",
        "requestedAmount": 3000,
        "fundedAmount": 0,
        "remainingAmount": 3000,
        "minTicket": 50,
        "annualRate": 0.18,
        "termMonths": 6,
        "defaultProbability": 0.13,
        "recoveryRate": 0.15,
        "probabilitySource": "demo_fallback",
        "fundingStatus": "open",
        "createdAt": "2026-09-20T00:00:00Z",
        "dataQuality": "good",
        "applicantProfile": {
            "isSynthetic": True,
            "income": 360000,
            "age": 26,
            "experience": 3,
            "married": "single",
            "house_ownership": "rented",
            "car_ownership": "no",
            "profession": "Technician",
            "city": "Bhopal",
            "state": "Madhya_Pradesh",
            "current_job_yrs": 2,
            "current_house_yrs": 10,
        },
    },
    {
        "id": "OPP-009",
        "label": "Borrower I",
        "purpose": "Solar Panel Installation",
        "requestedAmount": 14000,
        "fundedAmount": 9000,
        "remainingAmount": 5000,
        "minTicket": 400,
        "annualRate": 0.10,
        "termMonths": 36,
        "defaultProbability": 0.04,
        "recoveryRate": 0.45,
        "probabilitySource": "demo_fallback",
        "fundingStatus": "open",
        "createdAt": "2026-09-22T00:00:00Z",
        "dataQuality": "good",
        "applicantProfile": {
            "isSynthetic": True,
            "income": 1600000,
            "age": 48,
            "experience": 16,
            "married": "married",
            "house_ownership": "owned",
            "car_ownership": "yes",
            "profession": "Economist",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "current_job_yrs": 9,
            "current_house_yrs": 14,
        },
    },
    {
        "id": "OPP-010",
        "label": "Borrower J",
        "purpose": "Livestock Purchase",
        "requestedAmount": 7000,
        "fundedAmount": 2500,
        "remainingAmount": 4500,
        "minTicket": 150,
        "annualRate": 0.12,
        "termMonths": 18,
        "defaultProbability": 0.07,
        "recoveryRate": 0.35,
        "probabilitySource": "demo_fallback",
        "fundingStatus": "open",
        "createdAt": "2026-09-25T00:00:00Z",
        "dataQuality": "good",
        "applicantProfile": {
            "isSynthetic": True,
            "income": 650000,
            "age": 36,
            "experience": 9,
            "married": "married",
            "house_ownership": "rented",
            "car_ownership": "no",
            "profession": "Surveyor",
            "city": "Patna",
            "state": "Bihar",
            "current_job_yrs": 5,
            "current_house_yrs": 11,
        },
    },
    {
        "id": "OPP-011",
        "label": "Borrower K",
        "purpose": "Retail Store Renovation",
        "requestedAmount": 9000,
        "fundedAmount": 9000,
        "remainingAmount": 0,
        "minTicket": 300,
        "annualRate": 0.15,
        "termMonths": 24,
        "defaultProbability": 0.09,
        "recoveryRate": 0.25,
        "probabilitySource": "demo_fallback",
        "fundingStatus": "closed",
        "createdAt": "2026-08-15T00:00:00Z",
        "dataQuality": "good",
        "applicantProfile": {
            "isSynthetic": True,
            "income": 800000,
            "age": 34,
            "experience": 7,
            "married": "married",
            "house_ownership": "owned",
            "car_ownership": "no",
            "profession": "Hotel_Manager",
            "city": "Kochi",
            "state": "Kerala",
            "current_job_yrs": 4,
            "current_house_yrs": 12,
        },
    },
    {
        "id": "OPP-012",
        "label": "Borrower L",
        "purpose": "Equipment Repair",
        "requestedAmount": 4000,
        "fundedAmount": 1000,
        "remainingAmount": 3000,
        "minTicket": 100,
        "annualRate": 0.14,
        "termMonths": 12,
        "defaultProbability": 0.08,
        "recoveryRate": 0.30,
        "probabilitySource": "demo_fallback",
        "fundingStatus": "open",
        "createdAt": "2026-09-28T00:00:00Z",
        "dataQuality": "missing_risk",
        "applicantProfile": None,
    },
]


def calculate_financials(A: float, r: float, t: int, PD: float, R: float) -> Dict[str, float]:
    full_repayment = A * (1.0 + r * t / 12.0)
    default_recovery = A * R
    expected_payout = (1.0 - PD) * full_repayment + PD * default_recovery
    expected_profit = expected_payout - A
    expected_roi = 100.0 * expected_profit / A
    return {
        "fullRepayment": round(full_repayment, 2),
        "defaultRecovery": round(default_recovery, 2),
        "expectedPayout": round(expected_payout, 2),
        "expectedProfit": round(expected_profit, 2),
        "expectedROI": round(expected_roi, 2),
    }


def calculate_capital_fit(budget: float, min_ticket: float, remaining: float) -> float:
    if budget < min_ticket or remaining <= 0:
        return 0.0
    deployable = min(budget, remaining)
    return min(deployable / remaining, 1.0) * 100.0


def calculate_match_score(PD: float, roi: float, fit: float, risk_appetite: float) -> Dict[str, Any]:
    a = max(0.0, min(1.0, risk_appetite / 100.0))
    w_r = 0.65 - 0.40 * a
    w_t = 0.30 + 0.40 * a
    w_f = 0.05
    r_score = (1.0 - PD) * 100.0
    t_score = max(0.0, min(100.0, ((roi + 20.0) / 40.0) * 100.0))
    f_score = fit
    score = w_r * r_score + w_t * t_score + w_f * f_score
    risk_cat = "Low" if PD <= 0.05 else ("Moderate" if PD <= 0.12 else "High")
    return {
        "matchScore": round(score, 2),
        "riskCategory": risk_cat,
        "factorScores": {
            "safetyScore": round(r_score, 1),
            "returnScore": round(t_score, 1),
            "capitalFitScore": round(f_score, 1),
        },
        "factorWeights": {
            "safetyWeight": round(w_r, 4),
            "returnWeight": round(w_t, 4),
            "capitalFitWeight": w_f,
        },
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "LendMatch FastAPI Backend",
        "version": "3.0.0",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.get("/api/model/status")
async def model_status():
    start = time.time()
    if not HF_ENDPOINT or not HF_ENDPOINT.startswith("http"):
        return {
            "status": "not_configured",
            "modelId": MODEL_ID,
            "endpoint": HF_ENDPOINT or "missing",
            "latencyMs": 0,
            "notes": "Model endpoint not configured.",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

    root_url = HF_ENDPOINT.rstrip("/").replace("/api/predict", "/")
    headers = {"User-Agent": "LendMatch-FastAPI/3.0"}
    if HF_API_KEY:
        headers["Authorization"] = f"Bearer {HF_API_KEY}"

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(root_url, headers=headers)
            latency_ms = int((time.time() - start) * 1000)
            if resp.status_code == 200:
                return {
                    "status": "available",
                    "modelId": MODEL_ID,
                    "endpoint": HF_ENDPOINT,
                    "latencyMs": latency_ms,
                    "notes": "Hugging Face Space API is online and responding.",
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }
            if resp.status_code in (400, 422):
                return {
                    "status": "invalid_response",
                    "modelId": MODEL_ID,
                    "endpoint": HF_ENDPOINT,
                    "latencyMs": latency_ms,
                    "notes": f"Model service schema error (HTTP {resp.status_code}).",
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }
            return {
                "status": "unavailable",
                "modelId": MODEL_ID,
                "endpoint": HF_ENDPOINT,
                "latencyMs": latency_ms,
                "notes": f"Endpoint returned HTTP status {resp.status_code}.",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return {
            "status": "unavailable",
            "modelId": MODEL_ID,
            "endpoint": HF_ENDPOINT,
            "latencyMs": latency_ms,
            "notes": f"Failed to connect: {str(e)}",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }


@app.post("/api/predict")
async def predict_single(req: SinglePredictionRequest):
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if not req.applicantProfile:
        return PredictionResult(
            borrowerId=req.borrowerId,
            status="insufficient_input",
            defaultProbability=None,
            isModelBacked=False,
            notes="Applicant profile is missing required features.",
            timestamp=timestamp,
        )

    p = req.applicantProfile
    payload = {
        "income": p.income,
        "age": p.age,
        "experience": p.experience,
        "married": p.married or "single",
        "house_ownership": p.house_ownership or "rented",
        "car_ownership": p.car_ownership or "no",
        "profession": p.profession,
        "city": p.city,
        "state": p.state,
        "current_job_yrs": p.current_job_yrs,
        "current_house_yrs": p.current_house_yrs,
    }

    start = time.time()
    headers = {"Content-Type": "application/json", "User-Agent": "LendMatch-FastAPI/3.0"}
    if HF_API_KEY:
        headers["Authorization"] = f"Bearer {HF_API_KEY}"

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(HF_ENDPOINT, json=payload, headers=headers)
            latency_ms = int((time.time() - start) * 1000)
            if resp.status_code != 200:
                return PredictionResult(
                    borrowerId=req.borrowerId,
                    status="unavailable",
                    defaultProbability=None,
                    isModelBacked=False,
                    notes=f"Upstream returned HTTP {resp.status_code}",
                    timestamp=timestamp,
                    latencyMs=latency_ms,
                )
            data = resp.json()
            res = data.get("results", [{}])[0]
            default_prob = res.get("probabilities", {}).get("Default")
            no_default_prob = res.get("probabilities", {}).get("No Default")
            label = res.get("prediction")

            return PredictionResult(
                borrowerId=req.borrowerId,
                status="model",
                defaultProbability=float(default_prob),
                predictionLabel="Default" if label == "Default" else "No Default",
                probabilities=Probabilities(defaultProb=default_prob, noDefaultProb=no_default_prob),
                isModelBacked=True,
                notes=f"Inference completed in {latency_ms}ms.",
                timestamp=timestamp,
                latencyMs=latency_ms,
            )
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return PredictionResult(
            borrowerId=req.borrowerId,
            status="unavailable",
            defaultProbability=None,
            isModelBacked=False,
            notes=f"Upstream network failure: {str(e)}",
            timestamp=timestamp,
            latencyMs=latency_ms,
        )


@app.post("/api/predict/batch")
async def predict_batch(req: BatchPredictionRequest):
    results = []
    for item in req.items:
        res = await predict_single(item)
        results.append(res)
    return {"results": results, "count": len(results)}


@app.get("/api/opportunities")
def get_opportunities(status: Optional[str] = None, minBudget: Optional[float] = None):
    items = list(SYNTHETIC_OPPORTUNITIES)
    if status:
        items = [x for x in items if x["fundingStatus"] == status]
    if minBudget is not None and not math.isnan(minBudget):
        items = [x for x in items if minBudget >= x["minTicket"]]
    return {
        "success": True,
        "count": len(items),
        "total": len(SYNTHETIC_OPPORTUNITIES),
        "opportunities": items,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.post("/api/match")
async def run_match(req: MatchRequest):
    # 1. Fetch predictions if live model is requested
    status_resp = await model_status()
    predictions: Dict[str, Any] = {}

    if req.useLiveModel and status_resp.get("status") == "available":
        for opp in SYNTHETIC_OPPORTUNITIES:
            if opp.get("applicantProfile"):
                p_in = ApplicantProfileInput(**opp["applicantProfile"])
                pred = await predict_single(SinglePredictionRequest(borrowerId=opp["id"], applicantProfile=p_in))
                predictions[opp["id"]] = pred

    # 2. Build active opportunities
    active = []
    applied_model_count = 0
    for opp in SYNTHETIC_OPPORTUNITIES:
        o = dict(opp)
        pred = predictions.get(o["id"])
        if pred and pred.status == "model" and pred.defaultProbability is not None:
            o["defaultProbability"] = pred.defaultProbability
            o["probabilitySource"] = "model_backed"
            applied_model_count += 1
        elif pred and pred.status == "insufficient_input":
            o["defaultProbability"] = float("nan")
            o["probabilitySource"] = "insufficient_input"
        else:
            o["probabilitySource"] = "demo_fallback" if not req.useLiveModel else "unavailable"
        active.append(o)

    # 3. Filter eligible
    eligible = []
    for o in active:
        if o["fundingStatus"] != "open":
            continue
        if o["remainingAmount"] <= 0:
            continue
        if req.budget < o["minTicket"]:
            continue
        if math.isnan(o["defaultProbability"]):
            continue

        rep_alloc = min(req.budget, o["remainingAmount"])
        fin = calculate_financials(rep_alloc, o["annualRate"], o["termMonths"], o["defaultProbability"], o["recoveryRate"])

        if req.minTargetReturn is not None and fin["expectedROI"] < req.minTargetReturn:
            continue

        fit = calculate_capital_fit(req.budget, o["minTicket"], o["remainingAmount"])
        scoring = calculate_match_score(o["defaultProbability"], fin["expectedROI"], fit, req.riskAppetite)

        o_scored = dict(o)
        o_scored["financials"] = fin
        o_scored["scoredCapitalFit"] = fit
        o_scored.update(scoring)
        eligible.append(o_scored)

    # 4. Rank by matchScore descending (stable sort)
    ranked = sorted(eligible, key=lambda x: x["matchScore"], reverse=True)

    # 5. Greedy allocation (Top 5 max)
    recommendations = []
    budget_remaining = req.budget
    for cand in ranked[:5]:
        if budget_remaining < cand["minTicket"]:
            continue
        alloc = min(budget_remaining, cand["remainingAmount"])
        if alloc < cand["minTicket"]:
            continue
        # Recalculate financials with actual allocation
        actual_fin = calculate_financials(alloc, cand["annualRate"], cand["termMonths"], cand["defaultProbability"], cand["recoveryRate"])
        rec = dict(cand)
        rec["proposedAllocation"] = alloc
        rec["financials"] = actual_fin
        recommendations.append(rec)
        budget_remaining -= alloc
        if budget_remaining <= 0:
            break

    total_allocated = round(req.budget - budget_remaining, 2)
    unallocated = round(budget_remaining, 2)

    plan = {
        "recommendations": recommendations,
        "totalAllocated": total_allocated,
        "unallocated": unallocated,
        "budget": req.budget,
    }

    return {
        "success": True,
        "plan": plan,
        "eligibleCount": len(eligible),
        "totalOpportunities": len(SYNTHETIC_OPPORTUNITIES),
        "modelStatus": status_resp,
        "appliedModelCount": applied_model_count,
        "minTargetReturn": req.minTargetReturn,
        "audit": {
            "budget": req.budget,
            "riskAppetite": req.riskAppetite,
            "minTargetReturn": req.minTargetReturn,
            "useLiveModel": req.useLiveModel,
            "budgetConserved": abs((total_allocated + unallocated) - req.budget) < 0.01,
            "zeroOverruns": total_allocated <= req.budget,
            "totalAllocated": total_allocated,
            "unallocated": unallocated,
        },
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
