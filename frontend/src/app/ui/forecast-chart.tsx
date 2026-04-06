"use client";

import { useId } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Label,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion, useReducedMotion } from "framer-motion";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

/** Historical (actuals) + solidBridge — neutral zinc */
const STROKE_HISTORICAL = "#71717a";
/** Forecast dashed line — blue accent */
const STROKE_FORECAST = "#2563eb";
/** Vertical divider at forecast start */
const STROKE_FORECAST_MARKER = "#d4d4d8";
/** Confidence band (forecast only) — blue tint */
const CI_FILL = "#dbeafe";

type TooltipEntry = NonNullable<
  TooltipContentProps<ValueType, NameType>["payload"]
>[number];

function CustomTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: TooltipContentProps<ValueType, NameType> & {
  valueFormatter: (value: number) => string;
}) {
  const shouldReduceMotion = useReducedMotion() ?? false;

  if (!active || !payload?.length) return null;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.1 }}
      className="bg-white border border-zinc-200 shadow-md rounded-lg p-3 min-w-[160px]"
    >
      <p className="text-xs font-semibold text-zinc-500 mb-2">{label}</p>
      {payload
        .filter(
          (entry: TooltipEntry) =>
            entry.name && entry.dataKey !== "solidBridge",
        )
        .map((entry: TooltipEntry) => {
          const formattedValue = Array.isArray(entry.value)
            ? entry.value
                .map((item: ValueType) =>
                  typeof item === "number"
                    ? valueFormatter(item)
                    : String(item),
                )
                .join(" - ")
            : typeof entry.value === "number"
              ? valueFormatter(entry.value)
              : String(entry.value ?? "");

          return (
            <div
              key={entry.dataKey as string}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <span className="text-zinc-500">{entry.name}</span>
              <span className="font-semibold text-zinc-900">
                {formattedValue}
              </span>
            </div>
          );
        })}
    </motion.div>
  );
}

/** Same duration + easing on Area + all Line series so motion stays in sync (avoids "pop-in" order). */
const CHART_ANIMATION_MS = 1000;
const CHART_ANIMATION_EASING = "ease-in-out" as const;

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
    <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="inline-block w-5 h-0 border-t-2 border-zinc-400" />
            Historical
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="inline-block w-5 h-0 border-t-2 border-dashed border-blue-500" />
            Forecast
          </span>
        </div>
      </div>
      <div className="relative w-full min-w-0">
        {hasData ? (
          <ResponsiveContainer width="100%" height={320} minHeight={280}>
            <ComposedChart
              data={sanitizedData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={ciGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CI_FILL} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={CI_FILL} stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#E4E4E7" />
              <XAxis
                dataKey="month"
                interval="preserveStartEnd"
                minTickGap={20}
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={yDomain}
                allowDataOverflow={allowDataOverflowProp ?? domainFromLineOnly}
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickFormatter={(v) =>
                  typeof v === "number" && (v >= SANE_MAX || !isFinite(v))
                    ? ""
                    : valueFormatter(v as number)
                }
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={(props) => (
                  <CustomTooltip {...props} valueFormatter={valueFormatter} />
                )}
              />
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
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  zIndex={500}
                >
                  <Label
                    value="Forecast starts"
                    position="insideTopRight"
                    style={{ fontSize: 10, fill: "#a1a1aa" }}
                  />
                </ReferenceLine>
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="flex items-center justify-center"
            style={{ height: 320 }}
          >
            <p className="text-sm font-medium text-zinc-400">No data</p>
          </div>
        )}
      </div>
    </article>
  );
}
