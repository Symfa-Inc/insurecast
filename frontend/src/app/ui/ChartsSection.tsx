"use client";

import MiniSparkline from "./MiniSparkline";

type ChartsSectionProps = {
  claimsValues: number[];
  costsValues: number[];
};

export default function ChartsSection({ claimsValues, costsValues }: ChartsSectionProps) {
  return (
    <section className="charts">
      <article>
        <h2>Monthly Claims Forecast</h2>
        <MiniSparkline values={claimsValues} stroke="#003f5c" />
      </article>
      <article>
        <h2>Monthly Paid Amount Forecast</h2>
        <MiniSparkline values={costsValues} stroke="#bc5090" />
      </article>
    </section>
  );
}
