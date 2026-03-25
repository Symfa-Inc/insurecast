"use client";

import { useState } from "react";
import { formatCurrency, formatNumber, monthToLabel } from "@/app/utils/format";

export type MonthlyRow = {
  month: string;
  claims: number;
  paid: number;
  avgCost: number;
  /** True when this month is in the forecast horizon (no actual claims yet) */
  isForecast: boolean;
};

type MonthlyTableProps = {
  rows: MonthlyRow[];
};

function EmptyTableState() {
  return (
    <div className="px-4 py-8 text-center text-indigo-500/80">
      <p className="text-base font-medium">No data</p>
    </div>
  );
}

const thClass =
  "border-b border-indigo-200/60 px-2 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-indigo-700 sm:px-3 md:px-4";
const tdBase = "px-2 py-3 align-middle text-center sm:px-3 md:px-4";
const tdHistorical = `${tdBase} border-b border-indigo-100/70`;
const tdForecast = `${tdBase} border-b border-violet-200/55`;

export function MonthlyTable({ rows }: MonthlyTableProps) {
  const hasRows = rows.length > 0;
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-200/50 bg-white shadow-sm ring-1 ring-indigo-100/50">
      <button
        type="button"
        id="monthly-table-toggle"
        aria-expanded={expanded}
        aria-controls="monthly-table-panel"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full cursor-pointer items-start justify-between gap-3 border-b border-indigo-100/80 bg-indigo-50/60 px-4 py-3 text-left transition-colors hover:bg-indigo-50/90"
      >
        <div>
          <h2 className="text-base font-semibold text-indigo-900">
            Monthly values
          </h2>
          <p className="mt-0.5 text-xs text-indigo-600/80">
            Forecast rows use a soft violet tint; historical rows stay on white.
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-indigo-200/80 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700">
          {expanded ? "Hide" : "Show"}
        </span>
      </button>

      {expanded && (
        <div
          id="monthly-table-panel"
          role="region"
          aria-labelledby="monthly-table-toggle"
        >
          {hasRows ? (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-full table-fixed border-collapse text-sm md:text-[0.9375rem]">
                <colgroup>
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "18.75%" }} />
                  <col style={{ width: "28.125%" }} />
                  <col style={{ width: "28.125%" }} />
                </colgroup>
                <thead className="bg-indigo-50/90">
                  <tr>
                    <th className={thClass}>Month</th>
                    <th className={thClass}>Claims</th>
                    <th className={thClass}>Paid amount</th>
                    <th className={thClass}>Avg cost per claim</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.month}
                      className={
                        row.isForecast
                          ? "bg-violet-50/85 transition-colors hover:bg-violet-100/70"
                          : "transition-colors hover:bg-indigo-50/40"
                      }
                    >
                      <td
                        className={
                          row.isForecast
                            ? `${tdForecast} text-violet-950`
                            : `${tdHistorical} text-indigo-900`
                        }
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={`font-medium ${row.isForecast ? "text-violet-950" : "text-indigo-900"}`}
                          >
                            {monthToLabel(row.month)}
                          </span>
                          {row.isForecast && (
                            <span className="text-[10px] font-medium uppercase tracking-wide text-violet-700/90">
                              forecast
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className={`tabular-nums ${row.isForecast ? `${tdForecast} text-violet-900/95` : `${tdHistorical} text-indigo-800/90`}`}
                      >
                        {formatNumber(row.claims)}
                      </td>
                      <td
                        className={`tabular-nums ${row.isForecast ? `${tdForecast} text-violet-900/95` : `${tdHistorical} text-indigo-800/90`}`}
                      >
                        {formatCurrency(row.paid)}
                      </td>
                      <td
                        className={`tabular-nums ${row.isForecast ? `${tdForecast} text-violet-900/95` : `${tdHistorical} text-indigo-800/90`}`}
                      >
                        {formatCurrency(row.avgCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyTableState />
          )}
        </div>
      )}
    </section>
  );
}
