# Workers' Compensation Predictive Dashboard Design

Date: 2026-03-04
Status: Approved
Scope: Business demo using public + synthetic data

## 1. Goal
Build a single-page insurance dashboard focused on workers' compensation predictive analytics. The dashboard should forecast monthly claim counts and paid volumes while providing model transparency for business stakeholders.

## 2. Product Scope
- Demo type: business demo
- Forecast cadence: monthly
- Segmentation: state + industry + claim type
- Modeling style: transparent statistical model (SARIMAX primary)

## 3. Architecture
### Frontend (SPA)
Single dashboard page in existing frontend app with global filters and interactive visualizations.

### Backend API
Provide REST endpoints for segmented time series, model metadata, and scenario recalculation.

### Data Layer
- Public frequency sources for injury/claim trend proxies.
- Synthetic severity/cost generation for paid amounts.
- Precomputed artifacts (CSV/Parquet) for fast local demo performance.

### Modeling Layer
- SARIMAX for monthly forecast generation by segment.
- Confidence intervals, holdout metrics, and residual diagnostics.

## 4. Dashboard Features
### KPI Row
- Predicted Claims (next 3 months)
- Predicted Paid Amount (next 3 months)
- YoY Change in Claims
- Predicted Avg Cost per Claim

### Core Visualizations
- Monthly Claims: Actual vs Forecast (+ confidence band)
- Monthly Paid Amount: Actual vs Forecast (+ confidence band)
- Seasonality Heatmap (month x year)
- Segment Contribution (stacked bars by state/industry/claim type)

### Transparency Panel
- Model type and selected parameters
- Holdout metrics: MAE, MAPE, RMSE
- Residual diagnostics summary

### Scenario Controls
- Severity inflation slider (0% to +20%)
- Frequency shock slider (-10% to +25%)
- Recompute affected KPI and forecast series in near real-time

### Assumptions Drawer
- Public vs synthetic component labeling
- Last data refresh timestamp
- Synthetic severity assumptions

## 5. Data Model
### monthly_claims
- month (YYYY-MM)
- state
- industry
- claim_type
- claims_count_actual
- claims_count_forecast
- claims_ci_low
- claims_ci_high

### monthly_costs
- month (YYYY-MM)
- state
- industry
- claim_type
- paid_amount_actual
- paid_amount_forecast
- paid_ci_low
- paid_ci_high
- avg_cost_per_claim

### model_run_metadata
- run_id
- trained_at
- train_window
- forecast_horizon
- model_name
- model_params
- mae
- mape
- rmse
- assumptions_json

## 6. API Contract
### GET /api/v1/segments
Returns valid filter dimensions: states, industries, claim_types.

### GET /api/v1/series/claims
Query params: from, to, state, industry, claim_type.
Returns historical and forecast claims series with confidence intervals.

### GET /api/v1/series/costs
Query params: from, to, state, industry, claim_type.
Returns historical and forecast paid amounts with confidence intervals and average cost per claim.

### GET /api/v1/model/metadata
Returns model diagnostics, selected parameters, and assumptions.

### POST /api/v1/scenario/recalculate
Body: severity_inflation_pct, frequency_shock_pct, and optional filters.
Returns scenario-adjusted forecast slices and KPI impacts.

## 7. Modeling Design
### Claims Forecast
- Aggregate monthly per segment.
- Fit SARIMAX with annual seasonality (period 12).
- Optional exogenous factors can be added later.

### Cost Forecast
- Predicted paid amount = predicted claims * predicted average severity.
- Model severity per segment via transparent parametric distribution (lognormal or gamma).
- Scenario controls adjust frequency and severity multipliers directly.

### Backtesting
- Time-based holdout (last 12 months).
- Persist MAE, MAPE, RMSE and diagnostic summaries.

## 8. Acceptance Criteria
1. Dashboard loads locally in about 2 seconds on demo data.
2. All global filters update every chart and KPI consistently.
3. Claims and costs views show historical + forecast + confidence intervals.
4. Scenario recalculation API responds in under 500 ms on local artifacts.
5. Metadata panel shows model metrics and assumptions clearly.
6. Assumptions drawer explicitly labels public and synthetic data components.

## 9. Suggested Public Data Sources
- OSHA Severe Injury Reports: https://www.osha.gov/severe-injury-reports
- OSHA Data Portal: https://www.osha.gov/data
- BLS IIF Data: https://www.bls.gov/iif/data.htm
- BLS SOII Overview: https://www.bls.gov/iif/overview/soii-overview.htm
- Oregon Workers' Comp Claims Catalog: https://catalog.data.gov/dataset/workers-compensation-claims-data
- CDC WISQARS Cost Tools: https://wisqars.cdc.gov/cost

## 10. Out of Scope (Demo)
- Production ETL orchestration
- Automated model retraining pipeline
- AuthN/AuthZ and multi-tenant controls
- Regulatory reporting workflows
