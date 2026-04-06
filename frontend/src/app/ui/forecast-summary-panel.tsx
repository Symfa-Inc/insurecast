import type { ForecastSummaryLLMResponse } from "@/app/utils/api";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
      <strong key={key} className="font-medium text-zinc-900">
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
  shouldReduceMotion,
}: {
  title: string;
  detail?: string;
  shouldReduceMotion: boolean;
}) {
  return (
    <div
      className="flex items-start gap-3 py-0.5"
      aria-busy="true"
      aria-live="polite"
    >
      <motion.div
        className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-zinc-200 border-t-blue-600"
        animate={shouldReduceMotion ? undefined : { rotate: 360 }}
        transition={
          shouldReduceMotion
            ? undefined
            : { repeat: Infinity, duration: 0.8, ease: "linear" }
        }
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-800">{title}</p>
        {detail ? (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{detail}</p>
        ) : null}
        <p className="mt-1.5 text-[11px] font-medium text-zinc-400 transition-opacity duration-500">
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
  const shouldReduceMotion = useReducedMotion() ?? false;
  const loadingCharts = loadPhase === "charts";
  const isLoading = loadPhase === "charts" || loadPhase === "llm";

  if (!isLoading && !summary) {
    return null;
  }

  const summaryKey = summary?.segment_label ?? loadPhase ?? "empty";

  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm"
      aria-busy={isLoading}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={summaryKey}
          initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.25, ease: [0.4, 0, 0.2, 1] }
          }
          style={{ overflow: "hidden" }}
        >
          {isLoading ? (
            <div className="flex flex-col justify-start pt-0.5">
              {loadingCharts ? (
                <SummaryLoadingInline
                  title="Loading chart data…"
                  detail="Fetching claims and cost series for your selection."
                  shouldReduceMotion={shouldReduceMotion}
                />
              ) : (
                <SummaryLoadingInline
                  title="Generating forecast conclusion…"
                  shouldReduceMotion={shouldReduceMotion}
                />
              )}
            </div>
          ) : summary ? (
            <div className="space-y-2">
              {summary.source === "no_data" ? (
                <div aria-labelledby="forecast-summary-heading">
                  <h2
                    id="forecast-summary-heading"
                    className="text-sm font-semibold text-zinc-800"
                  >
                    Forecast summary
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-700">
                    {toSingleConclusionParagraph(summary.narrative)}
                  </p>
                </div>
              ) : (
                <div aria-labelledby="forecast-summary-heading">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    Forecast conclusion
                  </p>
                  <h2
                    id="forecast-summary-heading"
                    className="mb-1 text-sm font-semibold text-zinc-800"
                  >
                    {summary.segment_label}
                  </h2>
                  {summary.notice ? (
                    <p
                      className="text-xs leading-relaxed text-amber-700"
                      role="status"
                    >
                      {summary.notice}
                    </p>
                  ) : null}
                  <p className="text-sm leading-relaxed text-zinc-700">
                    {formatBoldSegments(
                      toSingleConclusionParagraph(summary.narrative),
                    )}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
