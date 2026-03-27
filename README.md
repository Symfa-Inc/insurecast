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

Time-series forecasting dashboard for monthly claims and paid amounts using SARIMAX models on OSHA severe-injury report data.

**[Live Demo](https://insurecast.symfa.ai)** · **[GitHub](https://github.com/Symfa-Inc/insurecast)** · **[Confluence](https://symfa.atlassian.net/wiki/x/NgBFMQE)**

</div>

## Features

- **Claims & Cost Forecasting** – Monthly charts with confidence bands powered by SARIMAX seasonal models
- **Segment Filtering** – Filter by state, industry, claim type, date window, and forecast horizon
- **Scenario Analysis** – What-if recalculation with severity inflation and frequency shock adjustments
- **Monthly Data Table** – Tabular view aligned with forecast charts
- **AI Summary** – Natural language forecast interpretation via OpenAI (deterministic fallback if unavailable)
- **Data Pipeline** – OSHA Severe Injury Report ingestion, merge, and synthetic gap filling

## How It Works

The application applies SARIMAX (1,1,1)x(1,1,1,12) seasonal time-series models to OSHA-derived severe-injury report data. Users select segments (state, industry, claim type) and a forecast horizon, and the system generates point forecasts with 95% prediction intervals. A scenario panel allows adjusting severity inflation and frequency shocks to model what-if situations. If SARIMAX fails due to short or noisy series, the system falls back to ARIMA or seasonal naive methods.

## Tech Stack

| Category | Technologies |
|----------|-------------|
| Backend | Python 3.13, FastAPI, Uvicorn |
| Frontend | TypeScript, Next.js, React, Tailwind CSS |
| AI/ML | SARIMAX, OpenAI |
| Data | pandas, NumPy, statsmodels |
| Charts | Recharts |
| Package Management | uv (backend), pnpm (frontend) |
| Deployment | Docker, GitHub Actions, Google Artifact Registry |

## Getting Started

### Prerequisites

- Python 3.13+ / [uv](https://docs.astral.sh/uv/)
- Node.js 24+ / [pnpm](https://pnpm.io/)

### Installation & Running

```bash
# Backend
cd backend
cp .env.example .env          # Add your OpenAI API key
uv sync
uv run uvicorn insurecast.main:app --reload

# Frontend
cd frontend
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) (frontend) and [http://localhost:8000/docs](http://localhost:8000/docs) (API docs).

## License

[MIT](LICENSE)
