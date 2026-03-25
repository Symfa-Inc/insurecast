"use client";

import { useId } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Historical (actuals) — blue */
const STROKE_HISTORICAL = "#1d4ed8";
/** Forecast dashed line — orange (bridge segment uses historical blue above) */
const STROKE_FORECAST = "#ea580c";
/** Vertical divider at forecast start */
const STROKE_FORECAST_MARKER = "#c2410c";
/** Confidence band (forecast only) — warm tint */
const CI_GRADIENT_START = "#ffedd5";
const CI_GRADIENT_END = "#fdba74";

/** Same duration + easing on Area + all Line series so motion stays in sync (avoids “pop-in” order). */
const CHART_ANIMATION_MS = 1000;
const CHART_ANIMATION_EASING = "ease-in-out" as const;

/**
 * Range `Area` (ciBand) supplies [low, high] per point — not a scalar. Tooltip must not pass that to Intl as one number.
 */
function formatTooltipValue(
  value: unknown,
  valueFormatter: (n: number) => string,
): string {
  if (value != null && Array.isArray(value) && value.length >= 2) {
    const lo = value[0];
    const hi = value[1];
    if (
      typeof lo === "number" &&
      typeof hi === "number" &&
      Number.isFinite(lo) &&
      Number.isFinite(hi)
    ) {
      return `${valueFormatter(lo)} – ${valueFormatter(hi)}`;
    }
  }
  if (value != null && typeof value === "number" && Number.isFinite(value)) {
    return valueFormatter(value);
  }
  return "—";
}

export type ForecastChartPoint = {
  month: string;
  /** Observed value (historical only); used for dots */
  currentData: number | null;
  /** Forecast value (forecast period only) */
  forecast: number | null;
  /** Combined value for the main fitted+forecast line */
  lineValue: number | null;
  /**
   * [low, high] for Recharts range Area (no stackId). Null = no band at this point.
   * Prefer this over stacked low+range so the full forecast segment renders as one region.
   */
  ciBand: [number, number] | null;
  /**
   * Solid segment only on last actual + first forecast index (same Y as line) to close the gap
   * between historical and dashed forecast polylines.
   */
  solidBridge: number | null;
};

type ForecastChartProps = {
  title: string;
  description: string;
  data: ForecastChartPoint[];
  valueFormatter: (value: number) => string;
  /** When true, Y domain is based only on line values (not the CI band), giving a tighter axis for narrow data ranges */
  domainFromLineOnly?: boolean;
  /** When true, skip 0 as floor when data is concentrated high (for avg cost etc.) */
  skipZeroFloor?: boolean;
  /** When true, enforce our domain without extending to include all data (prevents axis starting at 0 when data is higher) */
  allowDataOverflow?: boolean;
};

function computeYDomain(
  data: ForecastChartPoint[],
  fromLineOnly = false,
  skipZeroFloor = false,
): [number, number] {
  const allVals: number[] = [];
  for (const pt of data) {
    const vals = [pt.currentData, pt.forecast, pt.lineValue, pt.solidBridge];
    if (!fromLineOnly && pt.ciBand != null) {
      vals.push(pt.ciBand[0], pt.ciBand[1]);
    }
    for (const v of vals) {
      if (v != null && isFinite(v) && v >= 0 && v < 1e7) {
        allVals.push(v);
      }
    }
  }
  let min = allVals.length > 0 ? Math.min(...allVals) : 0;
  let max = allVals.length > 0 ? Math.max(...allVals) : 1;
  if (min >= max) {
    max = min + 1;
  }
  // When skipZeroFloor: avoid starting at 0 when data is concentrated high (e.g. avg cost).
  // Use the smallest value in the main band (>= 15% of max) as floor to keep scale focused.
  if (skipZeroFloor) {
    const positiveVals = allVals.filter((v) => v > 0);
    if (positiveVals.length > 0 && max > 0) {
      const inMainBand = positiveVals.filter((v) => v >= max * 0.15);
      const floor =
        inMainBand.length > 0
          ? Math.min(...inMainBand)
          : Math.min(...positiveVals);
      if (min === 0 || min < floor * 0.9) {
        min = floor;
      }
    }
  }
  const range = max - min;
  let padding = Math.max(range * 0.1, range === 0 ? 1 : range * 0.05, 0.5);
  // Extra headroom when a forecast CI is shown (matches allowDataOverflow charts; avoids band clipping at plot edges).
  const hasConfidenceBand =
    !fromLineOnly &&
    data.some(
      (pt) =>
        pt.ciBand != null &&
        pt.ciBand.length === 2 &&
        isFinite(pt.ciBand[0]) &&
        isFinite(pt.ciBand[1]),
    );
  if (hasConfidenceBand) {
    padding += Math.max(range * 0.14, 0.85);
  }
  const domainMin = Math.max(0, min - padding);
  let domainMax = max + padding;
  // Hard cap domain to prevent Recharts or data from producing absurd axis labels
  const maxDomain = 1e6;
  if (domainMax > maxDomain) {
    domainMax = Math.min(maxDomain, max + padding);
  }
  return [domainMin, domainMax];
}

function hasPlottableData(data: ForecastChartPoint[]): boolean {
  if (!data.length) return false;
  for (const pt of data) {
    const line =
      pt.lineValue != null && isFinite(pt.lineValue) ? pt.lineValue : null;
    const current =
      pt.currentData != null && isFinite(pt.currentData)
        ? pt.currentData
        : null;
    const forecast =
      pt.forecast != null && isFinite(pt.forecast) ? pt.forecast : null;
    const bridge =
      pt.solidBridge != null && isFinite(pt.solidBridge)
        ? pt.solidBridge
        : null;
    if (
      (line != null && line !== 0) ||
      (current != null && current !== 0) ||
      (forecast != null && forecast !== 0) ||
      (bridge != null && bridge !== 0)
    ) {
      return true;
    }
  }
  return false;
}

const SANE_MAX = 1e6;

function sanitizeChartData(data: ForecastChartPoint[]): ForecastChartPoint[] {
  return data.map((pt) => {
    const sane = (v: number | null): number | null =>
      v != null && isFinite(v) && v >= 0 && v < SANE_MAX ? v : null;
    let ciBand: [number, number] | null = null;
    if (pt.ciBand != null && pt.ciBand.length === 2) {
      const lo = sane(pt.ciBand[0]);
      const hi = sane(pt.ciBand[1]);
      if (lo != null && hi != null) {
        ciBand = lo <= hi ? [lo, hi] : [hi, lo];
      }
    }
    return {
      ...pt,
      currentData: sane(pt.currentData),
      forecast: sane(pt.forecast),
      lineValue: sane(pt.lineValue),
      ciBand,
      solidBridge: sane(pt.solidBridge),
    };
  });
}

/** Same rule as the charts: sanitized series must have at least one non-zero plottable point */
export function chartHasDisplayableData(data: ForecastChartPoint[]): boolean {
  return hasPlottableData(sanitizeChartData(data));
}

/**
 * Dashed vertical line at the start of the first forecast month (`position="start"` = left edge of band).
 */
function forecastBoundaryRef(
  data: ForecastChartPoint[],
): { x: string; position: "start" } | null {
  let lastHistIdx = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i].currentData != null) {
      lastHistIdx = i;
    }
  }
  if (lastHistIdx < 0) {
    return null;
  }
  const j = lastHistIdx + 1;
  if (j >= data.length) {
    return null;
  }
  const next = data[j];
  if (next.currentData != null || next.forecast == null) {
    return null;
  }
  return { x: next.month, position: "start" };
}

export function ForecastChart({
  title,
  description,
  data,
  valueFormatter,
  domainFromLineOnly = false,
  skipZeroFloor = false,
  allowDataOverflow: allowDataOverflowProp,
}: ForecastChartProps) {
  const sanitizedData = sanitizeChartData(data);
  const hasData = chartHasDisplayableData(data);
  const yDomain = hasData
    ? computeYDomain(sanitizedData, domainFromLineOnly, skipZeroFloor)
    : [0, 1];
  const ciGradientId = `forecastCi-${useId().replace(/:/g, "")}`;
  const boundaryRef = forecastBoundaryRef(sanitizedData);

  return (
    <article className="group rounded-2xl border border-indigo-200/50 bg-white p-5 shadow-sm ring-1 ring-indigo-100/50 transition-shadow hover:shadow-md">
      <h2 className="text-xl font-semibold text-indigo-900 md:text-2xl">
        {title}
      </h2>
      <p className="mt-1 text-sm text-indigo-700/70">{description}</p>
      <div
        className="mt-4 relative w-full min-w-0 rounded-xl bg-slate-50/50 border border-indigo-100/60 p-3"
        style={{ height: 256 }}
      >
        {hasData ? (
          <ResponsiveContainer
            width="100%"
            height="100%"
            minHeight={220}
            initialDimension={{ width: 400, height: 256 }}
          >
            <ComposedChart
              data={sanitizedData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={ciGradientId} x1="0" y1="0" x2="1" y2="0">
                  <stop
                    offset="0%"
                    stopColor={CI_GRADIENT_START}
                    stopOpacity={0.55}
                  />
                  <stop
                    offset="100%"
                    stopColor={CI_GRADIENT_END}
                    stopOpacity={0.35}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#c7b8f0"
                strokeOpacity={0.6}
              />
              <XAxis
                dataKey="month"
                interval="preserveStartEnd"
                minTickGap={20}
                tick={{ fill: "#5b21b6", fontSize: 11 }}
              />
              <YAxis
                domain={yDomain}
                allowDataOverflow={allowDataOverflowProp ?? domainFromLineOnly}
                tick={{ fill: "#5b21b6", fontSize: 12 }}
                tickFormatter={(v) =>
                  typeof v === "number" && (v >= SANE_MAX || !isFinite(v))
                    ? ""
                    : valueFormatter(v as number)
                }
              />
              <Tooltip
                formatter={(value, name) => [
                  formatTooltipValue(value, valueFormatter),
                  name ?? "",
                ]}
                contentStyle={{
                  borderRadius: 10,
                  borderColor: "#fb923c",
                  backgroundColor: "#fff7ed",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {/* CI in a lower z layer; all Line series share default line zIndex so SVG order matches children:
                historical → bridge → forecast (later sibling paints on top). */}
              <Area
                type="monotone"
                dataKey="ciBand"
                stroke="none"
                fill={`url(#${ciGradientId})`}
                name="Forecast CI"
                isAnimationActive="auto"
                animationDuration={CHART_ANIMATION_MS}
                animationEasing={CHART_ANIMATION_EASING}
                zIndex={10}
              />
              <Line
                type="monotone"
                dataKey="currentData"
                name="Historical"
                stroke={STROKE_HISTORICAL}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                connectNulls
                isAnimationActive="auto"
                animationDuration={CHART_ANIMATION_MS}
                animationEasing={CHART_ANIMATION_EASING}
              />
              <Line
                type="linear"
                dataKey="solidBridge"
                name=""
                stroke={STROKE_HISTORICAL}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                connectNulls={false}
                legendType="none"
                tooltipType="none"
                isAnimationActive="auto"
                animationDuration={CHART_ANIMATION_MS}
                animationEasing={CHART_ANIMATION_EASING}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                name="Forecast"
                stroke={STROKE_FORECAST}
                strokeWidth={2.5}
                strokeDasharray="8 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                connectNulls
                isAnimationActive="auto"
                animationDuration={CHART_ANIMATION_MS}
                animationEasing={CHART_ANIMATION_EASING}
              />
              {boundaryRef != null ? (
                <ReferenceLine
                  x={boundaryRef.x}
                  position={boundaryRef.position}
                  stroke={STROKE_FORECAST_MARKER}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  strokeOpacity={0.95}
                  zIndex={500}
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-indigo-500/80">
            <p className="text-base font-medium">No data</p>
          </div>
        )}
      </div>
    </article>
  );
}
