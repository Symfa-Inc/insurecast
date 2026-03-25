"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getClaimsSeries,
  getCostsSeries,
  getModelMetadata,
  getSegments,
  postForecastSummaryLLM,
  recalculateScenario,
  type ClaimsPoint,
  type CostsPoint,
  type ForecastSummaryLLMResponse,
  type MetadataResponse,
  type ScenarioPoint,
  type SegmentsResponse,
} from "./utils/api";
import { rawSeriesHasPlottableChartData } from "./utils/chart-display-guard";
import {
  addMonths,
  compareMonths,
  formatCurrency,
  formatNumber,
  monthToLabel,
} from "./utils/format";
import { DashboardHeader } from "./ui/dashboard-header";
import { ForecastSummaryPanel } from "./ui/forecast-summary-panel";
import { SmoothSummaryStack } from "./ui/smooth-summary-stack";
import {
  chartHasDisplayableData,
  ForecastChart,
  type ForecastChartPoint,
} from "./ui/forecast-chart";
import { MonthlyTable, type MonthlyRow } from "./ui/monthly-table";
import { ScenarioPanel } from "./ui/scenario-panel";

const MAX_SAFE_COST = 1e6;

/** Forecast months use scenario claims/CIs; historical actuals stay from baseline API. */
function mergeClaimsWithScenario(
  baseline: ClaimsPoint[],
  scenario: ScenarioPoint[] | null,
): ClaimsPoint[] {
  if (!scenario?.length) {
    return baseline;
  }
  const byMonth = new Map(scenario.map((p) => [p.month, p]));
  return baseline.map((c) => {
    if (c.claims_count_actual != null) {
      return c;
    }
    const s = byMonth.get(c.month);
    if (!s) {
      return c;
    }
    return {
      ...c,
      claims_count_forecast: s.claims_count_forecast,
      claims_ci_low: s.claims_ci_low,
      claims_ci_high: s.claims_ci_high,
    };
  });
}

export default function Home() {
  const [segments, setSegments] = useState<SegmentsResponse | null>(null);
  const [stateValue, setStateValue] = useState("CA");
  const [industry, setIndustry] = useState("Construction");
  const [claimType, setClaimType] = useState("LostTime");
  const [fromMonth, setFromMonth] = useState("2019-01");
  const [forecastPeriod, setForecastPeriod] = useState("3");
  const [claims, setClaims] = useState<ClaimsPoint[]>([]);
  const [costs, setCosts] = useState<CostsPoint[]>([]);
  /** Full scenario API series; drives adjusted costs + merged forecast claims. */
  const [scenarioSeries, setScenarioSeries] = useState<ScenarioPoint[] | null>(
    null,
  );
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [forecastSummary, setForecastSummary] =
    useState<ForecastSummaryLLMResponse | null>(null);
  /** Drives summary panel: clear stale text while fetching; show distinct AI vs chart loading. */
  const [summaryLoadPhase, setSummaryLoadPhase] = useState<
    "idle" | "charts" | "llm"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const forecastMonths = Math.max(1, parseInt(forecastPeriod, 10) || 3);
  const toMonth = useMemo(() => {
    if (metadata?.actual_end && metadata?.forecast_end) {
      const endWithForecast = addMonths(metadata.actual_end, forecastMonths);
      return compareMonths(endWithForecast, metadata.forecast_end) <= 0
        ? endWithForecast
        : metadata.forecast_end;
    }
    return addMonths(fromMonth, 24);
  }, [metadata?.actual_end, metadata?.forecast_end, forecastMonths, fromMonth]);

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
      setError(
        loadError instanceof Error ? loadError.message : "Unknown error",
      );
    });
  }, []);

  useEffect(() => {
    if (!segments) {
      return;
    }

    async function loadData() {
      setError(null);
      setForecastSummary(null);
      setSummaryLoadPhase("charts");
      try {
        const meta = await getModelMetadata();
        setMetadata(meta);
        const forecastMonthsNum = Math.max(
          1,
          parseInt(forecastPeriod, 10) || 3,
        );
        const computedTo =
          meta?.actual_end && meta?.forecast_end
            ? compareMonths(
                addMonths(meta.actual_end, forecastMonthsNum),
                meta.forecast_end,
              ) <= 0
              ? addMonths(meta.actual_end, forecastMonthsNum)
              : meta.forecast_end
            : addMonths(fromMonth, 24);
        const params = {
          from: fromMonth,
          to: computedTo,
          state: stateValue,
          industry,
          claim_type: claimType,
        };
        const [claimsPayload, costsPayload] = await Promise.all([
          getClaimsSeries(params),
          getCostsSeries(params),
        ]);
        setClaims(claimsPayload);
        setCosts(costsPayload);

        if (!rawSeriesHasPlottableChartData(claimsPayload, costsPayload)) {
          setForecastSummary({
            narrative:
              "There is no data for the charts with this selection. Try another segment or date range.",
            source: "no_data",
            llm_model: null,
            notice: null,
            segment_label: `${stateValue} · ${industry} · ${claimType}`,
            chart_from: fromMonth,
            chart_to: computedTo,
            insurance_forecast_model: "SARIMAX (1,1,1)×(1,1,1,12)",
            train_window:
              meta?.actual_start && meta?.actual_end
                ? `${meta.actual_start}..${meta.actual_end}`
                : "",
            actual_data_end: meta?.actual_end ?? "",
          });
        } else {
          setSummaryLoadPhase("llm");
          const summaryPayload = await postForecastSummaryLLM(params);
          setForecastSummary(summaryPayload);
        }
        setScenarioSeries(null);
      } catch (loadError: unknown) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load dashboard data.",
        );
        setForecastSummary(null);
      } finally {
        setSummaryLoadPhase("idle");
      }
    }

    void loadData();
  }, [segments, claimType, fromMonth, forecastPeriod, industry, stateValue]);

  const displayedCosts = useMemo(() => {
    if (!scenarioSeries?.length) {
      return costs;
    }
    const costsByMonth = new Map(costs.map((c) => [c.month, c]));
    const claimsByMonth = new Map(claims.map((c) => [c.month, c]));

    return scenarioSeries.map((point) => {
      const baselineCost = costsByMonth.get(point.month);
      const claimRow = claimsByMonth.get(point.month);
      // Historical months: keep real series averages & paid — scenario only adjusts forecast.
      if (
        baselineCost != null &&
        claimRow != null &&
        claimRow.claims_count_actual != null
      ) {
        return baselineCost;
      }

      const safeAvg =
        typeof point.avg_cost_per_claim === "number" &&
        isFinite(point.avg_cost_per_claim) &&
        point.avg_cost_per_claim >= 0 &&
        point.avg_cost_per_claim < MAX_SAFE_COST
          ? point.avg_cost_per_claim
          : 0;
      return {
        month: point.month,
        paid_amount_actual: null,
        paid_amount_forecast: point.paid_amount_forecast,
        avg_cost_per_claim: safeAvg,
        paid_ci_low: point.paid_ci_low,
        paid_ci_high: point.paid_ci_high,
      };
    });
  }, [scenarioSeries, costs, claims]);

  const displayedClaims = useMemo(
    () => mergeClaimsWithScenario(claims, scenarioSeries),
    [claims, scenarioSeries],
  );

  const hasActual = (p: ClaimsPoint) => p.claims_count_actual != null;

  const claimsChartData = useMemo<ForecastChartPoint[]>(() => {
    let lastHistoricalIndex = -1;
    for (let i = displayedClaims.length - 1; i >= 0; i--) {
      if (hasActual(displayedClaims[i])) {
        lastHistoricalIndex = i;
        break;
      }
    }
    return displayedClaims.map((point, index) => {
      const isHistorical = hasActual(point);
      const isForecast = !isHistorical;
      const currentData = isHistorical
        ? (point.claims_count_actual ?? point.claims_count_forecast)
        : null;
      const forecast = isForecast ? point.claims_count_forecast : null;
      const lineValue = currentData ?? forecast;

      const hasForecastCi = isForecast;
      let forecastCiLow: number | null = null;
      let forecastCiRange: number | null = null;
      if (hasForecastCi && lineValue != null) {
        let baseRange = point.claims_ci_high - point.claims_ci_low;
        if (!Number.isFinite(baseRange) || baseRange <= 0) {
          baseRange = Math.max(Math.abs(lineValue) * 0.24, 0.75);
        }
        const forecastIndex = Math.max(0, index - lastHistoricalIndex - 1);
        const widenFactor = 1 + 0.2 * forecastIndex;
        const halfSpread = (baseRange / 2) * widenFactor;
        forecastCiLow = Math.max(0, lineValue - halfSpread);
        forecastCiRange = 2 * halfSpread;
      }
      const ciBand: [number, number] | null =
        forecastCiLow != null && forecastCiRange != null
          ? [forecastCiLow, forecastCiLow + forecastCiRange]
          : null;
      const firstForecastIdx = lastHistoricalIndex + 1;
      const hasForecastBridge =
        lastHistoricalIndex >= 0 &&
        firstForecastIdx < displayedClaims.length &&
        !hasActual(displayedClaims[firstForecastIdx]);
      const solidBridge =
        hasForecastBridge &&
        lineValue != null &&
        (index === lastHistoricalIndex || index === firstForecastIdx)
          ? lineValue
          : null;
      return {
        month: monthToLabel(point.month),
        currentData: isHistorical ? currentData : null,
        forecast: isForecast ? forecast : null,
        lineValue,
        ciBand,
        solidBridge,
      };
    });
  }, [displayedClaims]);

  const avgCostChartData = useMemo<ForecastChartPoint[]>(() => {
    let lastHistoricalIndex = -1;
    for (let i = displayedClaims.length - 1; i >= 0; i--) {
      if (hasActual(displayedClaims[i])) {
        lastHistoricalIndex = i;
        break;
      }
    }
    return displayedCosts.map((point, index) => {
      const isHistorical =
        index <= lastHistoricalIndex && hasActual(displayedClaims[index] ?? {});
      const isForecast = !isHistorical;
      const claimPoint = displayedClaims[index];
      const claimsCount = claimPoint?.claims_count_forecast ?? 0;
      const rawAvg = claimsCount > 0 ? point.avg_cost_per_claim : 0;
      const avgCost =
        typeof rawAvg === "number" &&
        isFinite(rawAvg) &&
        rawAvg >= 0 &&
        rawAvg < MAX_SAFE_COST
          ? rawAvg
          : 0;
      const currentData = isHistorical ? avgCost : null;
      const forecast = isForecast ? avgCost : null;
      const lineValue = currentData ?? forecast;

      const hasForecastCi = isForecast;
      let forecastCiLow: number | null = null;
      let forecastCiRange: number | null = null;
      if (
        hasForecastCi &&
        lineValue != null &&
        lineValue > 0 &&
        lineValue < MAX_SAFE_COST
      ) {
        const halfSpread = lineValue * 0.1;
        const forecastIndex = Math.max(0, index - lastHistoricalIndex - 1);
        const widenFactor = 1 + 0.1 * forecastIndex;
        const scaledHalfSpread = halfSpread * widenFactor;
        forecastCiLow = Math.max(0, lineValue - scaledHalfSpread);
        forecastCiRange = 2 * scaledHalfSpread;
      }
      const ciBand: [number, number] | null =
        forecastCiLow != null && forecastCiRange != null
          ? [forecastCiLow, forecastCiLow + forecastCiRange]
          : null;
      const firstForecastIdx = lastHistoricalIndex + 1;
      const hasForecastBridge =
        lastHistoricalIndex >= 0 &&
        firstForecastIdx < displayedCosts.length &&
        !hasActual(displayedClaims[firstForecastIdx] ?? {});
      const solidBridge =
        hasForecastBridge &&
        lineValue != null &&
        (index === lastHistoricalIndex || index === firstForecastIdx)
          ? lineValue
          : null;
      return {
        month: monthToLabel(point.month),
        currentData: isHistorical ? currentData : null,
        forecast: isForecast ? forecast : null,
        lineValue,
        ciBand,
        solidBridge,
      };
    });
  }, [displayedClaims, displayedCosts]);

  /** Match charts: if neither series has displayable points, table shows "No data" (not rows with zeros / severity-only avg). */
  const hasMonthlyTableData =
    chartHasDisplayableData(claimsChartData) ||
    chartHasDisplayableData(avgCostChartData);

  const monthlyRows = useMemo<MonthlyRow[]>(() => {
    const rows = displayedCosts
      .map((costPoint) => {
        const claimPoint = displayedClaims.find(
          (entry) => entry.month === costPoint.month,
        );
        if (!claimPoint) {
          return null;
        }
        return {
          month: costPoint.month,
          claims: claimPoint.claims_count_forecast,
          paid: costPoint.paid_amount_forecast,
          avgCost: costPoint.avg_cost_per_claim,
          isForecast: !hasActual(claimPoint),
        };
      })
      .filter((row): row is MonthlyRow => row !== null);
    return [...rows].reverse();
  }, [displayedClaims, displayedCosts]);

  async function applyScenario(
    severityInflationPct: number,
    frequencyShockPct: number,
  ) {
    try {
      const series = await recalculateScenario({
        ...seriesParams,
        severity_inflation_pct: severityInflationPct,
        frequency_shock_pct: frequencyShockPct,
      });
      setScenarioSeries(series);
      setError(null);
    } catch {
      setError("Scenario recalculation failed.");
    }
  }

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 text-indigo-950/90 md:px-6 md:py-8 lg:px-8">
      <div className="flex justify-center">
        <div className="flex w-full max-w-full flex-col lg:w-fit">
          <header className="mb-6 pb-2">
            <h1 className="text-2xl font-bold tracking-tight text-indigo-950 md:text-3xl">
              Insurecast forecasting dashboard
            </h1>
            <p className="mt-1 text-sm text-indigo-700/75">
              Claims and paid amount trends by segment
            </p>
          </header>

          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(280px,320px)_minmax(0,48rem)] lg:items-start lg:gap-8">
            <aside className="order-1 flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
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
                forecastPeriod={forecastPeriod}
                setForecastPeriod={setForecastPeriod}
              />
              <ScenarioPanel
                key={`${stateValue}-${industry}-${claimType}-${fromMonth}-${forecastPeriod}`}
                onApplyScenario={applyScenario}
                error={error}
              />
            </aside>

            <div className="order-2 min-w-0 w-full">
              <SmoothSummaryStack
                summary={
                  <ForecastSummaryPanel
                    summary={forecastSummary}
                    loadPhase={summaryLoadPhase}
                  />
                }
                below={
                  <>
                    <section className="flex flex-col gap-4">
                      <ForecastChart
                        title="Amount of Claims per Month"
                        description="Historical data plus forecast for the selected period."
                        data={claimsChartData}
                        valueFormatter={formatNumber}
                        allowDataOverflow
                      />
                      <ForecastChart
                        title="Average Cost per Claim per Month"
                        description="Historical data plus forecast for the selected period."
                        data={avgCostChartData}
                        valueFormatter={formatCurrency}
                        skipZeroFloor
                        allowDataOverflow
                      />
                    </section>
                    <MonthlyTable
                      key={hasMonthlyTableData ? monthlyRows.length : 0}
                      rows={hasMonthlyTableData ? monthlyRows : []}
                    />
                  </>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
