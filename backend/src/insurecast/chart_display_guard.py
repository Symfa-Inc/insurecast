"""Align with frontend chart rules: plottable = finite, in range, and not identically zero."""

from __future__ import annotations

import math
from typing import Any

_SANE_MAX = 1_000_000.0


def _is_plottable_number(value: Any) -> bool:
    if value is None:
        return False
    try:
        f = float(value)
    except (TypeError, ValueError):
        return False
    return math.isfinite(f) and 0 <= f < _SANE_MAX and f != 0


def series_rows_have_plottable_chart_data(
    claims_rows: list[dict[str, Any]],
    cost_rows: list[dict[str, Any]],
) -> bool:
    """True if either claims or paid series would draw a non-empty line (same idea as dashboard charts)."""
    for r in claims_rows:
        if _is_plottable_number(r.get("claims_count_actual")):
            return True
        if _is_plottable_number(r.get("claims_count_forecast")):
            return True
    for r in cost_rows:
        if _is_plottable_number(r.get("paid_amount_actual")):
            return True
        if _is_plottable_number(r.get("paid_amount_forecast")):
            return True
    return False
