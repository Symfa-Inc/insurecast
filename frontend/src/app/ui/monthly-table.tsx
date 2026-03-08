"use client";

import { formatCurrency, formatNumber, monthToLabel } from "@/app/utils/format";

export type MonthlyRow = {
  month: string;
  claims: number;
  paid: number;
  avgCost: number;
};

type MonthlyTableProps = {
  rows: MonthlyRow[];
};

export function MonthlyTable({ rows }: MonthlyTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-200/50 bg-white shadow-sm ring-1 ring-indigo-100/50">
      <div className="overflow-x-auto">
        <table className="w-full min-w-full table-fixed text-sm">
          <thead className="bg-indigo-50/80 text-indigo-900">
            <tr>
              <th className="w-1/4 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-indigo-700">Month</th>
              <th className="w-1/4 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-indigo-700">Claims</th>
              <th className="w-1/4 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-indigo-700">Paid Amount</th>
              <th className="w-1/4 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-indigo-700">Avg Cost per Claim</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month} className="border-t border-indigo-100/80 transition-colors hover:bg-indigo-50/40">
                <td className="w-1/4 px-4 py-3 font-medium text-indigo-900">{monthToLabel(row.month)}</td>
                <td className="w-1/4 px-4 py-3 text-indigo-800/90 tabular-nums">{formatNumber(row.claims)}</td>
                <td className="w-1/4 px-4 py-3 text-indigo-800/90 tabular-nums">{formatCurrency(row.paid)}</td>
                <td className="w-1/4 px-4 py-3 text-indigo-800/90 tabular-nums">{formatCurrency(row.avgCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
