#!/usr/bin/env python3
"""Merge monthly_claims.csv and severity_params.csv into one table."""

import csv
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "demo"
MONTHLY_CLAIMS = DATA_DIR / "monthly_claims.csv"
SEVERITY_PARAMS = DATA_DIR / "severity_params.csv"
OUTPUT_PATH = DATA_DIR / "merged_claims_with_severity.csv"


def main() -> None:
    # Load severity params: (state, industry, claim_type) -> {distribution, param_1, param_2, base_avg_cost}
    severity_lookup: dict[tuple[str, str, str], dict[str, str]] = {}
    with SEVERITY_PARAMS.open(newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = (row["state"], row["industry"], row["claim_type"])
            severity_lookup[key] = {
                "distribution": row["distribution"],
                "param_1": row["param_1"],
                "param_2": row["param_2"],
                "base_avg_cost": row["base_avg_cost"],
            }

    # Merge: for each monthly_claims row, add severity columns
    fieldnames = [
        "month",
        "state",
        "industry",
        "claim_type",
        "claims_count_actual",
        "distribution",
        "param_1",
        "param_2",
        "base_avg_cost",
    ]

    with MONTHLY_CLAIMS.open(newline="") as infile, OUTPUT_PATH.open(
        "w", newline=""
    ) as outfile:
        reader = csv.DictReader(infile)
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()

        for row in reader:
            key = (row["state"], row["industry"], row["claim_type"])
            severity = severity_lookup.get(key, {})
            merged = {
                "month": row["month"],
                "state": row["state"],
                "industry": row["industry"],
                "claim_type": row["claim_type"],
                "claims_count_actual": row["claims_count_actual"],
                "distribution": severity.get("distribution", ""),
                "param_1": severity.get("param_1", ""),
                "param_2": severity.get("param_2", ""),
                "base_avg_cost": severity.get("base_avg_cost", ""),
            }
            writer.writerow(merged)

    print(f"Wrote {OUTPUT_PATH} with merged data")


if __name__ == "__main__":
    main()
