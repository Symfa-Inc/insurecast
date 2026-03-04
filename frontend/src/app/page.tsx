"use client";

import { useEffect, useMemo, useState } from "react";

type SegmentsResponse = {
  states: string[];
  industries: string[];
  claim_types: string[];
};

type ClaimsPoint = {
  month: string;
  claims_count_actual: number | null;
  claims_count_forecast: number;
  claims_ci_low: number;
  claims_ci_high: number;
};

type CostsPoint = {
  month: string;
  paid_amount_actual: number | null;
  paid_amount_forecast: number;
  avg_cost_per_claim: number;
  paid_ci_low: number;
  paid_ci_high: number;
};

type MetadataResponse = {
  model_name: string;
  mae: number;
  rmse: number;
  mape: number;
  assumptions_json: Record<string, string>;
};

type ApiSeriesResponse<T> = { series: T[] };

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatInt(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value,
  );
}

function MiniSparkline({
  values,
  stroke,
}: {
  values: number[];
  stroke: string;
}) {
  const width = 420;
  const height = 120;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sparkline" role="img">
      <polyline fill="none" stroke={stroke} strokeWidth="3" points={points} />
    </svg>
  );
}

export default function Home() {
  const [segments, setSegments] = useState<SegmentsResponse | null>(null);
  const [state, setState] = useState("CA");
  const [industry, setIndustry] = useState("Construction");
  const [claimType, setClaimType] = useState("LostTime");
  const [fromMonth, setFromMonth] = useState("2023-01");
  const [toMonth, setToMonth] = useState("2026-12");
  const [severityInflation, setSeverityInflation] = useState(0);
  const [frequencyShock, setFrequencyShock] = useState(0);
  const [claims, setClaims] = useState<ClaimsPoint[]>([]);
  const [costs, setCosts] = useState<CostsPoint[]>([]);
  const [scenarioCosts, setScenarioCosts] = useState<CostsPoint[] | null>(null);
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () =>
      new URLSearchParams({
        from: fromMonth,
        to: toMonth,
        state,
        industry,
        claim_type: claimType,
      }).toString(),
    [claimType, fromMonth, industry, state, toMonth],
  );

  useEffect(() => {
    async function loadSegments() {
      const response = await fetch(`${API_BASE_URL}/api/v1/segments`);
      if (!response.ok) {
        throw new Error("Failed to load segments.");
      }
      const payload = (await response.json()) as SegmentsResponse;
      setSegments(payload);
      setState(payload.states[0] ?? "CA");
      setIndustry(payload.industries[0] ?? "Construction");
      setClaimType(payload.claim_types[0] ?? "LostTime");
    }
    void loadSegments().catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Unknown error");
    });
  }, []);

  useEffect(() => {
    if (!segments) {
      return;
    }
    async function loadData() {
      setLoading(true);
      setError(null);
      const [claimsResponse, costsResponse, metadataResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/series/claims?${query}`),
        fetch(`${API_BASE_URL}/api/v1/series/costs?${query}`),
        fetch(`${API_BASE_URL}/api/v1/model/metadata`),
      ]);
      if (!claimsResponse.ok || !costsResponse.ok || !metadataResponse.ok) {
        throw new Error("Failed to load dashboard data.");
      }
      const claimsPayload =
        (await claimsResponse.json()) as ApiSeriesResponse<ClaimsPoint>;
      const costsPayload =
        (await costsResponse.json()) as ApiSeriesResponse<CostsPoint>;
      const metadataPayload = (await metadataResponse.json()) as MetadataResponse;

      setClaims(claimsPayload.series);
      setCosts(costsPayload.series);
      setMetadata(metadataPayload);
      setScenarioCosts(null);
      setLoading(false);
    }

    void loadData().catch((loadError: unknown) => {
      setLoading(false);
      setError(loadError instanceof Error ? loadError.message : "Unknown error");
    });
  }, [query, segments]);

  const displayedCosts = scenarioCosts ?? costs;
  const claimsValues = claims.map((point) => point.claims_count_forecast);
  const costsValues = displayedCosts.map((point) => point.paid_amount_forecast);

  const kpis = useMemo(() => {
    const forecastClaims3m = claims.slice(-3).reduce((sum, p) => sum + p.claims_count_forecast, 0);
    const forecastPaid3m = displayedCosts
      .slice(-3)
      .reduce((sum, p) => sum + p.paid_amount_forecast, 0);
    const avgCost = forecastClaims3m > 0 ? forecastPaid3m / forecastClaims3m : 0;
    const lastYear = claims.slice(-15, -3).reduce((sum, p) => sum + p.claims_count_forecast, 0);
    const yoy = lastYear > 0 ? ((forecastClaims3m - lastYear) / lastYear) * 100 : 0;
    return { forecastClaims3m, forecastPaid3m, avgCost, yoy };
  }, [claims, displayedCosts]);

  async function applyScenario() {
    const response = await fetch(`${API_BASE_URL}/api/v1/scenario/recalculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromMonth,
        to: toMonth,
        state,
        industry,
        claim_type: claimType,
        severity_inflation_pct: severityInflation,
        frequency_shock_pct: frequencyShock,
      }),
    });
    if (!response.ok) {
      setError("Scenario recalculation failed.");
      return;
    }
    const payload = (await response.json()) as ApiSeriesResponse<{
      month: string;
      paid_amount_forecast: number;
      avg_cost_per_claim: number;
      paid_ci_low: number;
      paid_ci_high: number;
    }>;
    const scenarioSeries: CostsPoint[] = payload.series.map((point) => ({
      month: point.month,
      paid_amount_actual: null,
      paid_amount_forecast: point.paid_amount_forecast,
      avg_cost_per_claim: point.avg_cost_per_claim,
      paid_ci_low: point.paid_ci_low,
      paid_ci_high: point.paid_ci_high,
    }));
    setScenarioCosts(scenarioSeries);
  }

  return (
    <main className="dashboard">
      <header className="hero">
        <p className="eyebrow">Insurecast Demo</p>
        <h1>Workers&apos; Compensation Predictive Dashboard</h1>
        <p>
          Monthly claims and paid-volume forecasting with transparent statistical
          assumptions.
        </p>
      </header>

      <section className="filters">
        <label>
          State
          <select value={state} onChange={(event) => setState(event.target.value)}>
            {(segments?.states ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label>
          Industry
          <select
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
          >
            {(segments?.industries ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label>
          Claim Type
          <select
            value={claimType}
            onChange={(event) => setClaimType(event.target.value)}
          >
            {(segments?.claim_types ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input
            type="month"
            value={fromMonth}
            onChange={(event) => setFromMonth(event.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="month"
            value={toMonth}
            onChange={(event) => setToMonth(event.target.value)}
          />
        </label>
      </section>

      {loading && <p className="state">Loading dashboard data...</p>}
      {error && <p className="state error">{error}</p>}

      {!loading && !error && (
        <>
          <section className="kpis">
            <article>
              <h2>Predicted Claims (next 3m)</h2>
              <p>{formatInt(kpis.forecastClaims3m)}</p>
            </article>
            <article>
              <h2>Predicted Paid (next 3m)</h2>
              <p>{formatCurrency(kpis.forecastPaid3m)}</p>
            </article>
            <article>
              <h2>Avg Cost per Claim</h2>
              <p>{formatCurrency(kpis.avgCost)}</p>
            </article>
            <article>
              <h2>YoY Claims Change</h2>
              <p>{kpis.yoy.toFixed(1)}%</p>
            </article>
          </section>

          <section className="charts">
            <article>
              <h2>Monthly Claims Forecast</h2>
              <MiniSparkline values={claimsValues} stroke="#003f5c" />
            </article>
            <article>
              <h2>Monthly Paid Amount Forecast</h2>
              <MiniSparkline values={costsValues} stroke="#bc5090" />
            </article>
          </section>

          <section className="scenario">
            <h2>Scenario Controls</h2>
            <div className="scenario-grid">
              <label>
                Severity Inflation: {severityInflation}%
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={severityInflation}
                  onChange={(event) =>
                    setSeverityInflation(Number(event.target.value))
                  }
                />
              </label>
              <label>
                Frequency Shock: {frequencyShock}%
                <input
                  type="range"
                  min={-10}
                  max={25}
                  value={frequencyShock}
                  onChange={(event) =>
                    setFrequencyShock(Number(event.target.value))
                  }
                />
              </label>
              <button onClick={() => void applyScenario()} type="button">
                Apply Scenario
              </button>
            </div>
          </section>

          <section className="metadata">
            <h2>Model Transparency</h2>
            <p>
              Model: <strong>{metadata?.model_name}</strong>
            </p>
            <p>
              MAE: {metadata?.mae} | RMSE: {metadata?.rmse} | MAPE:{" "}
              {metadata?.mape}%
            </p>
            <p>
              Assumptions:{" "}
              {Object.entries(metadata?.assumptions_json ?? {})
                .map(([key, value]) => `${key}=${value}`)
                .join(", ")}
            </p>
          </section>
        </>
      )}
    </main>
  );
}
