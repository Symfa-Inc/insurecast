<div align="center">

<img src=".assets/logo.png" width="150" alt="InsureCast Logo">

# InsureCast

[![Python 3.13](https://img.shields.io/badge/Python-3.13-blue.svg)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![statsmodels](https://img.shields.io/badge/statsmodels-0.14-F7931E.svg)](https://www.statsmodels.org/)
[![Recharts](https://img.shields.io/badge/Recharts-3-8884d8.svg)](https://recharts.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

**Time-series forecasting dashboard for monthly claims and paid amounts by segment.**

🔗 **Live Demo**: [insurecast.symfa.ai](https://insurecast.symfa.ai)

💻 **GitHub**: [Symfa-Inc/insurecast](https://github.com/Symfa-Inc/insurecast)

📘 **Confluence**: [Project Description](https://symfa.atlassian.net/wiki/)

</div>

## Overview

InsureCast is a demo stack that applies **SARIMAX**-style seasonal models to OSHA-derived severe-injury report data, exposed through a **FastAPI** backend and a **Next.js** dashboard. You can explore historical claim counts and average cost per claim, extend the horizon with configurable forecast months, run **what-if scenarios** (severity inflation and frequency shock), and optionally generate an **LLM narrative** of the current view.

### Key Features

- **Claims & cost charts** – Historical actuals plus forecast with confidence-style bands (Recharts)
- **Segment filters** – State, industry, claim type, chart window, and forecast horizon
- **Scenario recalculation** – Adjust severity and frequency for forecast months; charts and table refresh from `POST /scenario/recalculate`
- **Monthly table** – Aligned rows for claims, paid amount, and average cost (forecast rows highlighted)
- **AI summary** – `POST /ai/forecast-summary` merges the same series as the UI and calls OpenAI when `OPENAI_API_KEY` is set (deterministic fallback otherwise)
- **Demo data pipeline** – Scripts to ingest OSHA SIR data, merge severity, and optionally fill gaps with synthetic rows

### Target Audience

Product and engineering teams evaluating **forecasting UX** for insurance or safety metrics, and anyone who wants a **full-stack reference** (FastAPI + Next.js + time-series) with a clear local and Docker path.

### Preview

<p align="center">
  <em>Dashboard: parameters card, AI summary, dual forecast charts (claims & average cost per claim), scenario sliders, and a collapsible monthly values table.</em>
</p>

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Backend** | Python 3.13, FastAPI, Uvicorn |
| **Frontend** | TypeScript, Next.js, React, Tailwind CSS |
| **AI / forecasting** | statsmodels (SARIMAX), OpenAI (optional narrative) |
| **Charts & HTTP** | Recharts, Axios |
| **Data** | pandas, NumPy, CSV demo artifacts |
| **Validation** | Pydantic |
| **Package management** | uv (backend), pnpm (frontend) |
| **Deployment** | Docker (backend + frontend) |

## Dataset

The default dashboard reads **`backend/data/demo/merged_claims_with_severity.csv`**, built from OSHA Severe Injury Reports (SIR)–style monthly aggregates plus synthetic fill where configured. Typical columns in the merged file:

### Segment & time

| Column | Description |
|--------|-------------|
| `month` | Calendar month (`YYYY-MM`) |
| `state` | U.S. state code for the segment |
| `industry` | Industry bucket |
| `claim_type` | Claim type (e.g. lost time vs medical only) |

### Metrics

| Column | Description |
|--------|-------------|
| `claims_count_actual` | Observed monthly claim count (historical months) |
| `base_avg_cost` | Baseline average cost per claim used for paid / severity modeling in the demo |

Intermediate artifacts (from ingestion scripts) include **`monthly_claims.csv`** and **`severity_params.csv`**; see **Backend README** for merge and synthetic-fill steps.

## Project Structure

```
insurecast/
├── backend/                        # Python backend (FastAPI)
│   ├── Dockerfile                  # Backend container
│   ├── src/insurecast/             # Application code (API, data repo, SARIMAX helpers)
│   ├── data/demo/                  # CSV inputs for the demo repository
│   ├── models/                     # Optional model artifacts
│   ├── notebooks/                  # Jupyter notebooks
│   ├── scripts/                    # Ingest, merge, synthetic fill
│   └── pyproject.toml              # Backend dependencies
│
├── frontend/                       # Next.js frontend
│   ├── Dockerfile                  # Production multi-stage build
│   ├── docker-entrypoint.sh        # Injects API_URL at container start
│   └── src/app/                    # App Router UI (dashboard, charts, table)
│
├── .github/workflows/              # CI/CD workflows
├── insurecast-portainer-stack.txt  # Portainer deployment stack
├── pyproject.toml                  # uv workspace (members: backend)
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.13+
- Node.js 24+
- [uv](https://github.com/astral-sh/uv) (backend)
- [pnpm](https://pnpm.io/) (frontend)

### Installation

```bash
# Clone the repository
git clone https://github.com/Symfa-Inc/insurecast.git
cd insurecast

# Backend dependencies (from repo root)
uv sync --dev

# Frontend dependencies
cd frontend
pnpm install
cd ..
```

### Data setup (optional but typical)

From the **repository root**:

```bash
# Generate or refresh demo CSVs from OSHA public data (see backend/scripts)
uv run python backend/scripts/ingest_osha_sir.py

# Build merged file used by the API (from backend/)
cd backend
uv run python scripts/merge_claims_and_severity.py
cd ..
```

Copy **`backend/.env.example`** to **`backend/.env`** and set **`OPENAI_API_KEY`** if you want OpenAI-backed summaries (otherwise the API still returns a fallback narrative).

### Running locally

**Backend** (from `backend/` so data paths and imports align with the packaged app):

```bash
cd backend
uv run uvicorn insurecast.main:app --port 8000 --reload
```

**Frontend** (expects API at `http://localhost:8000` — see `frontend/src/app/utils/api.ts`):

```bash
cd frontend
pnpm dev
```

- API: `http://localhost:8000`
- UI: `http://localhost:3000`

### Running with Docker

**Backend** (build context: `backend/`):

```bash
cd backend
docker build -t insurecast-backend .
docker run -p 8000:8000 insurecast-backend
```

**Frontend** (build context: `frontend/`):

```bash
cd frontend
docker build -t insurecast-frontend .
docker run -p 3000:3000 -e API_URL=http://host.docker.internal:8000 insurecast-frontend
```

On Linux, point **`API_URL`** at the host IP or service name that reaches the backend (not `localhost` from inside the container unless using host networking).

### Deployment

- Frontend domain: `https://insurecast.symfa.ai`
- Backend domain: `https://api-insurecast.symfa.ai`
- GAR repository: `insurecast`
- Published images: `europe-west3-docker.pkg.dev/symfa-1669197925914/insurecast/{backend,frontend}`
- Portainer stack: `insurecast-portainer-stack.txt`

The frontend Docker image uses runtime API URL injection via `frontend/docker-entrypoint.sh`, so the same built image can be deployed against different backend domains by setting `API_URL` when the container starts.

### Development tooling

```bash
# Pre-commit (from repo root, after uv sync --dev)
uv run pre-commit install
uv run pre-commit run --all-files
```

**Tests** (when present):

```bash
cd backend
uv run pytest
```

## References

- [OSHA Severe Injury Reports](https://www.osha.gov/severeinjury) (public data source for ingestion scripts)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Next.js](https://nextjs.org/)
- [statsmodels SARIMAX](https://www.statsmodels.org/stable/generated/statsmodels.tsa.statespace.sarimax.SARIMAX.html)
