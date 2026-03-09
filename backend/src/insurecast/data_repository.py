from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from statistics import mean


@dataclass(frozen=True)
class SegmentKey:
    state: str
    industry: str
    claim_type: str


def parse_month(value: str) -> date:
    year_str, month_str = value.split("-", maxsplit=1)
    return date(int(year_str), int(month_str), 1)


def format_month(value: date) -> str:
    return value.strftime("%Y-%m")


def iter_months(start: date, end: date):
    year = start.year
    month = start.month
    while (year, month) <= (end.year, end.month):
        yield date(year, month, 1)
        month += 1
        if month > 12:
            month = 1
            year += 1


def claims_ci(prediction: float) -> tuple[float, float]:
    spread = prediction * 0.12
    return round(max(0.0, prediction - spread), 2), round(prediction + spread, 2)


def paid_ci(prediction: float) -> tuple[float, float]:
    spread = prediction * 0.15
    return round(max(0.0, prediction - spread), 2), round(prediction + spread, 2)


class DemoDataRepository:
    def __init__(self, data_dir: Path | None = None) -> None:
        backend_dir = Path(__file__).resolve().parents[2]
        self.data_dir = data_dir or backend_dir / "data" / "demo"
        self.merged_path = self.data_dir / "merged_claims_with_severity.csv"
        self._load()

    def _load(self) -> None:
        self.claims_by_key: dict[tuple[str, str, str, str], float] = {}
        self.claim_history: dict[SegmentKey, list[tuple[date, float]]] = {}
        self.severity_by_segment: dict[SegmentKey, float] = {}
        segment_sets = {"states": set(), "industries": set(), "claim_types": set()}  # type: ignore

        with self.merged_path.open("r", encoding="utf-8", newline="") as file:
            for row in csv.DictReader(file):
                month = row["month"]
                state = row["state"]
                industry = row["industry"]
                claim_type = row["claim_type"]
                count = float(row["claims_count_actual"])
                base_avg_cost = float(row["base_avg_cost"])

                key = (month, state, industry, claim_type)
                self.claims_by_key[key] = count

                segment = SegmentKey(
                    state=state,
                    industry=industry,
                    claim_type=claim_type,
                )
                if segment not in self.severity_by_segment:
                    self.severity_by_segment[segment] = base_avg_cost
                self.claim_history.setdefault(segment, []).append(
                    (parse_month(month), count),
                )
                segment_sets["states"].add(state)
                segment_sets["industries"].add(industry)
                segment_sets["claim_types"].add(claim_type)

        for segment in self.claim_history:
            self.claim_history[segment].sort(key=lambda item: item[0])

        self.states = sorted(segment_sets["states"])
        self.industries = sorted(segment_sets["industries"])
        self.claim_types = sorted(segment_sets["claim_types"])

        all_months = [
            parse_month(month) for month, _, _, _ in self.claims_by_key.keys()
        ]
        self.actual_start = min(all_months)
        self.actual_end = max(all_months)
        self.forecast_end = date(max(2026, self.actual_end.year + 1), 12, 1)

    def get_segments(self) -> dict[str, list[str]]:
        return {
            "states": self.states,
            "industries": self.industries,
            "claim_types": self.claim_types,
        }

    def actual_claims(self, month: date, segment: SegmentKey) -> float | None:
        key = (format_month(month), segment.state, segment.industry, segment.claim_type)
        return self.claims_by_key.get(key)

    def forecast_claims(self, month: date, segment: SegmentKey) -> float:
        actual = self.actual_claims(month, segment)
        if actual is not None:
            return round(actual, 2)

        history = self.claim_history.get(segment, [])
        if not history:
            return 0.0

        latest_month = history[-1][0]
        latest_value = history[-1][1]
        same_month_values = [
            value for value_month, value in history if value_month.month == month.month
        ]
        seasonal_base = mean(same_month_values) if same_month_values else latest_value

        if len(history) >= 24:
            recent = mean(value for _, value in history[-12:])
            prior = mean(value for _, value in history[-24:-12])
            trend_ratio = recent / prior if prior > 0 else 1.0
        else:
            trend_ratio = 1.0

        steps = (month.year - latest_month.year) * 12 + (
            month.month - latest_month.month
        )
        growth = trend_ratio ** (steps / 12) if steps > 0 else 1.0
        return round(max(0.0, seasonal_base * growth), 2)

    def avg_severity(self, month: date, segment: SegmentKey) -> float:
        base = self.severity_by_segment.get(segment, 8000.0)
        inflation = 1.0 + max(0, month.year - self.actual_end.year) * 0.03
        seasonality = 1.0 + 0.02 * ((month.month - 6) / 12)
        return round(base * inflation * seasonality, 2)
