import type { ForecastSummaryLLMResponse } from "@/app/utils/api";
import type { ReactNode } from "react";

export type SummaryLoadPhase = "idle" | "charts" | "llm";

type ForecastSummaryPanelProps = {
  summary: ForecastSummaryLLMResponse | null;
  loadPhase: SummaryLoadPhase;
};

/** Remove markdown heading markers (####, ###, etc.) from model output. */
function stripMarkdownHeadings(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.replace(/^#{1,6}\s+/, "").trimEnd())
    .join("\n");
}

/** Force one paragraph: collapse newlines/extra spaces (model may still break lines). */
function toSingleConclusionParagraph(raw: string): string {
  return stripMarkdownHeadings(raw)
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatBoldSegments(text: string): ReactNode[] {
  const re = /\*\*([^*]+)\*\*/g;
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      out.push(text.slice(last, match.index));
    }
    out.push(
      <strong key={key} className="font-semibold text-indigo-950">
        {match[1]}
      </strong>,
    );
    key += 1;
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    out.push(text.slice(last));
  }
  return out;
}

function SummaryLoadingInline({
  title,
  detail,
  tone = "indigo",
}: {
  title: string;
  detail?: string;
  tone?: "indigo" | "violet";
}) {
  const spin =
    tone === "violet"
      ? "border-violet-200 border-t-violet-700"
      : "border-indigo-200 border-t-indigo-600";

  return (
    <div
      className="flex items-start gap-3 py-0.5"
      aria-busy="true"
      aria-live="polite"
    >
      <div
        className={`mt-0.5 size-5 shrink-0 animate-spin rounded-full border-2 ${spin}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-indigo-950">{title}</p>
        {detail ? (
          <p className="mt-1 text-xs leading-relaxed text-indigo-800/80">
            {detail}
          </p>
        ) : null}
        <p className="mt-1.5 text-[11px] font-medium text-indigo-500/80 transition-opacity duration-500">
          Please wait…
        </p>
      </div>
    </div>
  );
}

export function ForecastSummaryPanel({
  summary,
  loadPhase,
}: ForecastSummaryPanelProps) {
  const loadingCharts = loadPhase === "charts";
  const isLoading = loadPhase === "charts" || loadPhase === "llm";

  if (!isLoading && !summary) {
    return null;
  }

  return (
    <section aria-busy={isLoading}>
      {isLoading ? (
        <div
          key={loadingCharts ? "phase-charts" : "phase-llm"}
          className="forecast-summary-enter flex flex-col justify-start pt-0.5"
        >
          {loadingCharts ? (
            <SummaryLoadingInline
              title="Loading chart data…"
              detail="Fetching claims and cost series for your selection."
            />
          ) : (
            <SummaryLoadingInline
              tone="violet"
              title="Generating forecast conclusion…"
            />
          )}
        </div>
      ) : summary ? (
        <div key="summary-content" className="forecast-summary-enter space-y-2">
          {summary.source === "no_data" ? (
            <div
              className="text-slate-800"
              aria-labelledby="forecast-summary-heading"
            >
              <h2
                id="forecast-summary-heading"
                className="text-base font-semibold text-slate-900 md:text-lg"
              >
                Forecast summary
              </h2>
              <p className="text-sm leading-relaxed text-slate-700">
                {toSingleConclusionParagraph(summary.narrative)}
              </p>
            </div>
          ) : (
            <div
              className="text-indigo-950"
              aria-labelledby="forecast-summary-heading"
            >
              <h2
                id="forecast-summary-heading"
                className="text-base font-semibold md:text-lg"
              >
                Forecast conclusion — {summary.segment_label}
              </h2>
              {summary.notice ? (
                <p
                  className="text-xs leading-relaxed text-amber-900/90"
                  role="status"
                >
                  {summary.notice}
                </p>
              ) : null}
              <p className="text-sm leading-relaxed text-indigo-900/90">
                {formatBoldSegments(
                  toSingleConclusionParagraph(summary.narrative),
                )}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
