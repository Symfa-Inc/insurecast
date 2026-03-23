import type { ClaimsPoint, CostsPoint } from "./api";

const SANE_MAX = 1e6;

function isPlottableNumber(n: unknown): boolean {
  return (
    typeof n === "number" && isFinite(n) && n >= 0 && n < SANE_MAX && n !== 0
  );
}

/** Matches backend `series_rows_have_plottable_chart_data` / dashboard chart “No data” behavior. */
export function rawSeriesHasPlottableChartData(
  claims: ClaimsPoint[],
  costs: CostsPoint[],
): boolean {
  for (const p of claims) {
    if (isPlottableNumber(p.claims_count_actual)) return true;
    if (isPlottableNumber(p.claims_count_forecast)) return true;
  }
  for (const p of costs) {
    if (isPlottableNumber(p.paid_amount_actual)) return true;
    if (isPlottableNumber(p.paid_amount_forecast)) return true;
  }
  return false;
}
