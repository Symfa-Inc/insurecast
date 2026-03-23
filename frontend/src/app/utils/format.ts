export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value,
  );
}

export function monthToLabel(month: string): string {
  const date = new Date(`${month}-01T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Add n months to a YYYY-MM string, returns YYYY-MM */
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Compare YYYY-MM strings; returns -1 if a < b, 0 if equal, 1 if a > b */
export function compareMonths(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
