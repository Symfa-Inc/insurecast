# Insurecast

Time-series models applied to insurance data

## Project Structure

```
insurecast/
├── backend/          # FastAPI backend (Python)
│   ├── src/          # Source code
│   ├── data/         # Data files
│   ├── models/       # ML models
│   ├── notebooks/    # Jupyter notebooks
│   └── scripts/      # Utility scripts
├── frontend/         # Next.js frontend (TypeScript)
│   ├── src/app/      # App router pages
│   └── public/       # Static assets
└── pyproject.toml    # UV workspace config
```

## Quick Start

### Backend

```bash
# Install dependencies
uv sync --dev

# Generate/refresh demo artifacts from OSHA public data
uv run python backend/scripts/ingest_osha_sir.py

# Run development server
uv run uvicorn insurecast.main:app --reload
```

The backend reads `backend/data/demo/monthly_claims.csv` and
`backend/data/demo/severity_params.csv` as the historical source for dashboard
APIs.

### Frontend

```bash
cd frontend

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

## Development

```bash
# Install pre-commit hooks
uv run pre-commit install

# Run pre-commit on all files
uv run pre-commit run --all-files
```
