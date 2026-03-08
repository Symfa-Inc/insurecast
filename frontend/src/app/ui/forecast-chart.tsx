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
  currentData: number | null;
  forecast: number | null;
  forecastCiLow: number | null;
  forecastCiRange: number | null;
};

type ForecastChartProps = {
  title: string;
  description: string;
  data: ForecastChartPoint[];
  valueFormatter: (value: number) => string;
};

export function ForecastChart({ title, description, data, valueFormatter }: ForecastChartProps) {
  return (
    <article className="group rounded-2xl border border-indigo-200/50 bg-white p-5 shadow-sm ring-1 ring-indigo-100/50 transition-shadow hover:shadow-md">
      <h2 className="text-xl font-semibold text-indigo-900 md:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-indigo-700/70">{description}</p>
      <div className="mt-4 h-64 min-w-0 rounded-xl bg-slate-50/50 border border-indigo-100/60 p-3">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#c7b8f0" strokeOpacity={0.6} />
            <XAxis
              dataKey="month"
              interval={0}
              minTickGap={0}
              tick={{ fill: "#5b21b6", fontSize: 12 }}
            />
            <YAxis tick={{ fill: "#5b21b6", fontSize: 12 }} />
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
              fill="#a78bfa"
              fillOpacity={0.3}
              name="Forecast CI"
            />
            <Line
              type="monotone"
              dataKey="currentData"
              name="Current data"
              stroke="#4f46e5"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Forecast"
              stroke="#0d9488"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: "#0d9488", strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
