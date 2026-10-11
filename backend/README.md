# LendMatch — Python FastAPI Backend Service

This directory provides the standalone Python FastAPI backend implementing the exact same prediction contract as the Next.js server-side API routes.

## Endpoints
- `GET /health` — Service liveness
- `GET /api/model/status` — Model service connectivity and latency
- `POST /api/predict` — Single applicant prediction with strict Pydantic validation
- `POST /api/predict/batch` — Batch inference for borrower opportunities

## Running with Python (optional standalone deployment)
```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Note: In the full-stack Next.js project, the same API routes (`/api/health`, `/api/model/status`, `/api/predict`, `/api/predict/batch`) are already natively executed by Next.js Server on Node.js without requiring a separate Python runtime.
