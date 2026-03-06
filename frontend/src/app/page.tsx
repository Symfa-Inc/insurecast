"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getClaimsSeries,
  getCostsSeries,
  getModelMetadata,
  getSegments,
  recalculateScenario,
  type ClaimsPoint,
  type CostsPoint,
  type MetadataResponse,
  type SegmentsResponse,
} from "./utils/api";

type MonthlyRow = {
  month: string;
  claims: number;
  paid: number;
  avgCost: number;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function monthToLabel(month: string): string {
  const date = new Date(`${month}-01T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function Home() {
  const [segments, setSegments] = useState<SegmentsResponse | null>(null);
  const [stateValue, setStateValue] = useState("CA");
  const [industry, setIndustry] = useState("Construction");
  const [claimType, setClaimType] = useState("LostTime");
  const [fromMonth, setFromMonth] = useState("2019-01");
  const [toMonth, setToMonth] = useState("2026-12");
  const [severityInflation, setSeverityInflation] = useState(0);
  const [frequencyShock, setFrequencyShock] = useState(0);
  const [claims, setClaims] = useState<ClaimsPoint[]>([]);
  const [costs, setCosts] = useState<CostsPoint[]>([]);
  const [scenarioCosts, setScenarioCosts] = useState<CostsPoint[] | null>(null);
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const seriesParams = useMemo(
    () => ({
      from: fromMonth,
      to: toMonth,
      state: stateValue,
      industry,
      claim_type: claimType,
    }),
    [claimType, fromMonth, industry, stateValue, toMonth],
  );

  useEffect(() => {
    async function loadSegments() {
      const payload = await getSegments();
      setSegments(payload);
      setStateValue(payload.states[0] ?? "CA");
      setIndustry(payload.industries[0] ?? "Construction");
      setClaimType(payload.claim_types[0] ?? "LostTime");
    }

    void loadSegments().catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Unknown error");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!segments) {
      return;
    }

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [claimsPayload, costsPayload, metadataPayload] = await Promise.all([
          getClaimsSeries(seriesParams),
          getCostsSeries(seriesParams),
          getModelMetadata(),
        ]);
        setClaims(claimsPayload);
        setCosts(costsPayload);
        setMetadata(metadataPayload);
        setScenarioCosts(null);
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [segments, seriesParams]);

  const displayedCosts = scenarioCosts ?? costs;
  const latestActualClaimIndex = claims.reduce(
    (lastIndex, point, index) => (point.claims_count_actual !== null ? index : lastIndex),
    -1,
  );
  const fallbackForecastStart = Math.max(0, claims.length - 3);
  const effectiveCurrentEnd = latestActualClaimIndex >= 0 ? latestActualClaimIndex : fallbackForecastStart - 1;
  const effectiveForecastStart = Math.max(0, effectiveCurrentEnd);
  const effectiveForecastEnd = Math.min(claims.length - 1, effectiveForecastStart + 2);
  const chartWindowStart = Math.max(0, effectiveCurrentEnd - 8);
  const chartWindowEnd = effectiveForecastEnd;

  const claimsChartData = useMemo(
    () =>
      claims.slice(chartWindowStart, chartWindowEnd + 1).map((point, offset) => {
        const index = chartWindowStart + offset;
        const isForecast = index >= effectiveForecastStart && index <= effectiveForecastEnd;
        const currentValue =
          index <= effectiveCurrentEnd
            ? (point.claims_count_actual ?? point.claims_count_forecast)
            : null;
        return {
          month: monthToLabel(point.month),
          currentData: currentValue,
          forecast: isForecast ? point.claims_count_forecast : null,
          forecastCiLow: isForecast ? point.claims_ci_low : null,
          forecastCiRange: isForecast ? point.claims_ci_high - point.claims_ci_low : null,
        };
      }),
    [
      chartWindowEnd,
      chartWindowStart,
      claims,
      effectiveCurrentEnd,
      effectiveForecastEnd,
      effectiveForecastStart,
    ],
  );

  const costsChartData = useMemo(
    () =>
      displayedCosts.slice(chartWindowStart, chartWindowEnd + 1).map((point, offset) => {
        const index = chartWindowStart + offset;
        const isForecast = index >= effectiveForecastStart && index <= effectiveForecastEnd;
        const currentValue =
          index <= effectiveCurrentEnd
            ? (point.paid_amount_actual ?? point.paid_amount_forecast)
            : null;
        return {
          month: monthToLabel(point.month),
          currentData: currentValue,
          forecast: isForecast ? point.paid_amount_forecast : null,
          forecastCiLow: isForecast ? point.paid_ci_low : null,
          forecastCiRange: isForecast ? point.paid_ci_high - point.paid_ci_low : null,
        };
      }),
    [
      chartWindowEnd,
      chartWindowStart,
      displayedCosts,
      effectiveCurrentEnd,
      effectiveForecastEnd,
      effectiveForecastStart,
    ],
  );

  const monthlyRows = useMemo<MonthlyRow[]>(() => {
    return displayedCosts
      .map((costPoint) => {
        const claimPoint = claims.find((entry) => entry.month === costPoint.month);
        if (!claimPoint) {
          return null;
        }
        return {
          month: costPoint.month,
          claims: claimPoint.claims_count_forecast,
          paid: costPoint.paid_amount_forecast,
          avgCost: costPoint.avg_cost_per_claim,
        };
      })
      .filter((row): row is MonthlyRow => row !== null)
      .slice(-8)
      .reverse();
  }, [claims, displayedCosts]);

  async function applyScenario() {
    try {
      const scenarioSeries = await recalculateScenario({
        ...seriesParams,
        severity_inflation_pct: severityInflation,
        frequency_shock_pct: frequencyShock,
      });
      const mappedScenarioCosts: CostsPoint[] = scenarioSeries.map((point) => ({
        month: point.month,
        paid_amount_actual: null,
        paid_amount_forecast: point.paid_amount_forecast,
        avg_cost_per_claim: point.avg_cost_per_claim,
        paid_ci_low: point.paid_ci_low,
        paid_ci_high: point.paid_ci_high,
      }));
      setScenarioCosts(mappedScenarioCosts);
      setError(null);
    } catch {
      setError("Scenario recalculation failed.");
    }
  }

  return (
    <main className="mx-auto max-w-[1400px] px-3 py-4 text-slate-700 md:px-4 md:py-5">
      <section className="rounded-[28px] bg-gradient-to-r from-[#0f4da4] via-[#0d3f8a] to-[#0d4ca5] p-4 text-white shadow-xl">
        <p className="text-3xl font-semibold leading-tight">Insurecast forecasting dashboard</p>
        <p className="mt-1 text-sm text-blue-100">Claims and paid amount trends by segment</p>

        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <label className="text-sm font-semibold text-blue-50">
            State
            <select
              value={stateValue}
              onChange={(event) => setStateValue(event.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-200/40 bg-white px-2.5 py-2 text-slate-700"
            >
              {(segments?.states ?? []).map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-blue-50">
            Industry
            <select
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-200/40 bg-white px-2.5 py-2 text-slate-700"
            >
              {(segments?.industries ?? []).map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-blue-50">
            Claim Type
            <select
              value={claimType}
              onChange={(event) => setClaimType(event.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-200/40 bg-white px-2.5 py-2 text-slate-700"
            >
              {(segments?.claim_types ?? []).map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-blue-50">
            From
            <input
              type="month"
              value={fromMonth}
              onChange={(event) => setFromMonth(event.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-200/40 bg-white px-2.5 py-2 text-slate-700"
            />
          </label>
          <label className="text-sm font-semibold text-blue-50">
            To
            <input
              type="month"
              value={toMonth}
              onChange={(event) => setToMonth(event.target.value)}
              className="mt-1 w-full rounded-lg border border-blue-200/40 bg-white px-2.5 py-2 text-slate-700"
            />
          </label>
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-[#c7d5e7] bg-[#e9eef5] p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="text-sm font-semibold text-slate-600">
            Severity Inflation: {severityInflation}%
            <input
              type="range"
              min={0}
              max={20}
              value={severityInflation}
              onChange={(event) => setSeverityInflation(Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Frequency Shock: {frequencyShock}%
            <input
              type="range"
              min={-10}
              max={25}
              value={frequencyShock}
              onChange={(event) => setFrequencyShock(Number(event.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <button
            type="button"
            onClick={() => void applyScenario()}
            className="h-11 rounded-xl bg-[#0d4ca5] px-5 text-sm font-semibold text-white hover:bg-[#0d438f]"
          >
            Apply Scenario
          </button>
        </div>

        {loading && <p className="mt-3 rounded-lg bg-blue-100 px-3 py-2 text-sm">Loading dashboard data...</p>}
        {error && <p className="mt-3 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</p>}
      </section>

      <section className="mt-3 grid gap-3 xl:grid-cols-2">
        <article className="rounded-2xl border border-[#c7d5e7] bg-[#e9eef5] p-4">
          <h2 className="text-3xl font-semibold text-slate-700">Amount of Claims per Month</h2>
          <p className="mt-1 text-sm text-slate-500">Last 12 months: current line, forecast points, and confidence band.</p>
          <div className="mt-3 h-64 min-w-0 rounded-xl bg-white/70 p-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
              <ComposedChart data={claimsChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7deea" />
                <XAxis
                  dataKey="month"
                  interval={0}
                  minTickGap={0}
                  tick={{ fill: "#5f6d82", fontSize: 12 }}
                />
                <YAxis tick={{ fill: "#5f6d82", fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [formatNumber(value), name]}
                  contentStyle={{ borderRadius: 10, borderColor: "#d2dbea" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="forecastCiLow"
                  stackId="claimsBand"
                  stroke="none"
                  fillOpacity={0}
                  legendType="none"
                />
                <Area
                  type="monotone"
                  dataKey="forecastCiRange"
                  stackId="claimsBand"
                  stroke="none"
                  fill="#f6bd6b"
                  fillOpacity={0.28}
                  name="Forecast CI"
                />
                <Line
                  type="monotone"
                  dataKey="currentData"
                  name="Current data"
                  stroke="#2d8fe5"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast"
                  stroke="#f1a53a"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: "#f1a53a", strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-[#c7d5e7] bg-[#e9eef5] p-4">
          <h2 className="text-3xl font-semibold text-slate-700">Paid Amount for Claims per Month</h2>
          <p className="mt-1 text-sm text-slate-500">Last 12 months: current line, forecast points, and confidence band.</p>
          <div className="mt-3 h-64 min-w-0 rounded-xl bg-white/70 p-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
              <ComposedChart data={costsChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7deea" />
                <XAxis
                  dataKey="month"
                  interval={0}
                  minTickGap={0}
                  tick={{ fill: "#5f6d82", fontSize: 12 }}
                />
                <YAxis tick={{ fill: "#5f6d82", fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  contentStyle={{ borderRadius: 10, borderColor: "#d2dbea" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="forecastCiLow"
                  stackId="costsBand"
                  stroke="none"
                  fillOpacity={0}
                  legendType="none"
                />
                <Area
                  type="monotone"
                  dataKey="forecastCiRange"
                  stackId="costsBand"
                  stroke="none"
                  fill="#f6bd6b"
                  fillOpacity={0.28}
                  name="Forecast CI"
                />
                <Line
                  type="monotone"
                  dataKey="currentData"
                  name="Current data"
                  stroke="#2d8fe5"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast"
                  stroke="#f1a53a"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: "#f1a53a", strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="mt-3 overflow-hidden rounded-2xl border border-[#c7d5e7] bg-[#f1f4f9] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full table-fixed text-sm">
            <thead className="bg-[#e1e8f2] text-slate-700">
              <tr>
                <th className="w-1/4 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Month</th>
                <th className="w-1/4 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Claims</th>
                <th className="w-1/4 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Paid Amount</th>
                <th className="w-1/4 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">Avg Cost per Claim</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRows.map((row) => (
                <tr key={row.month} className="border-t border-[#d4deea]">
                  <td className="w-1/4 px-3 py-2 font-semibold text-slate-700">{monthToLabel(row.month)}</td>
                  <td className="w-1/4 px-3 py-2">{formatNumber(row.claims)}</td>
                  <td className="w-1/4 px-3 py-2">{formatCurrency(row.paid)}</td>
                  <td className="w-1/4 px-3 py-2">{formatCurrency(row.avgCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-[#c7d5e7] bg-[#e9eef5] px-4 py-3 text-sm text-slate-600">
        Model: <span className="font-semibold">{metadata?.model_name ?? "N/A"}</span> | MAE: {metadata?.mae ?? "-"} |
        RMSE: {metadata?.rmse ?? "-"} | MAPE: {metadata?.mape ?? "-"}%
      </section>
    </main>
  );
}
