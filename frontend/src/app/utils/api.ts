import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
});

export type SegmentsResponse = {
  states: string[];
  industries: string[];
  claim_types: string[];
};

export type ClaimsPoint = {
  month: string;
  claims_count_actual: number | null;
  claims_count_forecast: number;
  claims_ci_low: number;
  claims_ci_high: number;
};

export type CostsPoint = {
  month: string;
  paid_amount_actual: number | null;
  paid_amount_forecast: number;
  avg_cost_per_claim: number;
  paid_ci_low: number;
  paid_ci_high: number;
};

export type MetadataResponse = {
  model_name: string;
  actual_start?: string;
  actual_end?: string;
  forecast_end?: string;
  mae: number;
  rmse: number;
  mape: number;
  assumptions_json: Record<string, string>;
};

/** Matches FastAPI `ForecastSummaryResponse` (deterministic GET). */
export type ForecastSummaryResponse = {
  headline: string;
  bullets: string[];
  segment_label: string;
  chart_from: string;
  chart_to: string;
  model_name: string;
  train_window: string;
  actual_data_end: string;
  api_forecast_end: string;
  historical_months_in_chart: number;
  forecast_months_in_chart: number;
  last_actual_month: string | null;
  last_actual_claims: number | null;
  mean_monthly_forecast_claims: number | null;
};

/** Matches FastAPI `ForecastSummaryLLMResponse` — OpenAI narrative + metadata. */
export type ForecastSummaryLLMResponse = {
  narrative: string;
  source: "openai" | "fallback" | "no_data";
  llm_model: string | null;
  notice: string | null;
  segment_label: string;
  chart_from: string;
  chart_to: string;
  insurance_forecast_model: string;
  train_window: string;
  actual_data_end: string;
};

export type ApiSeriesResponse<T> = { series: T[] };

export type ScenarioRequest = {
  from: string;
  to: string;
  state: string;
  industry: string;
  claim_type: string;
  severity_inflation_pct: number;
  frequency_shock_pct: number;
};

/** One row from POST /scenario/recalculate (includes adjusted claims + costs). */
export type ScenarioPoint = {
  month: string;
  claims_count_forecast: number;
  claims_ci_low: number;
  claims_ci_high: number;
  paid_amount_forecast: number;
  avg_cost_per_claim: number;
  paid_ci_low: number;
  paid_ci_high: number;
};

export async function getSegments(): Promise<SegmentsResponse> {
  const { data } = await api.get<SegmentsResponse>("/segments");
  return data;
}

export async function getClaimsSeries(params: {
  from: string;
  to: string;
  state: string;
  industry: string;
  claim_type: string;
}): Promise<ClaimsPoint[]> {
  const { data } = await api.get<ApiSeriesResponse<ClaimsPoint>>(
    "/series/claims",
    { params },
  );
  return data.series;
}

export async function getCostsSeries(params: {
  from: string;
  to: string;
  state: string;
  industry: string;
  claim_type: string;
}): Promise<CostsPoint[]> {
  const { data } = await api.get<ApiSeriesResponse<CostsPoint>>(
    "/series/costs",
    { params },
  );
  return data.series;
}

export async function getModelMetadata(): Promise<MetadataResponse> {
  const { data } = await api.get<MetadataResponse>("/model/metadata");
  return data;
}

export async function getForecastSummary(params: {
  from: string;
  to: string;
  state: string;
  industry: string;
  claim_type: string;
}): Promise<ForecastSummaryResponse> {
  const { data } = await api.get<ForecastSummaryResponse>(
    "/series/forecast-summary",
    {
      params,
    },
  );
  return data;
}

/** Calls OpenAI on the server using merged claims + cost rows (same window as charts). */
export async function postForecastSummaryLLM(body: {
  from: string;
  to: string;
  state: string;
  industry: string;
  claim_type: string;
}): Promise<ForecastSummaryLLMResponse> {
  const { data } = await api.post<ForecastSummaryLLMResponse>(
    "/ai/forecast-summary",
    body,
  );
  return data;
}

export async function recalculateScenario(
  payload: ScenarioRequest,
): Promise<ScenarioPoint[]> {
  const { data } = await api.post<ApiSeriesResponse<ScenarioPoint>>(
    "/scenario/recalculate",
    payload,
  );
  return data.series;
}

export default api;
