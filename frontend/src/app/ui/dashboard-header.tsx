"use client";

import type { SegmentsResponse } from "@/app/utils/api";
import { filterStatesForUi } from "@/app/utils/allowed-states";
import { useMemo } from "react";

type DashboardHeaderProps = {
  segments: SegmentsResponse | null;
  actualStart: string | null;
  actualEnd: string | null;
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

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function DashboardHeader({
  segments,
  actualStart,
  actualEnd,
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
  const [selectedYear, selectedMonth] = fromMonth.split("-");

  const { years, monthsForYear } = useMemo(() => {
    if (!actualStart || !actualEnd) return { years: [] as string[], monthsForYear: [] as number[] };

    const [startY, startM] = actualStart.split("-").map(Number);
    const [endY, endM] = actualEnd.split("-").map(Number);
    const yrs: string[] = [];
    for (let y = startY; y <= endY; y++) yrs.push(String(y));

    const curY = Number(selectedYear);
    const lo = curY === startY ? startM : 1;
    const hi = curY === endY ? endM : 12;
    const months: number[] = [];
    for (let m = lo; m <= hi; m++) months.push(m);

    return { years: yrs, monthsForYear: months };
  }, [actualStart, actualEnd, selectedYear]);

  function setYear(y: string) {
    if (!actualStart || !actualEnd) return;
    const [startY, startM] = actualStart.split("-").map(Number);
    const [endY, endM] = actualEnd.split("-").map(Number);
    const numY = Number(y);
    const lo = numY === startY ? startM : 1;
    const hi = numY === endY ? endM : 12;
    const curM = Number(selectedMonth);
    const clamped = Math.max(lo, Math.min(hi, curM));
    setFromMonth(`${y}-${String(clamped).padStart(2, "0")}`);
  }

  function setMonth(m: string) {
    setFromMonth(`${selectedYear}-${m.padStart(2, "0")}`);
  }

  return (
    <div className="px-5 py-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600/60 mb-4">
        Parameters
      </p>

      <div className="flex flex-col gap-4">
        <label className="text-xs font-medium text-zinc-500">
          State
          <select
            name="state"
            autoComplete="off"
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
            name="industry"
            autoComplete="off"
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
            name="claimType"
            autoComplete="off"
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
        <fieldset className="text-xs font-medium text-zinc-500">
          <legend className="text-xs font-medium text-zinc-500">From</legend>
          <div className="mt-1.5 flex gap-2">
            <select
              name="fromYear"
              autoComplete="off"
              value={selectedYear}
              onChange={(e) => setYear(e.target.value)}
              className={`${selectClass} mt-0 flex-1`}
              style={chevronStyle}
            >
              {years.length > 0 ? (
                years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))
              ) : (
                <option value={selectedYear}>{selectedYear}</option>
              )}
            </select>
            <select
              name="fromMonthNum"
              autoComplete="off"
              value={String(Number(selectedMonth))}
              onChange={(e) => setMonth(e.target.value)}
              className={`${selectClass} mt-0 flex-1`}
              style={chevronStyle}
            >
              {monthsForYear.length > 0 ? (
                monthsForYear.map((m) => (
                  <option key={m} value={String(m)}>
                    {MONTH_NAMES[m - 1]}
                  </option>
                ))
              ) : (
                <option value={String(Number(selectedMonth))}>
                  {MONTH_NAMES[Number(selectedMonth) - 1]}
                </option>
              )}
            </select>
          </div>
        </fieldset>
        <label className="text-xs font-medium text-zinc-500">
          Forecast period
          <select
            name="forecastPeriod"
            autoComplete="off"
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
