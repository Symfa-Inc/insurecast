#!/usr/bin/env python3
"""Fill missing (month, state, industry, claim_type) rows with synthetic data.

Generates data for Jan 2015–Dec 2025. Synthetic claims follow the same distribution
as observed data per segment (state, industry, claim_type).
"""

import csv
import random
from collections import defaultdict
from datetime import date
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "demo"
INPUT_PATH = DATA_DIR / "merged_claims_with_severity.csv"
OUTPUT_PATH = DATA_DIR / "merged_claims_with_severity.csv"


def iter_months(start: date, end: date):
    year, month = start.year, start.month
    while (year, month) <= (end.year, end.month):
        yield date(year, month, 1)
        month += 1
        if month > 12:
            month, year = 1, year + 1


def main() -> None:
    # Load existing data and segment metadata
    existing: dict[tuple[str, str, str, str], dict[str, str]] = {}
    segment_metadata: dict[tuple[str, str, str], dict[str, str]] = {}
    claims_by_segment: dict[tuple[str, str, str], list[float]] = defaultdict(list)

    with INPUT_PATH.open(newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        for row in reader:
            month = row["month"]
            state = row["state"]
            industry = row["industry"]
            claim_type = row["claim_type"]
            key = (month, state, industry, claim_type)
            seg = (state, industry, claim_type)
            existing[key] = row
            claims_by_segment[seg].append(float(row["claims_count_actual"]))
            if seg not in segment_metadata:
                segment_metadata[seg] = {
                    "distribution": row["distribution"],
                    "param_1": row["param_1"],
                    "param_2": row["param_2"],
                    "base_avg_cost": row["base_avg_cost"],
                }

    # Compute per-segment stats (mean, std) for claims
    segment_stats: dict[tuple[str, str, str], tuple[float, float]] = {}
    industry_claim_stats: dict[tuple[str, str], list[float]] = defaultdict(list)
    all_claims: list[float] = []

    for seg, vals in claims_by_segment.items():
        mean_val = sum(vals) / len(vals)
        variance = sum((x - mean_val) ** 2 for x in vals) / len(vals) if len(vals) > 1 else 0
        std_val = variance**0.5
        segment_stats[seg] = (mean_val, max(std_val, 0.5))
        industry_claim_stats[(seg[1], seg[2])].extend(vals)
        all_claims.extend(vals)

    global_mean = sum(all_claims) / len(all_claims) if all_claims else 5.0
    global_var = (
        sum((x - global_mean) ** 2 for x in all_claims) / len(all_claims) if all_claims else 1
    )
    global_std = max(global_var**0.5, 0.5)

    industry_stats: dict[tuple[str, str], tuple[float, float]] = {}
    for (ind, ct), vals in industry_claim_stats.items():
        m = sum(vals) / len(vals)
        v = sum((x - m) ** 2 for x in vals) / len(vals) if len(vals) > 1 else 1
        industry_stats[(ind, ct)] = (m, max(v**0.5, 0.5))

    def get_segment_params(seg: tuple[str, str, str]) -> tuple[float, float]:
        if seg in segment_stats:
            return segment_stats[seg]
        if (seg[1], seg[2]) in industry_stats:
            return industry_stats[(seg[1], seg[2])]
        return (global_mean, global_std)

    # All segments that appear in the data
    all_segments = set(segment_metadata.keys())
    if not all_segments:
        raise SystemExit("No segments found in input file")

    # Generate full grid: 2015-01 to 2025-12
    start_date = date(2015, 1, 1)
    end_date = date(2025, 12, 1)

    def sample_claims(mean_val: float, std_val: float) -> int:
        # Sample from normal, clamp to positive, round to int
        x = random.gauss(mean_val, std_val)
        return max(1, int(round(max(0.5, x))))

    rows: list[dict[str, str]] = []
    for month_date in iter_months(start_date, end_date):
        month_str = month_date.strftime("%Y-%m")
        for seg in sorted(all_segments):
            state, industry, claim_type = seg
            key = (month_str, state, industry, claim_type)
            meta = segment_metadata[seg]
            if key in existing:
                rows.append(existing[key])
            else:
                mean_val, std_val = get_segment_params(seg)
                claims_val = sample_claims(mean_val, std_val)
                rows.append({
                    "month": month_str,
                    "state": state,
                    "industry": industry,
                    "claim_type": claim_type,
                    "claims_count_actual": str(claims_val),
                    "distribution": meta["distribution"],
                    "param_1": meta["param_1"],
                    "param_2": meta["param_2"],
                    "base_avg_cost": meta["base_avg_cost"],
                })

    # Sort by month, state, industry, claim_type
    rows.sort(key=lambda r: (r["month"], r["state"], r["industry"], r["claim_type"]))

    with OUTPUT_PATH.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    original_count = len(existing)
    new_count = len(rows)
    filled = new_count - original_count
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Original rows: {original_count}, Total rows: {new_count}, Synthetic filled: {filled}")


if __name__ == "__main__":
    random.seed(42)
    main()
