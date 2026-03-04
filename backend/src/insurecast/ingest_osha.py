from __future__ import annotations

import csv
from collections import defaultdict
from datetime import datetime
from io import BytesIO
from io import StringIO
from pathlib import Path
import re
import urllib.request
import zipfile


OSHA_SIR_ZIP_URL = (
    "https://obis.osha.gov/severeinjury/xml/severeinjury.csv"
)

NAICS_TO_INDUSTRY = {
    "11": "Manufacturing",
    "21": "Manufacturing",
    "22": "Manufacturing",
    "23": "Construction",
    "31": "Manufacturing",
    "32": "Manufacturing",
    "33": "Manufacturing",
    "48": "Manufacturing",
    "49": "Manufacturing",
    "56": "Healthcare",
    "61": "Healthcare",
    "62": "Healthcare",
}

STATE_TO_CODE = {
    "ALABAMA": "AL",
    "ALASKA": "AK",
    "ARIZONA": "AZ",
    "ARKANSAS": "AR",
    "CALIFORNIA": "CA",
    "COLORADO": "CO",
    "CONNECTICUT": "CT",
    "DELAWARE": "DE",
    "DISTRICT OF COLUMBIA": "DC",
    "FLORIDA": "FL",
    "GEORGIA": "GA",
    "HAWAII": "HI",
    "IDAHO": "ID",
    "ILLINOIS": "IL",
    "INDIANA": "IN",
    "IOWA": "IA",
    "KANSAS": "KS",
    "KENTUCKY": "KY",
    "LOUISIANA": "LA",
    "MAINE": "ME",
    "MARYLAND": "MD",
    "MASSACHUSETTS": "MA",
    "MICHIGAN": "MI",
    "MINNESOTA": "MN",
    "MISSISSIPPI": "MS",
    "MISSOURI": "MO",
    "MONTANA": "MT",
    "NEBRASKA": "NE",
    "NEVADA": "NV",
    "NEW HAMPSHIRE": "NH",
    "NEW JERSEY": "NJ",
    "NEW MEXICO": "NM",
    "NEW YORK": "NY",
    "NORTH CAROLINA": "NC",
    "NORTH DAKOTA": "ND",
    "OHIO": "OH",
    "OKLAHOMA": "OK",
    "OREGON": "OR",
    "PENNSYLVANIA": "PA",
    "RHODE ISLAND": "RI",
    "SOUTH CAROLINA": "SC",
    "SOUTH DAKOTA": "SD",
    "TENNESSEE": "TN",
    "TEXAS": "TX",
    "UTAH": "UT",
    "VERMONT": "VT",
    "VIRGINIA": "VA",
    "WASHINGTON": "WA",
    "WEST VIRGINIA": "WV",
    "WISCONSIN": "WI",
    "WYOMING": "WY",
}


def _first_present(row: dict[str, str], names: list[str]) -> str:
    normalized = {key.strip().lower(): (value or "").strip() for key, value in row.items()}
    for name in names:
        value = normalized.get(name)
        if value:
            return value
    return ""


def _normalize_row(raw_row: dict[str, str]) -> dict[str, str]:
    hospitalized = _first_present(raw_row, ["hospitalized"])
    amputation = _first_present(raw_row, ["amputation"])
    event_title = _first_present(raw_row, ["eventtitle", "event title"])
    narrative = _first_present(raw_row, ["final narrative", "final_narrative"])
    return {
        "event_date": _first_present(
            raw_row,
            [
                "event date",
                "event_date",
                "eventdate",
                "date of incident",
                "date_of_incident",
            ],
        ),
        "state": _first_present(raw_row, ["state", "state of occurrence"]),
        "naics_code": _first_present(
            raw_row,
            ["naics code", "naics_code", "naics", "primary naics"],
        ),
        "event_type": _first_present(
            raw_row,
            [
                "event type",
                "event_type",
                "eventtitle",
                "event title",
            ],
        ),
        "hospitalized": hospitalized,
        "amputation": amputation,
        "event_title": event_title,
        "narrative": narrative,
    }


def _parse_month(date_text: str) -> str:
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m-%d-%Y"):
        try:
            parsed = datetime.strptime(date_text, fmt)
            return parsed.strftime("%Y-%m")
        except ValueError:
            continue
    return ""


def _map_industry(naics_code: str) -> str:
    code = "".join(ch for ch in naics_code if ch.isdigit())
    if len(code) < 2:
        return "Manufacturing"
    return NAICS_TO_INDUSTRY.get(code[:2], "Manufacturing")


def _map_claim_type(event_type: str) -> str:
    lowered = event_type.lower()
    if "amputation" in lowered or "eye" in lowered:
        return "Indemnity"
    if "hospital" in lowered:
        return "LostTime"
    return "MedicalOnly"


def _normalize_state(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z ]", "", value).strip().upper()
    if len(cleaned) == 2:
        return cleaned
    return STATE_TO_CODE.get(cleaned, "")


def _normalized_event_type(row: dict[str, str]) -> str:
    hospitalized = row.get("hospitalized", "")
    amputation = row.get("amputation", "")
    if amputation and amputation not in {"0", "0.0", "0.00"}:
        return "Amputation"
    if hospitalized and hospitalized not in {"0", "0.0", "0.00"}:
        return "Hospitalization"
    combined = " ".join(
        [row.get("event_type", ""), row.get("event_title", ""), row.get("narrative", "")]
    ).strip()
    return combined


def aggregate_monthly_claims(rows: list[dict[str, str]]) -> list[dict[str, str | int]]:
    counts: dict[tuple[str, str, str, str], int] = defaultdict(int)
    for raw_row in rows:
        row = _normalize_row(raw_row)
        month = _parse_month(row["event_date"])
        state = _normalize_state(row["state"])
        if not month or len(state) != 2:
            continue
        industry = _map_industry(row["naics_code"])
        claim_type = _map_claim_type(_normalized_event_type(row))
        key = (month, state, industry, claim_type)
        counts[key] += 1

    result = []
    for month, state, industry, claim_type in sorted(counts):
        result.append(
            {
                "month": month,
                "state": state,
                "industry": industry,
                "claim_type": claim_type,
                "claims_count_actual": counts[(month, state, industry, claim_type)],
            }
        )
    return result


def build_severity_params(claims_rows: list[dict[str, str | int]]) -> list[dict[str, str | float]]:
    segment_keys = {
        (
            str(row["state"]),
            str(row["industry"]),
            str(row["claim_type"]),
        )
        for row in claims_rows
    }
    claim_factor = {"LostTime": 1.25, "MedicalOnly": 0.7, "Indemnity": 1.05}
    industry_factor = {"Construction": 1.25, "Healthcare": 1.0, "Manufacturing": 1.1}
    state_factor = {"CA": 1.15, "NY": 1.2, "TX": 0.95}

    rows: list[dict[str, str | float]] = []
    for state, industry, claim_type in sorted(segment_keys):
        base = 7200.0
        cost = (
            base
            * state_factor.get(state, 1.0)
            * industry_factor.get(industry, 1.0)
            * claim_factor.get(claim_type, 1.0)
        )
        rows.append(
            {
                "state": state,
                "industry": industry,
                "claim_type": claim_type,
                "distribution": "lognormal",
                "param_1": 8.55,
                "param_2": 0.72,
                "base_avg_cost": round(cost, 2),
            }
        )
    return rows


def download_osha_rows(url: str = OSHA_SIR_ZIP_URL) -> list[dict[str, str]]:
    with urllib.request.urlopen(url, timeout=60) as response:
        payload = response.read()

    if url.lower().endswith(".zip"):
        with zipfile.ZipFile(BytesIO(payload)) as archive:
            csv_name = next(
                (name for name in archive.namelist() if name.lower().endswith(".csv")),
                "",
            )
            if not csv_name:
                return []
            with archive.open(csv_name) as csv_file:
                text = csv_file.read().decode("latin-1", errors="ignore")
                reader = csv.DictReader(StringIO(text))
                return [dict(row) for row in reader]

    text = payload.decode("latin-1", errors="ignore")
    reader = csv.DictReader(StringIO(text))
    return [dict(row) for row in reader]


def write_csv(path: Path, rows: list[dict[str, str | float | int]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
