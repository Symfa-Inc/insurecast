import type { ForecastSummaryLLMResponse } from "@/app/utils/api";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export type SummaryLoadPhase = "idle" | "charts" | "llm";

type ForecastSummaryPanelProps = {
  summary: ForecastSummaryLLMResponse | null;
  loadPhase: SummaryLoadPhase;
  supplementalNotice?: string | null;
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

const QUANTITATIVE_PHRASE_RE =
  /(\$[\d,]+(?:\.\d+)?(?:\s?USD)?|\b\d{4}-\d{2}[–-]\d{4}-\d{2}\b|\b\d{4}-\d{2}\b|\b\d+(?:,\d{3})*(?:\.\d+)?%?\b(?:\s+(?:claims?|months?|USD))?)/g;

function emphasizeQuantitativePhrases(
  text: string,
  keyPrefix: string,
  isExplicitStrong = false,
): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = QUANTITATIVE_PHRASE_RE.exec(text)) !== null) {
    if (match.index > last) {
      out.push(text.slice(last, match.index));
    }
    out.push(
      <strong
        key={`${keyPrefix}-${key}`}
        className={
          isExplicitStrong
            ? "rounded-sm bg-blue-100/80 px-1 py-0.5 font-semibold text-stone-800"
            : "rounded-sm bg-blue-50/90 px-1 py-0.5 font-semibold text-stone-700"
        }
      >
        {match[0]}
      </strong>,
    );
    key += 1;
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    out.push(text.slice(last));
  }

  return out.length ? out : [text];
}

function formatNarrativeSegments(text: string): ReactNode[] {
  const re = /\*\*([^*]+)\*\*/g;
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      out.push(
        ...emphasizeQuantitativePhrases(
          text.slice(last, match.index),
          `plain-${key}`,
        ),
      );
    }
    out.push(
      <strong key={`markdown-${key}`} className="font-semibold text-stone-800">
        {emphasizeQuantitativePhrases(match[1], `strong-${key}`, true)}
      </strong>,
    );
    key += 1;
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    out.push(...emphasizeQuantitativePhrases(text.slice(last), `tail-${key}`));
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
        <p className="text-sm font-semibold text-stone-700">{title}</p>
        {detail ? (
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            {detail}
          </p>
        ) : null}
        <p className="mt-1.5 text-[11px] font-medium text-stone-400 transition-opacity duration-500">
          Please wait…
        </p>
      </div>
    </div>
  );
}

function SummaryLoadingBadge({
  loadPhase,
  shouldReduceMotion,
}: {
  loadPhase: SummaryLoadPhase;
  shouldReduceMotion: boolean;
}) {
  const title =
    loadPhase === "charts" ? "Updating forecast…" : "Writing conclusion…";
  const detail =
    loadPhase === "charts"
      ? "Refreshing claims and cost series."
      : "Preparing the new explanation.";

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.18, ease: [0.4, 0, 0.2, 1] }
      }
      className="pointer-events-none absolute right-5 top-4 z-10 max-w-[220px] rounded-md border border-zinc-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <motion.div
          className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-zinc-200 border-t-blue-600"
          animate={shouldReduceMotion ? undefined : { rotate: 360 }}
          transition={
            shouldReduceMotion
              ? undefined
              : { repeat: Infinity, duration: 0.8, ease: "linear" }
          }
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-stone-700">{title}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">
            {detail}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function ForecastSummaryPanel({
  summary,
  loadPhase,
  supplementalNotice,
}: ForecastSummaryPanelProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const loadingCharts = loadPhase === "charts";
  const isLoading = loadPhase === "charts" || loadPhase === "llm";
  const hasSummary = summary != null;

  if (!isLoading && !summary) {
    return null;
  }

  return (
    <section
      className={`relative rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm ${hasSummary && !isLoading ? "border-l-2 border-l-blue-600" : ""}`}
      aria-busy={isLoading}
    >
      {hasSummary ? (
        <div
          className={`space-y-2 transition-opacity ${isLoading ? "opacity-75" : "opacity-100"}`}
        >
          {summary.source === "no_data" ? (
            <div aria-labelledby="forecast-summary-heading">
              <h2
                id="forecast-summary-heading"
                className="text-sm font-semibold text-stone-700"
              >
                Forecast summary
              </h2>
              <p className="mt-1 text-[15px] leading-7 text-stone-600">
                {toSingleConclusionParagraph(summary.narrative)}
              </p>
            </div>
          ) : (
            <div aria-labelledby="forecast-summary-heading">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600/70">
                Forecast conclusion
              </p>
              <h2
                id="forecast-summary-heading"
                className="mb-1 text-sm font-semibold text-stone-700"
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
              {supplementalNotice ? (
                <p className="text-xs leading-relaxed text-stone-500">
                  {supplementalNotice}
                </p>
              ) : null}
              <p className="text-[15px] leading-7 text-stone-600">
                {formatNarrativeSegments(
                  toSingleConclusionParagraph(summary.narrative),
                )}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-[96px] flex-col justify-start pt-0.5">
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
      )}

      <AnimatePresence>
        {isLoading && hasSummary ? (
          <SummaryLoadingBadge
            loadPhase={loadPhase}
            shouldReduceMotion={shouldReduceMotion}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}
