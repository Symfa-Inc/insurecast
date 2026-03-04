from __future__ import annotations

from pathlib import Path

from insurecast.ingest_osha import (
    aggregate_monthly_claims,
    build_severity_params,
    download_osha_rows,
    write_csv,
)


def main() -> None:
    base_dir = Path(__file__).resolve().parents[1]
    output_dir = base_dir / "data" / "demo"
    claims_path = output_dir / "monthly_claims.csv"
    severity_path = output_dir / "severity_params.csv"

    print("Downloading OSHA Severe Injury Reports...")
    source_rows = download_osha_rows()
    print(f"Downloaded rows: {len(source_rows)}")

    claims_rows = aggregate_monthly_claims(source_rows)
    severity_rows = build_severity_params(claims_rows)

    write_csv(
        claims_path,
        claims_rows,
        ["month", "state", "industry", "claim_type", "claims_count_actual"],
    )
    write_csv(
        severity_path,
        severity_rows,
        [
            "state",
            "industry",
            "claim_type",
            "distribution",
            "param_1",
            "param_2",
            "base_avg_cost",
        ],
    )

    print(f"Wrote {len(claims_rows)} claim rows to {claims_path}")
    print(f"Wrote {len(severity_rows)} severity rows to {severity_path}")


if __name__ == "__main__":
    main()
