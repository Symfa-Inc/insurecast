"use client";

import type { SegmentsResponse } from "@/app/utils/api";

type DashboardHeaderProps = {
  segments: SegmentsResponse | null;
  stateValue: string;
  setStateValue: (value: string) => void;
  industry: string;
  setIndustry: (value: string) => void;
  claimType: string;
  setClaimType: (value: string) => void;
  fromMonth: string;
  setFromMonth: (value: string) => void;
  forecastPeriod: string;
  setForecastPeriod: (value: string) => void;
};

export function DashboardHeader({
  segments,
  stateValue,
  setStateValue,
  industry,
  setIndustry,
  claimType,
  setClaimType,
  fromMonth,
  setFromMonth,
  forecastPeriod,
  setForecastPeriod,
}: DashboardHeaderProps) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-teal-600 p-6 text-white shadow-xl shadow-indigo-200/30">
      <p className="text-3xl font-bold tracking-tight md:text-4xl">Insurecast forecasting dashboard</p>
      <p className="mt-2 text-sm text-white/90">Claims and paid amount trends by segment</p>

      <div className="mt-6 flex flex-wrap gap-4">
        <label className="flex min-w-0 flex-1 flex-col text-sm font-semibold text-white/95 sm:min-w-[140px]">
          State
          <select
            value={stateValue}
            onChange={(e) => setStateValue(e.target.value)}
            className="mt-1.5 min-w-0 w-full rounded-lg border border-white/30 bg-white px-3 py-2.5 text-slate-700 transition-shadow focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-indigo-600"
          >
            {(segments?.states ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 flex-col text-sm font-semibold text-white/95 sm:min-w-[140px]">
          Industry
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="mt-1.5 min-w-0 w-full rounded-lg border border-white/30 bg-white px-3 py-2.5 text-slate-700 transition-shadow focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-indigo-600"
          >
            {(segments?.industries ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 flex-col text-sm font-semibold text-white/95 sm:min-w-[140px]">
          Claim Type
          <select
            value={claimType}
            onChange={(e) => setClaimType(e.target.value)}
            className="mt-1.5 min-w-0 w-full rounded-lg border border-white/30 bg-white px-3 py-2.5 text-slate-700 transition-shadow focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-indigo-600"
          >
            {(segments?.claim_types ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 flex-col text-sm font-semibold text-white/95 sm:min-w-[140px]">
          From
          <input
            type="month"
            value={fromMonth}
            onChange={(e) => setFromMonth(e.target.value)}
            className="mt-1.5 min-w-0 w-full rounded-lg border border-white/30 bg-white px-3 py-2.5 text-slate-700 transition-shadow focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-indigo-600"
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col text-sm font-semibold text-white/95 sm:min-w-[140px]">
          Forecast Period
          <select
            value={forecastPeriod}
            onChange={(e) => setForecastPeriod(e.target.value)}
            className="mt-1.5 min-w-0 w-full rounded-lg border border-white/30 bg-white px-3 py-2.5 text-slate-700 transition-shadow focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-indigo-600"
          >
            <option value="1">1 month</option>
            <option value="3">3 months</option>
            <option value="6">6 months</option>
            <option value="12">12 months</option>
          </select>
        </label>
      </div>
    </section>
  );
}
