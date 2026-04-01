"use client";

import type { SegmentsResponse } from "@/app/utils/api";
import { filterStatesForUi } from "@/app/utils/allowed-states";

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

const controlClass =
  "mt-1.5 w-full rounded-lg border border-white/30 bg-white px-3 py-2.5 text-slate-700 shadow-sm transition-shadow focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-indigo-600";

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
    <section className="rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-teal-600 p-5 text-white shadow-lg shadow-indigo-200/30">
      <p className="text-lg font-bold tracking-tight">Parameters</p>
      <p className="mt-1 text-xs text-white/85">Segment and forecast window</p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-white/90">
          State
          <select
            value={stateValue}
            onChange={(e) => setStateValue(e.target.value)}
            className={controlClass}
          >
            {filterStatesForUi(segments?.states ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-white/90">
          Industry
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className={controlClass}
          >
            {(segments?.industries ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-white/90">
          Claim type
          <select
            value={claimType}
            onChange={(e) => setClaimType(e.target.value)}
            className={controlClass}
          >
            {(segments?.claim_types ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-white/90">
          From
          <input
            type="month"
            value={fromMonth}
            onChange={(e) => setFromMonth(e.target.value)}
            className={controlClass}
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-white/90">
          Forecast period
          <select
            value={forecastPeriod}
            onChange={(e) => setForecastPeriod(e.target.value)}
            className={controlClass}
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
