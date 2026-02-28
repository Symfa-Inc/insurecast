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

# Run development server
uv run uvicorn insurecast.main:app --reload
```

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
