from fastapi.testclient import TestClient

from insurecast.main import app

client = TestClient(app)


def test_segments_endpoint_returns_dimensions() -> None:
    response = client.get("/segments")
    assert response.status_code == 200
    payload = response.json()
    assert set(payload.keys()) == {"states", "industries", "claim_types"}
    assert len(payload["states"]) > 0
    assert len(payload["industries"]) > 0
    assert len(payload["claim_types"]) > 0


def test_segments_are_loaded_from_ingested_csv() -> None:
    response = client.get("/segments")
    assert response.status_code == 200
    payload = response.json()
    assert "AL" in payload["states"]


def test_claims_series_endpoint_returns_points() -> None:
    response = client.get(
        "/series/claims",
        params={
            "from": "2023-01",
            "to": "2026-12",
            "state": "CA",
            "industry": "Construction",
            "claim_type": "LostTime",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert "series" in payload
    assert len(payload["series"]) > 12
    first = payload["series"][0]
    assert "month" in first
    assert "claims_count_actual" in first
    assert "claims_count_forecast" in first


def test_costs_series_endpoint_returns_points() -> None:
    response = client.get(
        "/series/costs",
        params={
            "from": "2023-01",
            "to": "2026-12",
            "state": "CA",
            "industry": "Construction",
            "claim_type": "LostTime",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert "series" in payload
    assert len(payload["series"]) > 12
    first = payload["series"][0]
    assert "paid_amount_actual" in first
    assert "paid_amount_forecast" in first
    assert "avg_cost_per_claim" in first


def test_metadata_endpoint_returns_metrics() -> None:
    response = client.get("/model/metadata")
    assert response.status_code == 200
    payload = response.json()
    assert payload["model_name"] == "SARIMAX"
    assert "mae" in payload
    assert "rmse" in payload
    assert "mape" in payload


def test_scenario_recalculate_changes_values() -> None:
    response = client.post(
        "/scenario/recalculate",
        json={
            "state": "CA",
            "industry": "Construction",
            "claim_type": "LostTime",
            "severity_inflation_pct": 10,
            "frequency_shock_pct": 5,
            "from": "2025-01",
            "to": "2026-12",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert "series" in payload
    assert len(payload["series"]) > 0
    first = payload["series"][0]
    assert first["claims_count_forecast"] > 0
    assert first["paid_amount_forecast"] > 0
