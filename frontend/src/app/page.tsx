"use client";

import { useEffect, useMemo, useState } from "react";
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
import { formatCurrency, formatNumber, monthToLabel } from "./utils/format";
import { DashboardHeader } from "./ui/dashboard-header";
import { ForecastChart, type ForecastChartPoint } from "./ui/forecast-chart";
import { ModelMetadata } from "./ui/model-metadata";
import { MonthlyTable, type MonthlyRow } from "./ui/monthly-table";
import { ScenarioPanel } from "./ui/scenario-panel";

export default function Home() {
  const [segments, setSegments] = useState<SegmentsResponse | null>(null);
  const [stateValue, setStateValue] = useState("CA");
  const [industry, setIndustry] = useState("Construction");
  const [claimType, setClaimType] = useState("LostTime");
  const [fromMonth, setFromMonth] = useState("2019-01");
  const [toMonth, setToMonth] = useState("2026-12");
  const [forecastPeriod, setForecastPeriod] = useState("3");
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

  const claimsChartData = useMemo<ForecastChartPoint[]>(
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

  const costsChartData = useMemo<ForecastChartPoint[]>(
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
    <main className="mx-auto max-w-[1400px] space-y-4 px-4 py-6 text-indigo-950/90 md:px-6 md:py-8 md:space-y-5 lg:px-8">
      <DashboardHeader
        segments={segments}
        stateValue={stateValue}
        setStateValue={setStateValue}
        industry={industry}
        setIndustry={setIndustry}
        claimType={claimType}
        setClaimType={setClaimType}
        fromMonth={fromMonth}
        setFromMonth={setFromMonth}
        toMonth={toMonth}
        setToMonth={setToMonth}
        forecastPeriod={forecastPeriod}
        setForecastPeriod={setForecastPeriod}
      />

      <ScenarioPanel
        severityInflation={severityInflation}
        setSeverityInflation={setSeverityInflation}
        frequencyShock={frequencyShock}
        setFrequencyShock={setFrequencyShock}
        onApplyScenario={applyScenario}
        loading={loading}
        error={error}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <ForecastChart
          title="Amount of Claims per Month"
          description="Last 12 months: current line, forecast points, and confidence band."
          data={claimsChartData}
          valueFormatter={formatNumber}
        />
        <ForecastChart
          title="Paid Amount for Claims per Month"
          description="Last 12 months: current line, forecast points, and confidence band."
          data={costsChartData}
          valueFormatter={formatCurrency}
        />
      </section>

      <MonthlyTable rows={monthlyRows} />
      <ModelMetadata metadata={metadata} />
    </main>
  );
}
