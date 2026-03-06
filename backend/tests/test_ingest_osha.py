from insurecast.ingest_osha import aggregate_monthly_claims


def test_aggregate_monthly_claims_shapes_demo_schema() -> None:
    rows = [
        {
            "event_date": "2024-01-15",
            "state": "CA",
            "naics_code": "236220",
            "event_type": "Hospitalization",
        },
        {
            "event_date": "2024-01-20",
            "state": "CA",
            "naics_code": "236220",
            "event_type": "Amputation",
        },
        {
            "event_date": "2024-02-05",
            "state": "TX",
            "naics_code": "622110",
            "event_type": "Hospitalization",
        },
    ]

    claims = aggregate_monthly_claims(rows)

    assert len(claims) == 3
    assert claims[0]["month"] == "2024-01"
    assert claims[0]["state"] == "CA"
    assert claims[0]["industry"] == "Construction"
    assert claims[0]["claim_type"] in {"LostTime", "MedicalOnly", "Indemnity"}
    assert claims[0]["claims_count_actual"] == 1


def test_aggregate_monthly_claims_maps_osha_native_fields() -> None:
    rows = [
        {
            "EventDate": "1/1/2015",
            "State": "NEW YORK",
            "Primary NAICS": "236220",
            "Hospitalized": "1.00",
            "Amputation": "0.00",
        },
    ]

    claims = aggregate_monthly_claims(rows)

    assert len(claims) == 1
    assert claims[0]["month"] == "2015-01"
    assert claims[0]["state"] == "NY"
    assert claims[0]["claim_type"] == "LostTime"
