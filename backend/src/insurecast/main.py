from datetime import date
from typing import Any

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from insurecast.data_repository import (
    DemoDataRepository,
    SegmentKey,
    claims_ci,
    iter_months,
    paid_ci,
    parse_month,
)

app = FastAPI(
    title="Insurecast",
    description="Time-series models applied to insurance data",
    version="0.1.0",
)
repo = DemoDataRepository()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScenarioRequest(BaseModel):
    state: str
    industry: str
    claim_type: str
    severity_inflation_pct: float = Field(default=0.0, ge=-100)
    frequency_shock_pct: float = Field(default=0.0, ge=-100)
    from_: str = Field(alias="from")
    to: str

    model_config = {"populate_by_name": True}


def build_claims_row(month: date, segment: SegmentKey) -> dict[str, Any]:
    actual = repo.actual_claims(month, segment)
    forecast = repo.forecast_claims(month, segment)
    ci_low, ci_high = claims_ci(forecast)
    return {
        "month": month.strftime("%Y-%m"),
        "state": segment.state,
        "industry": segment.industry,
        "claim_type": segment.claim_type,
        "claims_count_actual": actual,
        "claims_count_forecast": forecast,
        "claims_ci_low": ci_low,
        "claims_ci_high": ci_high,
    }


def build_cost_row(month: date, segment: SegmentKey) -> dict[str, Any]:
    severity = repo.avg_severity(month, segment)
    actual_claims = repo.actual_claims(month, segment)
    forecast_claims = repo.forecast_claims(month, segment)
    paid_actual = (
        round(actual_claims * severity, 2) if actual_claims is not None else None
    )
    paid_forecast = round(forecast_claims * severity, 2)
    ci_low, ci_high = paid_ci(paid_forecast)
    return {
        "month": month.strftime("%Y-%m"),
        "state": segment.state,
        "industry": segment.industry,
        "claim_type": segment.claim_type,
        "paid_amount_actual": paid_actual,
        "paid_amount_forecast": paid_forecast,
        "paid_ci_low": ci_low,
        "paid_ci_high": ci_high,
        "avg_cost_per_claim": severity,
    }


@app.get("/segments")
async def get_segments() -> dict[str, list[str]]:
    return repo.get_segments()


@app.get("/series/claims")
async def get_claims_series(
    from_: str = Query(..., alias="from"),
    to: str = Query(...),
    state: str = Query(...),
    industry: str = Query(...),
    claim_type: str = Query(...),
) -> dict[str, list[dict[str, Any]]]:
    segment = SegmentKey(state=state, industry=industry, claim_type=claim_type)
    start = parse_month(from_)
    end = min(parse_month(to), repo.forecast_end)
    series = [build_claims_row(month, segment) for month in iter_months(start, end)]
    return {"series": series}


@app.get("/series/costs")
async def get_costs_series(
    from_: str = Query(..., alias="from"),
    to: str = Query(...),
    state: str = Query(...),
    industry: str = Query(...),
    claim_type: str = Query(...),
) -> dict[str, list[dict[str, Any]]]:
    segment = SegmentKey(state=state, industry=industry, claim_type=claim_type)
    start = parse_month(from_)
    end = min(parse_month(to), repo.forecast_end)
    series = [build_cost_row(month, segment) for month in iter_months(start, end)]
    return {"series": series}


@app.get("/model/metadata")
async def get_model_metadata() -> dict[str, Any]:
    return {
        "run_id": "demo-sarimax-001",
        "trained_at": "2026-03-04",
        "train_window": (
            f"{repo.actual_start.strftime('%Y-%m')}..{repo.actual_end.strftime('%Y-%m')}"
        ),
        "forecast_horizon": 12,
        "model_name": "SARIMAX",
        "model_params": {"order": [1, 1, 1], "seasonal_order": [1, 1, 1, 12]},
        "mae": 8.4,
        "rmse": 10.7,
        "mape": 6.2,
        "assumptions_json": {
            "severity_distribution": "lognormal",
            "public_frequency_source": "OSHA Severe Injury Reports (ingested CSV)",
            "cost_layer": "synthetic",
        },
    }


@app.post("/scenario/recalculate")
async def recalculate_scenario(
    payload: ScenarioRequest,
) -> dict[str, list[dict[str, Any]]]:
    segment = SegmentKey(
        state=payload.state,
        industry=payload.industry,
        claim_type=payload.claim_type,
    )
    start = parse_month(payload.from_)
    end = min(parse_month(payload.to), repo.forecast_end)

    frequency_multiplier = 1 + payload.frequency_shock_pct / 100
    severity_multiplier = 1 + payload.severity_inflation_pct / 100
    series: list[dict[str, Any]] = []

    for month in iter_months(start, end):
        base_forecast = repo.forecast_claims(month, segment)
        scenario_forecast = round(base_forecast * frequency_multiplier, 2)
        ci_low, ci_high = claims_ci(scenario_forecast)
        severity = round(repo.avg_severity(month, segment) * severity_multiplier, 2)
        paid_forecast = round(scenario_forecast * severity, 2)
        paid_low, paid_high = paid_ci(paid_forecast)
        series.append(
            {
                "month": month.strftime("%Y-%m"),
                "state": segment.state,
                "industry": segment.industry,
                "claim_type": segment.claim_type,
                "claims_count_forecast": scenario_forecast,
                "claims_ci_low": ci_low,
                "claims_ci_high": ci_high,
                "paid_amount_forecast": paid_forecast,
                "paid_ci_low": paid_low,
                "paid_ci_high": paid_high,
                "avg_cost_per_claim": severity,
            },
        )

    return {"series": series}
