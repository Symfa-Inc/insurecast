export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function monthToLabel(month: string): string {
  const date = new Date(`${month}-01T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
