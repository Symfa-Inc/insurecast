"""Build dashboard context and optional OpenAI narrative for forecast summaries."""

from __future__ import annotations

import json
import os
import re
from statistics import mean
from typing import Any, Literal

from openai import AsyncOpenAI


def merge_claims_and_costs_rows(
    claims_rows: list[dict[str, Any]],
    cost_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    c_by_m = {r["month"]: r for r in claims_rows}
    co_by_m = {r["month"]: r for r in cost_rows}
    months = sorted(set(c_by_m) | set(co_by_m))
    merged: list[dict[str, Any]] = []
    for m in months:
        cr = c_by_m.get(m, {})
        co = co_by_m.get(m, {})
        act = cr.get("claims_count_actual")
        merged.append(
            {
                "month": m,
                "observed_claims": act,
                "forecast_claims": cr.get("claims_count_forecast"),
                "claims_ci_low": cr.get("claims_ci_low"),
                "claims_ci_high": cr.get("claims_ci_high"),
                "paid_observed_usd": co.get("paid_amount_actual"),
                "paid_forecast_usd": co.get("paid_amount_forecast"),
                "paid_ci_low_usd": co.get("paid_ci_low"),
                "paid_ci_high_usd": co.get("paid_ci_high"),
                "avg_cost_per_claim_usd": co.get("avg_cost_per_claim"),
                "row_type": "historical" if act is not None else "forecast",
            },
        )
    return merged


def build_llm_context(
    *,
    claims_rows: list[dict[str, Any]],
    cost_rows: list[dict[str, Any]],
    segment_label: str,
    chart_from: str,
    chart_to: str,
    forecast_model_name: str,
    train_window: str,
    actual_data_end: str,
) -> dict[str, Any]:
    monthly = merge_claims_and_costs_rows(claims_rows, cost_rows)
    hist = [r for r in monthly if r["row_type"] == "historical"]
    fc = [r for r in monthly if r["row_type"] == "forecast"]
    fc_claims = [
        float(r["forecast_claims"]) for r in fc if r.get("forecast_claims") is not None
    ]
    fc_paid = [
        float(r["paid_forecast_usd"])
        for r in fc
        if r.get("paid_forecast_usd") is not None
    ]

    last_hist = hist[-1] if hist else None

    return {
        "segment": segment_label,
        "insurance_forecast_engine": forecast_model_name,
        "training_data_window": train_window,
        "last_month_with_observed_claims_globally": actual_data_end,
        "chart_date_range": {"from": chart_from, "to": chart_to},
        "monthly_rows": monthly,
        "aggregates": {
            "historical_months_in_chart": len(hist),
            "forecast_months_in_chart": len(fc),
            "mean_forecast_monthly_claims_in_chart": round(mean(fc_claims), 3)
            if fc_claims
            else None,
            "sum_forecast_monthly_claims_in_chart": round(sum(fc_claims), 2)
            if fc_claims
            else None,
            "mean_forecast_monthly_paid_usd_in_chart": round(mean(fc_paid), 2)
            if fc_paid
            else None,
            "sum_forecast_monthly_paid_usd_in_chart": round(sum(fc_paid), 2)
            if fc_paid
            else None,
            "latest_observed_month_in_chart": last_hist["month"] if last_hist else None,
            "latest_observed_claims_in_chart": last_hist.get("observed_claims")
            if last_hist
            else None,
        },
    }


_LLM_EXCLUDED_ROW_KEYS = frozenset(
    {
        "claims_ci_low",
        "claims_ci_high",
        "paid_ci_low_usd",
        "paid_ci_high_usd",
    },
)


def slim_context_for_llm(ctx: dict[str, Any]) -> dict[str, Any]:
    """Drop CIs and model metadata so the LLM cannot echo them in the conclusion."""
    rows = [
        {k: v for k, v in row.items() if k not in _LLM_EXCLUDED_ROW_KEYS}
        for row in ctx["monthly_rows"]
    ]
    return {
        "chart_date_range": ctx["chart_date_range"],
        "aggregates": ctx["aggregates"],
        "monthly_rows": rows,
    }


def scrub_redundant_segment_preamble(text: str) -> str:
    """Remove openings like 'For the segment \"X\",' since the UI already shows the segment."""
    t = text.strip()
    # Quoted segment; comma may be inside the quotes (e.g. "... Indemnity,").
    t = re.sub(
        r'^for\s+the\s+segment\s+"[^"]*"\s*,?\s*',
        "",
        t,
        flags=re.IGNORECASE,
    )
    t = re.sub(
        r"^for\s+the\s+segment\s+'[^']*'\s*,?\s*",
        "",
        t,
        flags=re.IGNORECASE,
    )
    t = re.sub(
        r"^for\s+the\s+segment\s+[^,]+,\s*",
        "",
        t,
        flags=re.IGNORECASE,
    )
    t = re.sub(
        r"^for\s+segment\s+[^,]+,\s*",
        "",
        t,
        flags=re.IGNORECASE,
    )
    return t.strip()


def fallback_narrative(ctx: dict[str, Any]) -> str:
    """One short concluding paragraph when OpenAI is unavailable or errors."""
    agg = ctx["aggregates"]
    dr = ctx["chart_date_range"]
    parts = [
        f"Chart window **{dr['from']}–{dr['to']}**: "
        f"{agg['historical_months_in_chart']} historical and "
        f"{agg['forecast_months_in_chart']} forecast month(s) in view.",
    ]
    if agg.get("latest_observed_month_in_chart") is not None:
        parts.append(
            f" Most recent month with observed counts is **{agg['latest_observed_month_in_chart']}** "
            f"at **{agg['latest_observed_claims_in_chart']}** claims.",
        )
    if agg.get("mean_forecast_monthly_claims_in_chart") is not None:
        parts.append(
            f" Over the forecast window, monthly claims average about "
            f"**{agg['mean_forecast_monthly_claims_in_chart']}**.",
        )
    if agg.get("sum_forecast_monthly_paid_usd_in_chart") is not None:
        parts.append(
            f" Aggregate projected paid (forecast months) is about "
            f"**${agg['sum_forecast_monthly_paid_usd_in_chart']:,.0f}** USD.",
        )
    return "".join(parts).strip()


def _openai_client() -> AsyncOpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        return None
    return AsyncOpenAI(api_key=key)


def _openai_model() -> str:
    return os.environ.get("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"


async def summarize_forecast_dashboard(
    ctx: dict[str, Any],
) -> tuple[str, str | None, Literal["openai", "fallback"], str | None]:
    """
    Returns (narrative_markdown, llm_model_id_or_empty, source, user_notice).

    user_notice is set when falling back (missing key, API error).
    """
    client = _openai_client()
    if client is None:
        return (
            fallback_narrative(ctx),
            None,
            "fallback",
            "OPENAI_API_KEY is not set; showing a deterministic summary instead.",
        )

    model = _openai_model()
    payload = json.dumps(slim_context_for_llm(ctx), indent=2, default=str)
    # Trim pathological payloads (very long ranges)
    if len(payload) > 120_000:
        payload = payload[:120_000] + "\n…(truncated for token limits)"

    system = (
        "You are an insurance analytics assistant. The JSON has monthly observed and forecast "
        "claim counts, paid amounts, and average cost per claim for one segment (no confidence "
        "interval columns are included).\n\n"
        "Write exactly ONE closing paragraph of 2–3 short sentences. Give the chart date "
        "range, the most recent observed month’s claim count if present, and a forward-looking "
        "line using typical projected monthly claims and/or aggregate projected paid amounts—use "
        "point or average figures only. Do NOT name or repeat the segment (state · industry · "
        'claim type); the dashboard already shows it. Do NOT begin with "For the segment" or '
        "similar.\n\n"
        "Do NOT mention or imply: confidence intervals, uncertainty bands, low/high ranges, "
        'or statistical dispersion. Do NOT describe a "transition from historical to '
        'forecast", "shift to predictive analytics", or similar framing. Do NOT name or '
        "describe any forecast model (e.g. SARIMAX, ARIMA), training windows, or methodology. "
        'Do NOT end with meta lines such as "this summary provides" or "aiding '
        'underwriting".\n\n'
        "Use USD for dollars. **Bold** at most a few numbers. No # headings, no bullet lists."
    )
    user = f"Write only the closing paragraph.\n\n```json\n{payload}\n```"

    try:
        completion = await client.chat.completions.create(
            model=model,
            temperature=0.35,
            max_tokens=220,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        choice = completion.choices[0].message.content
        text = scrub_redundant_segment_preamble((choice or "").strip())
        if not text:
            return (
                fallback_narrative(ctx),
                model,
                "fallback",
                "OpenAI returned an empty response; using deterministic summary.",
            )
        return text, model, "openai", None
    except Exception as exc:  # noqa: BLE001
        detail = str(exc).strip()
        if len(detail) > 320:
            detail = detail[:320] + "…"
        return (
            fallback_narrative(ctx),
            model,
            "fallback",
            f"OpenAI request failed ({type(exc).__name__}): {detail or 'no message'}",
        )
