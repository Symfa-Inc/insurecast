#!/usr/bin/env python3
"""Add variety to merged_claims_with_severity.csv: scale up claims, vary costs, reduce periodicity.

Modifies the CSV in place to:
- Increase claims counts (scale ~2.5x with random variation)
- Vary base_avg_cost per row (±20% randomness, slight baseline shift)
- Add randomness to break the zigzag/periodic pattern
"""

import csv
import random
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "demo"
INPUT_PATH = DATA_DIR / "merged_claims_with_severity.csv"
OUTPUT_PATH = DATA_DIR / "merged_claims_with_severity.csv"

# Scale claims by ~2.5x; add ±30% noise per row to reduce periodicity
CLAIMS_SCALE = 2.5
CLAIMS_NOISE = 0.35

# Vary base_avg_cost: ±22% randomness, baseline multiplier 1.15
COST_BASELINE_MULT = 1.15
COST_NOISE = 0.22


def main() -> None:
    rows: list[dict[str, str]] = []
    fieldnames: list[str] = []

    with INPUT_PATH.open(newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames or [])
        for row in reader:
            claims = float(row["claims_count_actual"])
            cost = float(row["base_avg_cost"])

            # Scale claims and add noise (different per row to break periodicity)
            scale_factor = 1 + random.uniform(-CLAIMS_NOISE, CLAIMS_NOISE)
            new_claims = claims * CLAIMS_SCALE * scale_factor
            new_claims = max(1, int(round(new_claims)))

            # Vary base_avg_cost
            cost_factor = 1 + random.uniform(-COST_NOISE, COST_NOISE)
            new_cost = cost * COST_BASELINE_MULT * cost_factor
            new_cost = round(max(500, new_cost), 1)

            row["claims_count_actual"] = str(new_claims)
            row["base_avg_cost"] = str(new_cost)
            rows.append(row)

    with OUTPUT_PATH.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {OUTPUT_PATH} ({len(rows)} rows)")
    print(
        f"Claims scaled ~{CLAIMS_SCALE}x with ±{int(CLAIMS_NOISE * 100)}% noise; "
        f"costs ×{COST_BASELINE_MULT} with ±{int(COST_NOISE * 100)}% noise",
    )


if __name__ == "__main__":
    random.seed(12345)
    main()
