"use client";

import type { MetadataResponse } from "@/app/utils/api";

type ModelMetadataProps = {
  metadata: MetadataResponse | null;
};

export function ModelMetadata({ metadata }: ModelMetadataProps) {
  return (
    <section className="rounded-2xl border border-indigo-200/50 bg-white px-5 py-4 text-sm text-indigo-800/90 shadow-sm ring-1 ring-indigo-100/50">
      <span className="font-medium text-indigo-700">Model:</span> <span className="font-semibold text-indigo-900">{metadata?.model_name ?? "N/A"}</span>
      <span className="mx-2 text-indigo-300">·</span>
      <span className="font-medium text-indigo-700">MAE:</span> {metadata?.mae ?? "-"}
      <span className="mx-2 text-indigo-300">·</span>
      <span className="font-medium text-indigo-700">RMSE:</span> {metadata?.rmse ?? "-"}
      <span className="mx-2 text-indigo-300">·</span>
      <span className="font-medium text-indigo-700">MAPE:</span> {metadata?.mape ?? "-"}%
    </section>
  );
}
