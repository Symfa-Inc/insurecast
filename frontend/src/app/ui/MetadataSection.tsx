"use client";

import type { MetadataResponse } from "../utils/api";

type MetadataSectionProps = {
  metadata: MetadataResponse | null;
};

export default function MetadataSection({ metadata }: MetadataSectionProps) {
  return (
    <section className="metadata">
      <h2>Model Transparency</h2>
      <p>
        Model: <strong>{metadata?.model_name}</strong>
      </p>
      <p>
        MAE: {metadata?.mae} | RMSE: {metadata?.rmse} | MAPE: {metadata?.mape}%
      </p>
      <p>
        Assumptions:{" "}
        {Object.entries(metadata?.assumptions_json ?? {})
          .map(([key, value]) => `${key}=${value}`)
          .join(", ")}
      </p>
    </section>
  );
}
