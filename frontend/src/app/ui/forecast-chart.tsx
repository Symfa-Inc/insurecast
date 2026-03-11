"use client";

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

export type ForecastChartPoint = {
  month: string;
  /** Observed value (historical only); used for dots */
  currentData: number | null;
  /** Forecast value (forecast period only) */
  forecast: number | null;
  /** Combined value for the main fitted+forecast line */
  lineValue: number | null;
  forecastCiLow: number | null;
  forecastCiRange: number | null;
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
    const vals = [pt.currentData, pt.forecast, pt.lineValue];
    if (!fromLineOnly && pt.forecastCiLow != null && pt.forecastCiRange != null) {
      vals.push(pt.forecastCiLow, pt.forecastCiLow + pt.forecastCiRange);
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
        inMainBand.length > 0 ? Math.min(...inMainBand) : Math.min(...positiveVals);
      if (min === 0 || min < floor * 0.9) {
        min = floor;
      }
    }
  }
  const range = max - min;
  const padding = Math.max(range * 0.1, range === 0 ? 1 : range * 0.05, 0.5);
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
    const line = pt.lineValue != null && isFinite(pt.lineValue) ? pt.lineValue : null;
    const current = pt.currentData != null && isFinite(pt.currentData) ? pt.currentData : null;
    const forecast = pt.forecast != null && isFinite(pt.forecast) ? pt.forecast : null;
    if ((line != null && line !== 0) || (current != null && current !== 0) || (forecast != null && forecast !== 0)) {
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
    return {
      ...pt,
      currentData: sane(pt.currentData),
      forecast: sane(pt.forecast),
      lineValue: sane(pt.lineValue),
      forecastCiLow: sane(pt.forecastCiLow),
      forecastCiRange:
        pt.forecastCiRange != null &&
        isFinite(pt.forecastCiRange) &&
        pt.forecastCiRange >= 0 &&
        pt.forecastCiRange < SANE_MAX
          ? pt.forecastCiRange
          : null,
    };
  });
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
  const hasData = hasPlottableData(sanitizedData);
  const yDomain = hasData
    ? computeYDomain(sanitizedData, domainFromLineOnly, skipZeroFloor)
    : [0, 1];

  return (
    <article className="group rounded-2xl border border-indigo-200/50 bg-white p-5 shadow-sm ring-1 ring-indigo-100/50 transition-shadow hover:shadow-md">
      <h2 className="text-xl font-semibold text-indigo-900 md:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-indigo-700/70">{description}</p>
      <div className="mt-4 relative w-full min-w-0 rounded-xl bg-slate-50/50 border border-indigo-100/60 p-3" style={{ height: 256 }}>
        {hasData ? (
        <ResponsiveContainer
          width="100%"
          height="100%"
          minHeight={220}
          initialDimension={{ width: 400, height: 256 }}
        >
          <ComposedChart data={sanitizedData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#c7b8f0" strokeOpacity={0.6} />
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
                typeof v === "number" && (v >= SANE_MAX || !isFinite(v)) ? "" : valueFormatter(v as number)
              }
            />
            <Tooltip
              formatter={(value, name) => [value != null ? valueFormatter(value as number) : "-", name ?? ""]}
              contentStyle={{ borderRadius: 10, borderColor: "#8b5cf6", backgroundColor: "#f5f3ff" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="forecastCiLow"
              stackId="band"
              stroke="none"
              fillOpacity={0}
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey="forecastCiRange"
              stackId="band"
              stroke="none"
              fill="#93c5fd"
              fillOpacity={0.4}
              name="Forecast CI"
            />
            <Line
              type="monotone"
              dataKey="currentData"
              name="Historical"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Forecast"
              stroke="#2563eb"
              strokeWidth={2.5}
              strokeDasharray="5 5"
              dot={false}
              connectNulls
            />
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
