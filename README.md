<div align="center">

<img src=".assets/logo.png" width="150" alt="InsureCast Logo">

# InsureCast

Time-series forecasting dashboard for monthly claims and paid amounts using SARIMAX models on OSHA severe-injury report data.

**[Live Demo](https://insurecast.symfa.ai)** · **[GitHub](https://github.com/Symfa-Inc/insurecast)** · **[Confluence](https://symfa.atlassian.net/wiki/spaces/SYMFA/pages/5012029451)**

</div>

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

# Frontend (in a separate terminal)
cd frontend
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) (frontend) and [http://localhost:8000/docs](http://localhost:8000/docs) (API docs).

## License

[MIT](LICENSE)
