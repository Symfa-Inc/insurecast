"""Monthly claims forecasting with SARIMAX (fallbacks for short series / fit failures)."""

from __future__ import annotations

from datetime import date
from statistics import mean
from typing import Any

import numpy as np
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX


def add_months(d: date, n: int) -> date:
    total = d.year * 12 + (d.month - 1) + n
    year = total // 12
    month = total % 12 + 1
    return date(year, month, 1)


def _month_key(d: date) -> date:
    return date(d.year, d.month, 1)


def history_to_monthly_series(
    history: list[tuple[date, float]],
    series_end: date,
) -> pd.Series:
    """Regular month-start index from first history month through series_end; gaps interpolated."""
    if not history:
        return pd.Series(dtype=float)
    end = _month_key(series_end)
    start = min(_month_key(d) for d, _ in history)
    idx = pd.date_range(pd.Timestamp(start), pd.Timestamp(end), freq="MS")
    s = pd.Series(np.nan, index=idx, dtype=float)
    for d, v in history:
        ts = pd.Timestamp(_month_key(d))
        if ts in s.index:
            s.loc[ts] = float(v)
    if s.isna().all():
        return s
    s = s.interpolate(method="linear", limit_direction="both").ffill().bfill()
    return s.astype(float)


def seasonal_naive_point(history: list[tuple[date, float]], month: date) -> float:
    same_month_values = [
        value for value_month, value in history if value_month.month == month.month
    ]
    if same_month_values:
        return float(mean(same_month_values))
    return float(mean(v for _, v in history))


def forecast_horizon_dict(
    history: list[tuple[date, float]],
    actual_end: date,
    forecast_end: date,
    *,
    min_obs_sarimax: int = 36,
    alpha: float = 0.05,
) -> tuple[dict[date, tuple[float, float, float]], dict[str, Any]]:
    """
    Forecast every month in (actual_end, forecast_end] inclusive of forecast_end month-starts.

    Returns
    -------
    forecasts
        month -> (point, ci_low, ci_high)
    meta
        diagnostics (method used, errors)
    """
    out: dict[date, tuple[float, float, float]] = {}
    meta: dict[str, Any] = {"method": "none", "error": None}

    if not history:
        return out, meta

    ae = _month_key(actual_end)
    fe = _month_key(forecast_end)
    first_fc = add_months(ae, 1)
    if first_fc > fe:
        return out, meta

    y = history_to_monthly_series(history, ae)
    if y.isna().any() or len(y) < 12:
        meta["method"] = "seasonal_naive"
        m = first_fc
        while m <= fe:
            pt = max(0.0, seasonal_naive_point(history, m))
            spread = max(pt * 0.12, 0.5)
            out[m] = (pt, max(0.0, pt - spread), pt + spread)
            m = add_months(m, 1)
        return out, meta

    steps = 0
    cur = first_fc
    while cur <= fe:
        steps += 1
        cur = add_months(cur, 1)

    if len(y) < min_obs_sarimax:
        meta["method"] = "seasonal_naive_short_history"
        m = first_fc
        while m <= fe:
            pt = max(0.0, seasonal_naive_point(history, m))
            spread = max(pt * 0.12, 0.5)
            out[m] = (pt, max(0.0, pt - spread), pt + spread)
            m = add_months(m, 1)
        return out, meta

    try:
        # Seasonal monthly model; relax stationarity for small / noisy OSHA-style counts
        mod = SARIMAX(
            y,
            order=(1, 1, 1),
            seasonal_order=(1, 1, 1, 12),
            enforce_stationarity=False,
            enforce_invertibility=False,
        )
        res = mod.fit(disp=False, maxiter=150)
        fc = res.get_forecast(steps=steps)
        pm = fc.predicted_mean
        ci = fc.conf_int(alpha=alpha)
        lo_col, hi_col = ci.columns[0], ci.columns[1]
        m = first_fc
        for i in range(steps):
            pt = float(pm.iloc[i])
            lo = float(ci.iloc[i][lo_col])
            hi = float(ci.iloc[i][hi_col])
            pt = max(0.0, pt)
            lo = max(0.0, lo)
            hi = max(hi, pt)
            out[m] = (pt, lo, hi)
            m = add_months(m, 1)
        meta["method"] = "sarimax"
        meta["aic"] = float(res.aic) if hasattr(res, "aic") else None
    except Exception as exc:  # noqa: BLE001 — try simpler model then naive
        meta["error"] = str(exc)
        try:
            mod2 = SARIMAX(
                y,
                order=(1, 1, 1),
                seasonal_order=(0, 0, 0, 0),
                enforce_stationarity=False,
                enforce_invertibility=False,
            )
            res2 = mod2.fit(disp=False, maxiter=150)
            fc = res2.get_forecast(steps=steps)
            pm = fc.predicted_mean
            ci = fc.conf_int(alpha=alpha)
            lo_col, hi_col = ci.columns[0], ci.columns[1]
            m = first_fc
            for i in range(steps):
                pt = max(0.0, float(pm.iloc[i]))
                lo = max(0.0, float(ci.iloc[i][lo_col]))
                hi = max(float(ci.iloc[i][hi_col]), pt)
                out[m] = (pt, lo, hi)
                m = add_months(m, 1)
            meta["method"] = "arima_fallback"
        except Exception as exc2:  # noqa: BLE001
            meta["error"] = f"{meta['error']}; {exc2}"
            meta["method"] = "seasonal_naive_fit_failed"
            m = first_fc
            while m <= fe:
                pt = max(0.0, seasonal_naive_point(history, m))
                spread = max(pt * 0.12, 0.5)
                out[m] = (pt, max(0.0, pt - spread), pt + spread)
                m = add_months(m, 1)

    return out, meta


def naive_forecast_interval(
    history: list[tuple[date, float]],
    month: date,
) -> tuple[float, float, float]:
    """Same spread heuristic as ``claims_ci`` for a single month."""
    pt = max(0.0, seasonal_naive_point(history, month))
    spread = max(pt * 0.12, 0.5)
    return pt, max(0.0, pt - spread), pt + spread
