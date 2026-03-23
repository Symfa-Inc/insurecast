# Insurecast - Backend

Time-series models applied to insurance data.

Claim-count forecasts beyond the last observed month use **SARIMAX** `(1,1,1)×(1,1,1,12)` via statsmodels, with ARIMA(1,1,1) or seasonal naive fallbacks if fitting fails. Intervals for forecast months use the model’s 95% prediction interval when available.

### OpenAI dashboard summary

`POST /ai/forecast-summary` merges the same monthly claims and cost rows as the charts, sends them to **OpenAI** (`OPENAI_API_KEY`), and returns a short narrative. If the key is missing or the API fails, the endpoint still returns `200` with a deterministic summary and `source=fallback`. See `.env.example`.

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

To create the merged table used by the API:

```bash
uv run python scripts/merge_claims_and_severity.py
```

This produces `backend/data/demo/merged_claims_with_severity.csv`, which the API
reads at startup as the single source for claims and average cost per claim.

To fill missing (month, segment) rows with synthetic data for Jan 2015–Dec 2025,
so every segment has complete coverage:

```bash
uv run python scripts/fill_missing_with_synthetic.py
```

Synthetic claim counts are sampled from the same distribution as observed data
per segment (state, industry, claim type).
