from datetime import date
from pathlib import Path
from statistics import mean
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from insurecast.chart_display_guard import series_rows_have_plottable_chart_data
from insurecast.data_repository import (
    DemoDataRepository,
    SegmentKey,
    claims_ci,
    iter_months,
    paid_ci,
    parse_month,
)
from insurecast.llm_summary import build_llm_context, summarize_forecast_dashboard

# Load backend/.env so OPENAI_API_KEY works without manual `export` (uvicorn does not read .env).
_backend_root = Path(__file__).resolve().parents[2]
load_dotenv(_backend_root / ".env")
load_dotenv()  # optional: .env in CWD when starting the server

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


class ForecastSummaryLLMRequest(BaseModel):
    """Same selectors as chart series; body is used for `POST /ai/forecast-summary`."""

    from_: str = Field(alias="from")
    to: str
    state: str
    industry: str
    claim_type: str

    model_config = {"populate_by_name": True}


class ForecastSummaryLLMResponse(BaseModel):
    """LLM narrative, deterministic fallback, or no_data when charts have nothing to plot."""

    narrative: str
    source: Literal["openai", "fallback", "no_data"]
    llm_model: str | None = None
    notice: str | None = None
    segment_label: str
    chart_from: str
    chart_to: str
    insurance_forecast_model: str
    train_window: str
    actual_data_end: str


class ForecastSummaryResponse(BaseModel):
    """Narrative + stats for the claims forecast in the selected chart window (OpenAPI schema)."""

    headline: str
    bullets: list[str]
    segment_label: str
    chart_from: str
    chart_to: str
    model_name: str
    train_window: str
    actual_data_end: str
    api_forecast_end: str
    historical_months_in_chart: int
    forecast_months_in_chart: int
    last_actual_month: str | None = None
    last_actual_claims: float | None = None
    mean_monthly_forecast_claims: float | None = None


def build_claims_row(month: date, segment: SegmentKey) -> dict[str, Any]:
    actual = repo.actual_claims(month, segment)
    forecast, ci_low, ci_high = repo.forecast_claims_with_interval(month, segment)
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


@app.get(
    "/series/forecast-summary",
    response_model=ForecastSummaryResponse,
    summary="Forecast summary for charts",
    description=(
        "Returns a short narrative and counts for the selected segment and date range. "
        "Use the same query parameters as `/series/claims` so the summary matches the charts."
    ),
)
async def get_forecast_summary(
    from_: str = Query(..., alias="from"),
    to: str = Query(...),
    state: str = Query(...),
    industry: str = Query(...),
    claim_type: str = Query(...),
) -> ForecastSummaryResponse:
    segment = SegmentKey(state=state, industry=industry, claim_type=claim_type)
    start = parse_month(from_)
    end = min(parse_month(to), repo.forecast_end)

    train_window = (
        f"{repo.actual_start.strftime('%Y-%m')}..{repo.actual_end.strftime('%Y-%m')}"
    )
    model_name = "SARIMAX"
    segment_label = f"{state} · {industry} · {claim_type}"

    hist_count = 0
    fc_count = 0
    fc_values: list[float] = []
    last_act_month: date | None = None
    last_act_val: float | None = None

    for month in iter_months(start, end):
        act = repo.actual_claims(month, segment)
        if act is not None:
            hist_count += 1
            last_act_month = month
            last_act_val = float(act)
        else:
            fc_count += 1
            fc_values.append(repo.forecast_claims(month, segment))

    mean_fc = round(mean(fc_values), 2) if fc_values else None

    headline = f"Forecast summary — {segment_label}"

    bullets = [
        (
            f"{model_name} is fit on monthly claim counts from the demo OSHA-based series "
            f"({train_window})."
        ),
        (
            f"Selected chart window {from_} → {to}: {hist_count} month(s) with observed claims "
            f"and {fc_count} forecast-only month(s). The API can project through "
            f"{repo.forecast_end.strftime('%Y-%m')}."
        ),
    ]
    if last_act_month is not None and last_act_val is not None:
        bullets.append(
            f"Latest observed month in this window: {last_act_month.strftime('%Y-%m')} "
            f"at {last_act_val:g} claims.",
        )
    if mean_fc is not None:
        bullets.append(
            f"Mean projected monthly claims over forecast-only months in this window: {mean_fc:g}.",
        )
    if fc_count == 0:
        bullets.append(
            "No forecast-only months fall in this range; extend the end date or forecast period "
            "to see projected counts.",
        )

    return ForecastSummaryResponse(
        headline=headline,
        bullets=bullets,
        segment_label=segment_label,
        chart_from=from_,
        chart_to=to,
        model_name=model_name,
        train_window=train_window,
        actual_data_end=repo.actual_end.strftime("%Y-%m"),
        api_forecast_end=repo.forecast_end.strftime("%Y-%m"),
        historical_months_in_chart=hist_count,
        forecast_months_in_chart=fc_count,
        last_actual_month=last_act_month.strftime("%Y-%m") if last_act_month else None,
        last_actual_claims=last_act_val,
        mean_monthly_forecast_claims=mean_fc,
    )


@app.post(
    "/ai/forecast-summary",
    response_model=ForecastSummaryLLMResponse,
    summary="LLM forecast narrative (OpenAI)",
    description=(
        "Builds the same monthly claims/cost rows as the dashboard charts, merges them into "
        "one table-shaped JSON, and asks OpenAI to write a short executive summary. "
        "If the selected range has no plottable chart data, returns `source=no_data` without "
        "calling OpenAI. Otherwise requires `OPENAI_API_KEY` for `source=openai`; missing key "
        "or API errors yield `source=fallback`."
    ),
)
async def post_forecast_summary_llm(
    body: ForecastSummaryLLMRequest,
) -> ForecastSummaryLLMResponse:
    segment = SegmentKey(
        state=body.state,
        industry=body.industry,
        claim_type=body.claim_type,
    )
    start = parse_month(body.from_)
    end = min(parse_month(body.to), repo.forecast_end)
    claims_rows = [
        build_claims_row(month, segment) for month in iter_months(start, end)
    ]
    cost_rows = [build_cost_row(month, segment) for month in iter_months(start, end)]

    segment_label = f"{body.state} · {body.industry} · {body.claim_type}"
    train_window = (
        f"{repo.actual_start.strftime('%Y-%m')}..{repo.actual_end.strftime('%Y-%m')}"
    )
    insurance_model = "SARIMAX (1,1,1)×(1,1,1,12)"
    actual_end_s = repo.actual_end.strftime("%Y-%m")

    if not series_rows_have_plottable_chart_data(claims_rows, cost_rows):
        return ForecastSummaryLLMResponse(
            narrative=(
                "There is no data to show for the charts with this selection. "
                "Try another state, industry, claim type, or date range."
            ),
            source="no_data",
            llm_model=None,
            notice=None,
            segment_label=segment_label,
            chart_from=body.from_,
            chart_to=body.to,
            insurance_forecast_model=insurance_model,
            train_window=train_window,
            actual_data_end=actual_end_s,
        )

    ctx = build_llm_context(
        claims_rows=claims_rows,
        cost_rows=cost_rows,
        segment_label=segment_label,
        chart_from=body.from_,
        chart_to=body.to,
        forecast_model_name=insurance_model,
        train_window=train_window,
        actual_data_end=actual_end_s,
    )
    narrative, llm_model, source, notice = await summarize_forecast_dashboard(ctx)

    return ForecastSummaryLLMResponse(
        narrative=narrative,
        source=source,
        llm_model=llm_model,
        notice=notice,
        segment_label=segment_label,
        chart_from=body.from_,
        chart_to=body.to,
        insurance_forecast_model=insurance_model,
        train_window=train_window,
        actual_data_end=actual_end_s,
    )


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
        "actual_start": repo.actual_start.strftime("%Y-%m"),
        "actual_end": repo.actual_end.strftime("%Y-%m"),
        "forecast_end": repo.forecast_end.strftime("%Y-%m"),
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
