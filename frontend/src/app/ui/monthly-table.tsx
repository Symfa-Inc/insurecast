"use client";

import { formatCurrency, formatNumber, monthToLabel } from "@/app/utils/format";
import { useState } from "react";

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

const PREVIEW_COUNT = 3;

function EmptyTableState() {
  return (
    <div className="px-4 py-8 text-center text-zinc-400">
      <p className="text-sm font-medium">No data</p>
    </div>
  );
}

const thClass =
  "border-b border-zinc-200 px-2 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:px-3 md:px-4";
const tdBase = "px-2 py-3 align-middle text-center sm:px-3 md:px-4";
const tdHistorical = `${tdBase} border-b border-zinc-100`;
const tdForecast = `${tdBase} border-b border-zinc-100`;

function Row({ row }: { row: MonthlyRow }) {
  return (
    <tr
      className={
        row.isForecast
          ? "bg-blue-50/40 transition-colors hover:bg-blue-100/40"
          : "bg-white transition-colors hover:bg-zinc-50"
      }
    >
      <td
        className={
          row.isForecast
            ? `${tdForecast} text-zinc-800`
            : `${tdHistorical} text-zinc-800`
        }
      >
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-medium text-zinc-800">
            {monthToLabel(row.month)}
          </span>
          {row.isForecast ? (
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
              forecast
            </span>
          ) : null}
        </div>
      </td>
      <td
        className={`tabular-nums ${row.isForecast ? `${tdForecast} text-zinc-800` : `${tdHistorical} text-zinc-800`}`}
      >
        {formatNumber(row.claims)}
      </td>
      <td
        className={`tabular-nums ${row.isForecast ? `${tdForecast} text-zinc-800` : `${tdHistorical} text-zinc-800`}`}
      >
        {formatCurrency(row.paid)}
      </td>
      <td
        className={`tabular-nums ${row.isForecast ? `${tdForecast} text-zinc-800` : `${tdHistorical} text-zinc-800`}`}
      >
        {formatCurrency(row.avgCost)}
      </td>
    </tr>
  );
}

export function MonthlyTable({ rows }: MonthlyTableProps) {
  const hasRows = rows.length > 0;
  const [showAll, setShowAll] = useState(false);

  const canExpand = rows.length > PREVIEW_COUNT;
  const visibleRows = showAll ? rows : rows.slice(0, PREVIEW_COUNT);
  const hiddenCount = rows.length - PREVIEW_COUNT;

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-800">Monthly values</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Forecast rows are highlighted in blue.
        </p>
      </div>

      {hasRows ? (
        <>
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col style={{ width: "25%" }} />
                <col style={{ width: "18.75%" }} />
                <col style={{ width: "28.125%" }} />
                <col style={{ width: "28.125%" }} />
              </colgroup>
              <thead className="bg-white">
                <tr>
                  <th className={thClass}>Month</th>
                  <th className={thClass}>Claims</th>
                  <th className={thClass}>Paid amount</th>
                  <th className={thClass}>Avg cost per claim</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <Row key={row.month} row={row} />
                ))}
              </tbody>
            </table>
          </div>
          {canExpand && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-zinc-100 py-2.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700"
            >
              {showAll
                ? "Show less"
                : `Show ${hiddenCount} more row${hiddenCount === 1 ? "" : "s"}`}
            </button>
          )}
        </>
      ) : (
        <EmptyTableState />
      )}
    </section>
  );
}
