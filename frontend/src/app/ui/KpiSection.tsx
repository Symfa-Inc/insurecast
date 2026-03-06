"use client";

type KpiSectionProps = {
  forecastClaims3m: number;
  forecastPaid3m: number;
  avgCost: number;
  yoy: number;
  formatInt: (value: number) => string;
  formatCurrency: (value: number) => string;
};

export default function KpiSection({
  forecastClaims3m,
  forecastPaid3m,
  avgCost,
  yoy,
  formatInt,
  formatCurrency,
}: KpiSectionProps) {
  return (
    <section className="kpis">
      <article>
        <h2>Predicted Claims (next 3m)</h2>
        <p>{formatInt(forecastClaims3m)}</p>
      </article>
      <article>
        <h2>Predicted Paid (next 3m)</h2>
        <p>{formatCurrency(forecastPaid3m)}</p>
      </article>
      <article>
        <h2>Avg Cost per Claim</h2>
        <p>{formatCurrency(avgCost)}</p>
      </article>
      <article>
        <h2>YoY Claims Change</h2>
        <p>{yoy.toFixed(1)}%</p>
      </article>
    </section>
  );
}
