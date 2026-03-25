# 🐍 Insurecast Backend

FastAPI backend for the **Insurecast** forecasting dashboard: monthly **claims** and **paid / average cost** series by segment, **SARIMAX**-style forecasts via statsmodels, optional **OpenAI** narrative summaries, and **scenario** recalculation (severity / frequency shocks).

Claim counts beyond the last observed month use **SARIMAX** `(1,1,1)×(1,1,1,12)` when fitting succeeds, with **ARIMA(1,1,1)** or **seasonal naive** fallbacks. Forecast-month intervals use the model’s **95% prediction interval** when available.

## 📁 Structure

```
backend/
├── Dockerfile              # Container configuration
├── src/insurecast/         # Python package (API & forecasting)
│   ├── main.py             # FastAPI application & routes
│   ├── data_repository.py  # Demo CSV loading & segment metadata
│   ├── sarimax_forecast.py # SARIMAX / fallback forecasting
│   ├── llm_summary.py      # OpenAI + deterministic summary helpers
│   ├── chart_display_guard.py
│   └── ingest_osha.py      # OSHA-oriented ingest utilities
├── data/demo/              # CSV inputs (merged file required at runtime)
├── models/                 # Optional model artifacts
├── notebooks/              # Jupyter notebooks
├── scripts/                # Ingest, merge, synthetic fill
└── pyproject.toml          # Package dependencies (project name: insurecast)
```

## 🚀 Quick Start

```bash
# From repository root
uv sync --dev

# Run the API (from this backend/ directory)
cd backend
uv run uvicorn insurecast.main:app --reload --port 8000
```

- API: http://localhost:8000
- Docs: http://localhost:8000/docs

Copy **`.env.example`** to **`.env`** and set **`OPENAI_API_KEY`** if you want **`source=openai`** on **`POST /ai/forecast-summary`**; otherwise the API still returns **`200`** with a deterministic narrative and **`source=fallback`** when the key is missing or the model call fails.

## 🐳 Docker

```bash
# From backend/ directory
docker build -t insurecast-backend .
docker run -p 8000:8000 insurecast-backend
```

## 📊 Data pipeline (OSHA demo)

Generate demo artifacts from **OSHA Severe Injury Reports** and normalize to the dashboard schema:

```bash
# From backend/
uv run python scripts/ingest_osha_sir.py
```

Outputs (under **`data/demo/`**):

- `monthly_claims.csv`
- `severity_params.csv`

Build the **merged** table the API loads at startup:

```bash
uv run python scripts/merge_claims_and_severity.py
```

Produces **`data/demo/merged_claims_with_severity.csv`** — the single source for claims counts and baseline average cost per segment.

Optional: fill missing `(month, segment)` rows with synthetic data (e.g. Jan 2015–Dec 2025) so every segment has complete coverage:

```bash
uv run python scripts/fill_missing_with_synthetic.py
```

Synthetic claim counts are sampled from the same distribution as observed data per segment (state, industry, claim type).

## 📦 Package management

```bash
# From repository root (uv workspace) or backend/

# Add a dependency
uv add <package> --package insurecast

# Add a dev dependency
uv add <package> --package insurecast --dev

# Remove a dependency
uv remove <package> --package insurecast
```

## 🧪 Development

```bash
# From backend/

# Run tests
uv run pytest

# Type checking
uv run mypy src/

# Linting & formatting
uv run ruff check src/
uv run ruff format src/
```

## 🔌 API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/segments` | Lists available `states`, `industries`, `claim_types` |
| GET | `/series/claims` | Monthly claims actuals + forecast & CIs (`from`, `to`, segment query params) |
| GET | `/series/costs` | Monthly paid / avg cost + forecast & CIs (same query shape as claims) |
| GET | `/model/metadata` | Model / training window metadata for the dashboard |
| POST | `/ai/forecast-summary` | Merged claims + cost narrative; OpenAI when configured, else fallback |
| POST | `/scenario/recalculate` | Recalculate forecast claims, CIs, paid totals, and avg cost under scenario shocks |

Query/body shapes match the **OpenAPI** schema at **`/docs`**.
