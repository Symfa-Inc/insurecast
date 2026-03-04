# Insurecast - Backend

Time-series models applied to insurance data

## Setup

```bash
# From project root
uv sync --dev
```

## Run

```bash
uv run uvicorn insurecast.main:app --reload
```

## Test

```bash
uv run pytest
```

## Public Data Ingestion (OSHA)

Generate demo artifacts from OSHA Severe Injury Reports and normalize to the
dashboard schema:

```bash
uv run python scripts/ingest_osha_sir.py
```

Output files:
- `backend/data/demo/monthly_claims.csv`
- `backend/data/demo/severity_params.csv`

The API in `insurecast.main` reads these CSV artifacts directly at startup and
uses them as the historical source for claims/cost forecasting endpoints.
