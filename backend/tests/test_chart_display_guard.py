from insurecast.chart_display_guard import series_rows_have_plottable_chart_data
from insurecast.llm_summary import scrub_redundant_segment_preamble


def test_empty_rows_not_plottable() -> None:
    assert not series_rows_have_plottable_chart_data([], [])


def test_zero_forecast_not_plottable() -> None:
    claims = [
        {
            "month": "2024-01",
            "claims_count_actual": None,
            "claims_count_forecast": 0.0,
        },
    ]
    costs = [
        {"month": "2024-01", "paid_amount_actual": None, "paid_amount_forecast": 0.0},
    ]
    assert not series_rows_have_plottable_chart_data(claims, costs)


def test_scrub_segment_preamble() -> None:
    raw = 'For the segment "FL · Construction · Indemnity," claims are steady.'
    assert scrub_redundant_segment_preamble(raw) == "claims are steady."
    raw2 = "For the segment FL · Construction · Indemnity, next sentence."
    assert scrub_redundant_segment_preamble(raw2) == "next sentence."


def test_nonzero_claims_plottable() -> None:
    claims = [
        {
            "month": "2024-01",
            "claims_count_actual": 3.0,
            "claims_count_forecast": 3.0,
        },
    ]
    assert series_rows_have_plottable_chart_data(claims, [])
