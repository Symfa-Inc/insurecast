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

const chevronStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='none' stroke='%23a1a1aa' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M2.5 4.5 6 8l3.5-3.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 10px center",
  paddingRight: "28px",
};

const selectClass =
  "mt-1.5 h-9 w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 hover:border-zinc-300 transition-colors";

const inputClass =
  "mt-1.5 h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 hover:border-zinc-300 transition-colors";

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
    <div className="px-5 py-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
        Parameters
      </p>

      <div className="flex flex-col gap-4">
        <label className="text-xs font-medium text-zinc-500">
          State
          <select
            value={stateValue}
            onChange={(e) => setStateValue(e.target.value)}
            className={selectClass}
            style={chevronStyle}
          >
            {filterStatesForUi(segments?.states ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-zinc-500">
          Industry
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className={selectClass}
            style={chevronStyle}
          >
            {(segments?.industries ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-zinc-500">
          Claim type
          <select
            value={claimType}
            onChange={(e) => setClaimType(e.target.value)}
            className={selectClass}
            style={chevronStyle}
          >
            {(segments?.claim_types ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-zinc-500">
          From
          <input
            type="month"
            value={fromMonth}
            onChange={(e) => setFromMonth(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-xs font-medium text-zinc-500">
          Forecast period
          <select
            value={forecastPeriod}
            onChange={(e) => setForecastPeriod(e.target.value)}
            className={selectClass}
            style={chevronStyle}
          >
            <option value="1">1 month</option>
            <option value="3">3 months</option>
            <option value="6">6 months</option>
            <option value="12">12 months</option>
          </select>
        </label>
      </div>
    </div>
  );
}
