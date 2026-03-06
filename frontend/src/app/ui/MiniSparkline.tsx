"use client";

type MiniSparklineProps = {
  values: number[];
  stroke: string;
};

export default function MiniSparkline({ values, stroke }: MiniSparklineProps) {
  if (values.length === 0) {
    return <div className="sparkline" aria-hidden="true" />;
  }

  const width = 420;
  const height = 120;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sparkline" role="img">
      <polyline fill="none" stroke={stroke} strokeWidth="3" points={points} />
    </svg>
  );
}
