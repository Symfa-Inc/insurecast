# Workers' Compensation Predictive Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single-page workers' compensation dashboard demo with monthly segmented claims/cost forecasts, scenario controls, and transparent SARIMAX model metadata.

**Architecture:** Keep FastAPI as the data + forecasting API and Next.js App Router as the SPA UI. Use deterministic demo artifacts (public-derived aggregates + synthetic severity) so the frontend reads stable API outputs while still supporting interactive filtering and scenario recomputation.

**Tech Stack:** FastAPI, Pydantic v2, pytest, Python/pandas/statsmodels (SARIMAX), Next.js 16, React 19, TypeScript, Tailwind CSS 4, Recharts (or lightweight chart lib), Vitest + Testing Library.

---

### Task 1: Add backend dependencies and test scaffold

**Files:**
- Modify: `backend/pyproject.toml`
- Create: `backend/tests/test_health.py`
- Create: `backend/tests/test_segments_api.py`

**Step 1: Write the failing tests**

```python
# backend/tests/test_health.py
from fastapi.testclient import TestClient

from insurecast.main import app


def test_health_check_returns_healthy() -> None:
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
```

```python
# backend/tests/test_segments_api.py
from fastapi.testclient import TestClient

from insurecast.main import app


def test_segments_endpoint_returns_dimensions() -> None:
    client = TestClient(app)
    response = client.get("/api/v1/segments")
    assert response.status_code == 200
    payload = response.json()
    assert "states" in payload
    assert "industries" in payload
    assert "claim_types" in payload
```

**Step 2: Run tests to verify failure**

Run: `cd backend && uv run pytest backend/tests/test_segments_api.py -v`
Expected: FAIL with `404` on `/api/v1/segments`.

**Step 3: Add minimal dependency declarations**
- Add runtime deps in `backend/pyproject.toml`: `pandas`, `numpy`, `statsmodels`, `python-dateutil`.
- Add test deps in dev group if missing: `pytest-cov`.

**Step 4: Run full backend tests**

Run: `cd backend && uv run pytest backend/tests -v`
Expected: `test_health_check_returns_healthy` PASS, segments test still FAIL.

**Step 5: Commit**

```bash
git add backend/pyproject.toml backend/tests/test_health.py backend/tests/test_segments_api.py
git commit -m "test(backend): scaffold API tests and forecasting deps"
```

### Task 2: Add demo data artifacts and loader

**Files:**
- Create: `backend/data/demo/monthly_claims.csv`
- Create: `backend/data/demo/severity_params.csv`
- Create: `backend/src/insurecast/data_loader.py`
- Create: `backend/tests/test_data_loader.py`

**Step 1: Write the failing loader test**

```python
from insurecast.data_loader import load_demo_data


def test_load_demo_data_returns_required_frames() -> None:
    dataset = load_demo_data()
    assert "claims" in dataset
    assert "severity" in dataset
    assert {"month", "state", "industry", "claim_type", "claims_count_actual"}.issubset(dataset["claims"].columns)
```

**Step 2: Run test to verify failure**

Run: `cd backend && uv run pytest backend/tests/test_data_loader.py -v`
Expected: FAIL with `ModuleNotFoundError: insurecast.data_loader`.

**Step 3: Create demo CSV artifacts**
- `monthly_claims.csv`: monthly rows for at least 3 states x 3 industries x 3 claim types from `2021-01` to `2025-12`.
- `severity_params.csv`: per-segment severity distribution params (`distribution`, `param_1`, `param_2`, `base_avg_cost`).

**Step 4: Implement loader**
- Add `load_demo_data()` in `backend/src/insurecast/data_loader.py`.
- Parse months as datetime, validate required columns, cache in memory.

**Step 5: Run loader tests**

Run: `cd backend && uv run pytest backend/tests/test_data_loader.py -v`
Expected: PASS.

**Step 6: Commit**

```bash
git add backend/data/demo/monthly_claims.csv backend/data/demo/severity_params.csv backend/src/insurecast/data_loader.py backend/tests/test_data_loader.py
git commit -m "feat(data): add demo workers comp artifacts and loader"
```

### Task 3: Implement forecasting service (SARIMAX + intervals)

**Files:**
- Create: `backend/src/insurecast/forecasting.py`
- Create: `backend/tests/test_forecasting.py`

**Step 1: Write failing forecasting tests**

```python
from insurecast.data_loader import load_demo_data
from insurecast.forecasting import forecast_claims_series


def test_forecast_claims_returns_horizon_rows() -> None:
    data = load_demo_data()
    segment = data["claims"].query("state == 'CA' and industry == 'Construction' and claim_type == 'LostTime'")
    forecast = forecast_claims_series(segment, horizon=12)
    assert len(forecast) == 12
    assert {"month", "claims_count_forecast", "claims_ci_low", "claims_ci_high"}.issubset(forecast.columns)
```

**Step 2: Run test to verify failure**

Run: `cd backend && uv run pytest backend/tests/test_forecasting.py -v`
Expected: FAIL with `ModuleNotFoundError: insurecast.forecasting`.

**Step 3: Implement minimal forecasting logic**
- Fit SARIMAX (`order=(1,1,1)`, `seasonal_order=(1,1,1,12)` default) on monthly claims by segment.
- Return 12-step forecast with confidence intervals.
- Add fallback (naive seasonal repeat) if model fit fails.

**Step 4: Add metric helper**
- Include holdout metric function returning `mae`, `rmse`, `mape`.

**Step 5: Run tests**

Run: `cd backend && uv run pytest backend/tests/test_forecasting.py -v`
Expected: PASS.

**Step 6: Commit**

```bash
git add backend/src/insurecast/forecasting.py backend/tests/test_forecasting.py
git commit -m "feat(backend): add SARIMAX forecasting service with intervals"
```

### Task 4: Build cost simulation and scenario recalculation service

**Files:**
- Create: `backend/src/insurecast/scenario.py`
- Create: `backend/tests/test_scenario.py`

**Step 1: Write failing scenario test**

```python
from insurecast.scenario import apply_scenario_adjustments


def test_apply_scenario_adjustments_changes_claims_and_costs() -> None:
    result = apply_scenario_adjustments(
        claims_forecast=100.0,
        avg_severity=12000.0,
        frequency_shock_pct=10.0,
        severity_inflation_pct=5.0,
    )
    assert result.adjusted_claims > 100.0
    assert result.adjusted_avg_severity > 12000.0
    assert result.adjusted_paid_amount > 1_200_000.0
```

**Step 2: Run test to verify failure**

Run: `cd backend && uv run pytest backend/tests/test_scenario.py -v`
Expected: FAIL with missing module/function.

**Step 3: Implement scenario logic**
- Add dataclass/Pydantic model for scenario result.
- Implement frequency and severity multipliers.
- Add deterministic calculation for adjusted paid amount.

**Step 4: Run tests**

Run: `cd backend && uv run pytest backend/tests/test_scenario.py -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/insurecast/scenario.py backend/tests/test_scenario.py
git commit -m "feat(backend): add scenario adjustment service"
```

### Task 5: Implement API schemas and endpoints

**Files:**
- Create: `backend/src/insurecast/schemas.py`
- Modify: `backend/src/insurecast/main.py`
- Create: `backend/tests/test_series_api.py`
- Create: `backend/tests/test_metadata_api.py`
- Modify: `backend/tests/test_segments_api.py`

**Step 1: Write failing endpoint tests**

```python
# backend/tests/test_series_api.py
from fastapi.testclient import TestClient
from insurecast.main import app


def test_claims_series_endpoint_returns_history_and_forecast() -> None:
    client = TestClient(app)
    response = client.get(
        "/api/v1/series/claims",
        params={"from": "2023-01", "to": "2026-12", "state": "CA", "industry": "Construction", "claim_type": "LostTime"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "series" in body
    assert len(body["series"]) > 12
```

```python
# backend/tests/test_metadata_api.py
from fastapi.testclient import TestClient
from insurecast.main import app


def test_model_metadata_endpoint_returns_metrics() -> None:
    client = TestClient(app)
    response = client.get("/api/v1/model/metadata")
    assert response.status_code == 200
    payload = response.json()
    assert {"model_name", "mae", "rmse", "mape"}.issubset(payload.keys())
```

**Step 2: Run tests to verify failure**

Run: `cd backend && uv run pytest backend/tests/test_series_api.py backend/tests/test_metadata_api.py -v`
Expected: FAIL with `404` endpoints.

**Step 3: Implement schemas + endpoints**
- Add request/response models in `schemas.py`.
- Wire endpoints in `main.py`:
  - `GET /api/v1/segments`
  - `GET /api/v1/series/claims`
  - `GET /api/v1/series/costs`
  - `GET /api/v1/model/metadata`
  - `POST /api/v1/scenario/recalculate`

**Step 4: Run endpoint tests**

Run: `cd backend && uv run pytest backend/tests/test_segments_api.py backend/tests/test_series_api.py backend/tests/test_metadata_api.py -v`
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/insurecast/schemas.py backend/src/insurecast/main.py backend/tests/test_segments_api.py backend/tests/test_series_api.py backend/tests/test_metadata_api.py
git commit -m "feat(api): add workers comp forecast and scenario endpoints"
```

### Task 6: Prepare frontend testing setup and API client

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/types.ts`
- Create: `frontend/src/lib/api.test.ts`

**Step 1: Write failing API client test**

```ts
import { describe, expect, it } from "vitest";
import { buildClaimsSeriesQuery } from "./api";

describe("buildClaimsSeriesQuery", () => {
  it("builds query string with selected filters", () => {
    const query = buildClaimsSeriesQuery({
      from: "2023-01",
      to: "2026-12",
      state: "CA",
      industry: "Construction",
      claimType: "LostTime",
    });

    expect(query.toString()).toContain("state=CA");
    expect(query.toString()).toContain("industry=Construction");
    expect(query.toString()).toContain("claim_type=LostTime");
  });
});
```

**Step 2: Run tests to verify failure**

Run: `cd frontend && pnpm test`
Expected: FAIL because test tooling and module are missing.

**Step 3: Add testing + client implementation**
- Add scripts/deps for `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
- Add `buildClaimsSeriesQuery` and typed fetch helpers in `src/lib/api.ts`.

**Step 4: Run client tests**

Run: `cd frontend && pnpm test -- --run src/lib/api.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/vitest.config.ts frontend/src/lib/api.ts frontend/src/lib/types.ts frontend/src/lib/api.test.ts
git commit -m "test(frontend): add vitest setup and typed API client"
```

### Task 7: Build dashboard layout, filters, and KPI cards

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/globals.css`
- Create: `frontend/src/components/dashboard-filters.tsx`
- Create: `frontend/src/components/kpi-cards.tsx`
- Create: `frontend/src/components/dashboard-filters.test.tsx`

**Step 1: Write failing component test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardFilters } from "./dashboard-filters";

describe("DashboardFilters", () => {
  it("emits filter updates", () => {
    const onChange = vi.fn();
    render(<DashboardFilters states={["CA"]} industries={["Construction"]} claimTypes={["LostTime"]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/state/i), { target: { value: "CA" } });
    expect(onChange).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify failure**

Run: `cd frontend && pnpm test -- --run src/components/dashboard-filters.test.tsx`
Expected: FAIL with missing component.

**Step 3: Implement UI shell**
- Replace starter Next.js page with dashboard composition.
- Add filter bar and KPI cards.
- Define CSS variables/theme tokens in `globals.css` (non-default visual direction).

**Step 4: Run component test**

Run: `cd frontend && pnpm test -- --run src/components/dashboard-filters.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/app/page.tsx frontend/src/app/globals.css frontend/src/components/dashboard-filters.tsx frontend/src/components/kpi-cards.tsx frontend/src/components/dashboard-filters.test.tsx
git commit -m "feat(frontend): add dashboard shell filters and KPI cards"
```

### Task 8: Add time-series and breakdown visualizations

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/components/claims-forecast-chart.tsx`
- Create: `frontend/src/components/costs-forecast-chart.tsx`
- Create: `frontend/src/components/seasonality-heatmap.tsx`
- Create: `frontend/src/components/segment-breakdown.tsx`
- Create: `frontend/src/components/charts.test.tsx`

**Step 1: Write failing chart rendering test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClaimsForecastChart } from "./claims-forecast-chart";

describe("ClaimsForecastChart", () => {
  it("renders chart title", () => {
    render(<ClaimsForecastChart points={[]} />);
    expect(screen.getByText(/monthly claims/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify failure**

Run: `cd frontend && pnpm test -- --run src/components/charts.test.tsx`
Expected: FAIL with missing component.

**Step 3: Implement chart components**
- Add chart library dependency (e.g., `recharts`).
- Render actual vs forecast and confidence intervals.
- Add seasonality and segment contribution views.

**Step 4: Run chart tests**

Run: `cd frontend && pnpm test -- --run src/components/charts.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/src/components/claims-forecast-chart.tsx frontend/src/components/costs-forecast-chart.tsx frontend/src/components/seasonality-heatmap.tsx frontend/src/components/segment-breakdown.tsx frontend/src/components/charts.test.tsx
git commit -m "feat(frontend): add forecast and segmentation visualizations"
```

### Task 9: Add model transparency and scenario controls

**Files:**
- Create: `frontend/src/components/model-metadata-panel.tsx`
- Create: `frontend/src/components/scenario-controls.tsx`
- Modify: `frontend/src/app/page.tsx`
- Create: `frontend/src/components/scenario-controls.test.tsx`

**Step 1: Write failing scenario interaction test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScenarioControls } from "./scenario-controls";

describe("ScenarioControls", () => {
  it("submits slider values", () => {
    const onApply = vi.fn();
    render(<ScenarioControls onApply={onApply} />);
    fireEvent.click(screen.getByRole("button", { name: /apply scenario/i }));
    expect(onApply).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify failure**

Run: `cd frontend && pnpm test -- --run src/components/scenario-controls.test.tsx`
Expected: FAIL with missing component.

**Step 3: Implement controls and metadata panel**
- Add severity/frequency sliders and submit handling.
- Add model diagnostics/assumptions panel bound to metadata API.
- Wire into page state and query lifecycle.

**Step 4: Run tests**

Run: `cd frontend && pnpm test -- --run src/components/scenario-controls.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/model-metadata-panel.tsx frontend/src/components/scenario-controls.tsx frontend/src/app/page.tsx frontend/src/components/scenario-controls.test.tsx
git commit -m "feat(frontend): add scenario controls and model transparency panel"
```

### Task 10: Integrate end-to-end flow and harden error/loading states

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Create: `frontend/src/components/error-state.tsx`
- Create: `frontend/src/components/loading-state.tsx`
- Create: `frontend/src/app/page.test.tsx`

**Step 1: Write failing page integration test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Dashboard page", () => {
  it("shows workers comp dashboard title", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /workers' compensation predictive dashboard/i })).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify failure**

Run: `cd frontend && pnpm test -- --run src/app/page.test.tsx`
Expected: FAIL until composition is complete.

**Step 3: Implement UX states**
- Add loading skeletons and API error surfaces.
- Ensure dashboard updates all charts/KPIs on filter/scenario changes.

**Step 4: Run integration test**

Run: `cd frontend && pnpm test -- --run src/app/page.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/app/page.tsx frontend/src/components/error-state.tsx frontend/src/components/loading-state.tsx frontend/src/app/page.test.tsx
git commit -m "feat(frontend): finalize dashboard integration with loading and error states"
```

### Task 11: Verification and documentation updates

**Files:**
- Modify: `README.md`
- Modify: `backend/README.md`
- Modify: `frontend/README.md`

**Step 1: Run full backend verification**

Run: `cd backend && uv run pytest -v`
Expected: PASS all backend tests.

**Step 2: Run frontend verification**

Run: `cd frontend && pnpm lint && pnpm test -- --run && pnpm build`
Expected: all PASS.

**Step 3: Update docs**
- Add demo run instructions (start backend + frontend).
- Document available endpoints and sample curl calls.
- Document scenario controls and data assumptions.

**Step 4: Run final repo checks**

Run: `uv run pre-commit run --all-files`
Expected: PASS.

**Step 5: Commit**

```bash
git add README.md backend/README.md frontend/README.md
git commit -m "docs: add workers comp dashboard runbook and API usage"
```
