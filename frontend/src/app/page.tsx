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
import { addMonths, compareMonths, formatCurrency, formatNumber, monthToLabel } from "./utils/format";
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
  const [forecastPeriod, setForecastPeriod] = useState("3");
  const [severityInflation, setSeverityInflation] = useState(0);
  const [frequencyShock, setFrequencyShock] = useState(0);
  const [claims, setClaims] = useState<ClaimsPoint[]>([]);
  const [costs, setCosts] = useState<CostsPoint[]>([]);
  const [scenarioCosts, setScenarioCosts] = useState<CostsPoint[] | null>(null);
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
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
      setError(loadError instanceof Error ? loadError.message : "Unknown error");
    });
  }, []);

  useEffect(() => {
    if (!segments) {
      return;
    }

    async function loadData() {
      setError(null);
      try {
        let meta = metadata;
        if (!meta) {
          meta = await getModelMetadata();
          setMetadata(meta);
        }
        const forecastMonthsNum = Math.max(1, parseInt(forecastPeriod, 10) || 3);
        const computedTo =
          meta?.actual_end && meta?.forecast_end
            ? (compareMonths(addMonths(meta.actual_end, forecastMonthsNum), meta.forecast_end) <= 0
                ? addMonths(meta.actual_end, forecastMonthsNum)
                : meta.forecast_end)
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
        setScenarioCosts(null);
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard data.");
      }
    }

    void loadData();
  }, [segments, claimType, fromMonth, forecastPeriod, industry, stateValue]);

  const displayedCosts = scenarioCosts ?? costs;
  const hasActual = (p: ClaimsPoint) => p.claims_count_actual != null;

  const claimsChartData = useMemo<ForecastChartPoint[]>(
    () => {
      let lastHistoricalIndex = -1;
      for (let i = claims.length - 1; i >= 0; i--) {
        if (hasActual(claims[i])) {
          lastHistoricalIndex = i;
          break;
        }
      }
      return claims.map((point, index) => {
        const isHistorical = hasActual(point);
        const isForecast = !isHistorical;
        const isLastHistorical = index === lastHistoricalIndex;
        const currentData = isHistorical
          ? (point.claims_count_actual ?? point.claims_count_forecast)
          : null;
        const forecast = isForecast ? point.claims_count_forecast : null;
        const lineValue = currentData ?? forecast;

        const hasForecastCi = isForecast || isLastHistorical;
        let forecastCiLow: number | null = null;
        let forecastCiRange: number | null = null;
        if (hasForecastCi && lineValue != null) {
          const baseRange = point.claims_ci_high - point.claims_ci_low;
          const forecastIndex = isLastHistorical ? -1 : index - lastHistoricalIndex - 1;
          const widenFactor = 1 + 0.2 * Math.max(0, forecastIndex);
          const halfSpread = (baseRange / 2) * widenFactor;
          forecastCiLow = lineValue - halfSpread;
          forecastCiRange = 2 * halfSpread;
        }
        return {
          month: monthToLabel(point.month),
          currentData: isHistorical ? currentData : null,
          forecast: isForecast ? forecast : isLastHistorical ? currentData : null,
          lineValue,
          forecastCiLow,
          forecastCiRange,
        };
      });
    },
    [claims],
  );

  const MAX_SAFE_COST = 1e6;

  const avgCostChartData = useMemo<ForecastChartPoint[]>(() => {
    let lastHistoricalIndex = -1;
    for (let i = claims.length - 1; i >= 0; i--) {
      if (hasActual(claims[i])) {
        lastHistoricalIndex = i;
        break;
      }
    }
    return displayedCosts.map((point, index) => {
      const isHistorical = index <= lastHistoricalIndex && hasActual(claims[index] ?? {});
      const isForecast = !isHistorical;
      const isLastHistorical = index === lastHistoricalIndex;
      const claimPoint = claims[index];
      const claimsCount = claimPoint?.claims_count_forecast ?? 0;
      const rawAvg = claimsCount > 0 ? point.avg_cost_per_claim : 0;
      const avgCost =
        typeof rawAvg === "number" && isFinite(rawAvg) && rawAvg >= 0 && rawAvg < MAX_SAFE_COST
          ? rawAvg
          : 0;
      const currentData = isHistorical ? avgCost : null;
      const forecast = isForecast ? avgCost : null;
      const lineValue = currentData ?? forecast;

      const hasForecastCi = isForecast || isLastHistorical;
      let forecastCiLow: number | null = null;
      let forecastCiRange: number | null = null;
      if (hasForecastCi && lineValue != null && lineValue > 0 && lineValue < MAX_SAFE_COST) {
        const halfSpread = lineValue * 0.1;
        const forecastIndex = isLastHistorical ? -1 : index - lastHistoricalIndex - 1;
        const widenFactor = 1 + 0.1 * Math.max(0, forecastIndex);
        const scaledHalfSpread = halfSpread * widenFactor;
        forecastCiLow = Math.max(0, lineValue - scaledHalfSpread);
        forecastCiRange = 2 * scaledHalfSpread;
      }
      return {
        month: monthToLabel(point.month),
        currentData: isHistorical ? currentData : null,
        forecast: isForecast ? forecast : isLastHistorical ? currentData : null,
        lineValue,
        forecastCiLow,
        forecastCiRange,
      };
    });
  }, [claims, displayedCosts]);

  const monthlyRows = useMemo<MonthlyRow[]>(() => {
    const rows = displayedCosts.map((costPoint) => {
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
      .filter((row): row is MonthlyRow => row !== null);
    return [...rows].reverse();
  }, [claims, displayedCosts]);

  async function applyScenario() {
    try {
      const scenarioSeries = await recalculateScenario({
        ...seriesParams,
        severity_inflation_pct: severityInflation,
        frequency_shock_pct: frequencyShock,
      });
      const mappedScenarioCosts: CostsPoint[] = scenarioSeries.map((point) => {
        const safeAvg =
          typeof point.avg_cost_per_claim === "number" &&
          isFinite(point.avg_cost_per_claim) &&
          point.avg_cost_per_claim >= 0 &&
          point.avg_cost_per_claim < 1e6
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
        forecastPeriod={forecastPeriod}
        setForecastPeriod={setForecastPeriod}
      />

      <ScenarioPanel
        severityInflation={severityInflation}
        setSeverityInflation={setSeverityInflation}
        frequencyShock={frequencyShock}
        setFrequencyShock={setFrequencyShock}
        onApplyScenario={applyScenario}
        error={error}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <ForecastChart
          title="Amount of Claims per Month"
          description="Historical data plus forecast for the selected period."
          data={claimsChartData}
          valueFormatter={formatNumber}
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

      <MonthlyTable rows={monthlyRows} />
      <ModelMetadata metadata={metadata} />
    </main>
  );
}
