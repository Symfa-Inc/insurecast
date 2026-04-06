"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
import { filterStatesForUi } from "./utils/allowed-states";
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
import {
  chartHasDisplayableData,
  ForecastChart,
  type ForecastChartPoint,
} from "./ui/forecast-chart";
import { MonthlyTable, type MonthlyRow } from "./ui/monthly-table";
import { ScenarioPanel } from "./ui/scenario-panel";

const MAX_SAFE_COST = 1e6;
const DEFAULT_STATE = "NY";
const DEFAULT_INDUSTRY = "Healthcare";
const DEFAULT_CLAIM_TYPE = "Indemnity";
const DEFAULT_FROM_MONTH = "2023-01";
const DEFAULT_FORECAST_PERIOD = "12";
const SIDEBAR_CONTROL_KEYS = [
  "stateValue",
  "industry",
  "claimType",
  "fromMonth",
  "forecastPeriod",
  "severityInflationPct",
  "frequencyShockPct",
] as const;

type SidebarControls = {
  stateValue: string;
  industry: string;
  claimType: string;
  fromMonth: string;
  forecastPeriod: string;
  severityInflationPct: number;
  frequencyShockPct: number;
};

const DEFAULT_SIDEBAR_CONTROLS: SidebarControls = {
  stateValue: DEFAULT_STATE,
  industry: DEFAULT_INDUSTRY,
  claimType: DEFAULT_CLAIM_TYPE,
  fromMonth: DEFAULT_FROM_MONTH,
  forecastPeriod: DEFAULT_FORECAST_PERIOD,
  severityInflationPct: 0,
  frequencyShockPct: 0,
};

function resolveSidebarDefaults(payload: SegmentsResponse): SidebarControls {
  const availableStates = filterStatesForUi(payload.states);

  return {
    ...DEFAULT_SIDEBAR_CONTROLS,
    stateValue: availableStates.includes(DEFAULT_STATE)
      ? DEFAULT_STATE
      : (availableStates[0] ?? DEFAULT_STATE),
    industry: payload.industries.includes(DEFAULT_INDUSTRY)
      ? DEFAULT_INDUSTRY
      : (payload.industries[0] ?? DEFAULT_INDUSTRY),
    claimType: payload.claim_types.includes(DEFAULT_CLAIM_TYPE)
      ? DEFAULT_CLAIM_TYPE
      : (payload.claim_types[0] ?? DEFAULT_CLAIM_TYPE),
  };
}

function countChangedSidebarControls(
  draftControls: SidebarControls,
  appliedControls: SidebarControls,
) {
  return SIDEBAR_CONTROL_KEYS.reduce(
    (count, key) => count + Number(draftControls[key] !== appliedControls[key]),
    0,
  );
}

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
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [segments, setSegments] = useState<SegmentsResponse | null>(null);
  const [draftControls, setDraftControls] = useState<SidebarControls>(
    DEFAULT_SIDEBAR_CONTROLS,
  );
  const [appliedControls, setAppliedControls] = useState<SidebarControls>(
    DEFAULT_SIDEBAR_CONTROLS,
  );
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

  const isApplying = summaryLoadPhase !== "idle";
  const pendingChangeCount = useMemo(
    () => countChangedSidebarControls(draftControls, appliedControls),
    [draftControls, appliedControls],
  );
  const hasUnappliedChanges = pendingChangeCount > 0;
  const forecastMonths = Math.max(
    1,
    parseInt(appliedControls.forecastPeriod, 10) ||
      Number(DEFAULT_FORECAST_PERIOD),
  );
  const toMonth = useMemo(() => {
    if (metadata?.actual_end && metadata?.forecast_end) {
      const endWithForecast = addMonths(metadata.actual_end, forecastMonths);
      return compareMonths(endWithForecast, metadata.forecast_end) <= 0
        ? endWithForecast
        : metadata.forecast_end;
    }
    return addMonths(appliedControls.fromMonth, 24);
  }, [
    appliedControls.fromMonth,
    metadata?.actual_end,
    metadata?.forecast_end,
    forecastMonths,
  ]);

  useEffect(() => {
    async function loadSegments() {
      const payload = await getSegments();
      const resolvedControls = resolveSidebarDefaults(payload);
      setSegments(payload);
      setDraftControls(resolvedControls);
      setAppliedControls(resolvedControls);
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
      setSummaryLoadPhase("charts");
      try {
        const meta = await getModelMetadata();
        setMetadata(meta);
        const forecastMonthsNum = Math.max(
          1,
          parseInt(appliedControls.forecastPeriod, 10) ||
            Number(DEFAULT_FORECAST_PERIOD),
        );
        const computedTo =
          meta?.actual_end && meta?.forecast_end
            ? compareMonths(
                addMonths(meta.actual_end, forecastMonthsNum),
                meta.forecast_end,
              ) <= 0
              ? addMonths(meta.actual_end, forecastMonthsNum)
              : meta.forecast_end
            : addMonths(appliedControls.fromMonth, 24);
        const params = {
          from: appliedControls.fromMonth,
          to: computedTo,
          state: appliedControls.stateValue,
          industry: appliedControls.industry,
          claim_type: appliedControls.claimType,
        };
        const scenarioPromise =
          appliedControls.severityInflationPct !== 0 ||
          appliedControls.frequencyShockPct !== 0
            ? recalculateScenario({
                ...params,
                severity_inflation_pct: appliedControls.severityInflationPct,
                frequency_shock_pct: appliedControls.frequencyShockPct,
              })
            : Promise.resolve(null);
        const [claimsPayload, costsPayload, scenarioPayload] =
          await Promise.all([
            getClaimsSeries(params),
            getCostsSeries(params),
            scenarioPromise,
          ]);
        setClaims(claimsPayload);
        setCosts(costsPayload);
        setScenarioSeries(scenarioPayload);

        if (!rawSeriesHasPlottableChartData(claimsPayload, costsPayload)) {
          setForecastSummary({
            narrative:
              "There is no data for the charts with this selection. Try another segment or date range.",
            source: "no_data",
            llm_model: null,
            notice: null,
            segment_label: `${appliedControls.stateValue} · ${appliedControls.industry} · ${appliedControls.claimType}`,
            chart_from: appliedControls.fromMonth,
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
      } catch (loadError: unknown) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load dashboard data.",
        );
        setScenarioSeries(null);
      } finally {
        setSummaryLoadPhase("idle");
      }
    }

    void loadData();
  }, [segments, appliedControls]);

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

  const scenarioSummaryNotice =
    appliedControls.severityInflationPct !== 0 ||
    appliedControls.frequencyShockPct !== 0
      ? `Scenario applied: severity ${appliedControls.severityInflationPct >= 0 ? "+" : ""}${appliedControls.severityInflationPct}% and frequency ${appliedControls.frequencyShockPct >= 0 ? "+" : ""}${appliedControls.frequencyShockPct}%. Charts and table reflect the adjustment.`
      : null;

  function applySidebarChanges() {
    if (!hasUnappliedChanges || isApplying) {
      return;
    }

    setAppliedControls(draftControls);
  }

  function resetDraftControls() {
    setDraftControls(appliedControls);
  }

  return (
    <>
      <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-zinc-200 bg-white">
        <DashboardHeader
          segments={segments}
          actualStart={metadata?.actual_start ?? null}
          actualEnd={metadata?.actual_end ?? null}
          stateValue={draftControls.stateValue}
          setStateValue={(value) =>
            setDraftControls((current) => ({ ...current, stateValue: value }))
          }
          industry={draftControls.industry}
          setIndustry={(value) =>
            setDraftControls((current) => ({ ...current, industry: value }))
          }
          claimType={draftControls.claimType}
          setClaimType={(value) =>
            setDraftControls((current) => ({ ...current, claimType: value }))
          }
          fromMonth={draftControls.fromMonth}
          setFromMonth={(value) =>
            setDraftControls((current) => ({ ...current, fromMonth: value }))
          }
          forecastPeriod={draftControls.forecastPeriod}
          setForecastPeriod={(value) =>
            setDraftControls((current) => ({
              ...current,
              forecastPeriod: value,
            }))
          }
        />
        <div className="border-t border-zinc-100 mx-5" />
        <ScenarioPanel
          severityInflationPct={draftControls.severityInflationPct}
          setSeverityInflationPct={(value) =>
            setDraftControls((current) => ({
              ...current,
              severityInflationPct: value,
            }))
          }
          frequencyShockPct={draftControls.frequencyShockPct}
          setFrequencyShockPct={(value) =>
            setDraftControls((current) => ({
              ...current,
              frequencyShockPct: value,
            }))
          }
          pendingChangeCount={pendingChangeCount}
          hasUnappliedChanges={hasUnappliedChanges}
          isApplying={isApplying}
          onApplyChanges={applySidebarChanges}
          onResetChanges={resetDraftControls}
          error={error}
        />
      </aside>
      <main
        id="main-content"
        className="flex-1 overflow-y-auto bg-zinc-50 px-6 py-6"
      >
        <div className="space-y-5">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.25, ease: [0.4, 0, 0.2, 1], delay: 0 }
            }
          >
            <ForecastSummaryPanel
              summary={forecastSummary}
              loadPhase={summaryLoadPhase}
              supplementalNotice={scenarioSummaryNotice}
            />
          </motion.div>
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    duration: 0.25,
                    ease: [0.4, 0, 0.2, 1],
                    delay: 0.06,
                  }
            }
          >
            <section className="flex flex-col gap-4">
              <ForecastChart
                title="Amount of Claims per Month"
                data={claimsChartData}
                valueFormatter={formatNumber}
                allowDataOverflow
              />
              <ForecastChart
                title="Average Cost per Claim per Month"
                data={avgCostChartData}
                valueFormatter={formatCurrency}
                skipZeroFloor
                allowDataOverflow
              />
            </section>
          </motion.div>
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    duration: 0.25,
                    ease: [0.4, 0, 0.2, 1],
                    delay: 0.12,
                  }
            }
          >
            <MonthlyTable
              key={hasMonthlyTableData ? monthlyRows.length : 0}
              rows={hasMonthlyTableData ? monthlyRows : []}
            />
          </motion.div>
        </div>
      </main>
    </>
  );
}
