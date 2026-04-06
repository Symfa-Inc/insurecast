"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type ScenarioPanelProps = {
  severityInflationPct: number;
  setSeverityInflationPct: (value: number) => void;
  frequencyShockPct: number;
  setFrequencyShockPct: (value: number) => void;
  pendingChangeCount: number;
  hasUnappliedChanges: boolean;
  isApplying: boolean;
  onApplyChanges: () => void;
  onResetChanges: () => void;
  error: string | null;
};

const TOOLTIPS = {
  severity:
    "Scales the modeled average cost per claim for forecast months. Historical months always keep their real values.",
  frequency:
    "Scales forecast claim counts up or down. Charts and the monthly table reflect the adjusted outlook.",
};

type TipKey = keyof typeof TOOLTIPS;
type TipState = { key: TipKey; top: number; left: number } | null;

// Custom slider — uses an inline linear-gradient so the filled track is
// always exactly the accent color, with no browser inconsistencies.
function Slider({
  name,
  min,
  max,
  value,
  onChange,
  ariaLabel,
}: {
  name: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const track = `linear-gradient(to right, #2563eb ${pct}%, #e4e4e7 ${pct}%)`;

  return (
    <input
      type="range"
      name={name}
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={ariaLabel}
      style={{ background: track }}
      className={[
        "w-full cursor-pointer appearance-none rounded-full",
        "h-1.5",
        // Webkit thumb — white disc with blue ring
        "[&::-webkit-slider-thumb]:appearance-none",
        "[&::-webkit-slider-thumb]:h-4",
        "[&::-webkit-slider-thumb]:w-4",
        "[&::-webkit-slider-thumb]:rounded-full",
        "[&::-webkit-slider-thumb]:border-2",
        "[&::-webkit-slider-thumb]:border-blue-600",
        "[&::-webkit-slider-thumb]:bg-white",
        "[&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.18)]",
        "[&::-webkit-slider-thumb]:transition-shadow",
        "[&::-webkit-slider-thumb:hover]:shadow-[0_0_0_4px_rgba(37,99,235,0.12),0_1px_4px_rgba(0,0,0,0.18)]",
        "[&::-webkit-slider-thumb:active]:shadow-[0_0_0_6px_rgba(37,99,235,0.15),0_1px_4px_rgba(0,0,0,0.18)]",
        // Firefox thumb
        "[&::-moz-range-thumb]:h-4",
        "[&::-moz-range-thumb]:w-4",
        "[&::-moz-range-thumb]:rounded-full",
        "[&::-moz-range-thumb]:border-2",
        "[&::-moz-range-thumb]:border-blue-600",
        "[&::-moz-range-thumb]:bg-white",
        "[&::-moz-range-thumb]:shadow-sm",
        // Firefox track — gradient doesn't apply, use flat zinc + moz-range-progress
        "[&::-moz-range-track]:h-1.5",
        "[&::-moz-range-track]:rounded-full",
        "[&::-moz-range-track]:bg-zinc-200",
        "[&::-moz-range-progress]:h-1.5",
        "[&::-moz-range-progress]:rounded-full",
        "[&::-moz-range-progress]:bg-blue-600",
        // Focus ring
        "focus-visible:outline-none",
        "focus-visible:ring-2",
        "focus-visible:ring-blue-600",
        "focus-visible:ring-offset-2",
      ].join(" ")}
    />
  );
}

function InfoButton({
  tipKey,
  active,
  onOpen,
}: {
  tipKey: TipKey;
  active: boolean;
  onOpen: (key: TipKey, rect: DOMRect) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`About ${tipKey}`}
      aria-expanded={active}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(tipKey, e.currentTarget.getBoundingClientRect());
      }}
      className="ml-1.5 inline-flex items-center justify-center rounded-full p-0.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
    >
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
        <path strokeLinecap="round" strokeWidth="1.5" d="M12 11v5" />
        <circle cx="12" cy="7.5" r="0.75" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}

export function ScenarioPanel({
  severityInflationPct,
  setSeverityInflationPct,
  frequencyShockPct,
  setFrequencyShockPct,
  pendingChangeCount,
  hasUnappliedChanges,
  isApplying,
  onApplyChanges,
  onResetChanges,
  error,
}: ScenarioPanelProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [tip, setTip] = useState<TipState>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const openTip = (key: TipKey, rect: DOMRect) => {
    if (tip?.key === key) { setTip(null); return; }
    setTip({ key, top: rect.bottom + 6, left: rect.left });
  };

  useEffect(() => {
    if (!tip) return;
    const close = (e: MouseEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) setTip(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [tip]);

  const statusLabel = hasUnappliedChanges
    ? `${pendingChangeCount} unapplied ${pendingChangeCount === 1 ? "change" : "changes"}`
    : "Forecast is up to date.";

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 py-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600/60 mb-4">
        Scenario
      </p>

      <div className="flex-1 pb-4">
        <div className="flex flex-col gap-1">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center text-xs text-zinc-500">
                Severity inflation
                <InfoButton
                  tipKey="severity"
                  active={tip?.key === "severity"}
                  onOpen={openTip}
                />
              </span>
              <span className="text-sm font-semibold tabular-nums text-zinc-900">
                {severityInflationPct}%
              </span>
            </div>
            <Slider
              name="severityInflation"
              min={0}
              max={20}
              value={severityInflationPct}
              onChange={setSeverityInflationPct}
              ariaLabel="Severity inflation"
            />
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center text-xs text-zinc-500">
                Frequency shock
                <InfoButton
                  tipKey="frequency"
                  active={tip?.key === "frequency"}
                  onOpen={openTip}
                />
              </span>
              <span className="text-sm font-semibold tabular-nums text-zinc-900">
                {frequencyShockPct}%
              </span>
            </div>
            <Slider
              name="frequencyShock"
              min={-10}
              max={25}
              value={frequencyShockPct}
              onChange={setFrequencyShockPct}
              ariaLabel="Frequency shock"
            />
          </div>
        </div>
      </div>

      {/* Fixed-position popover — escapes overflow containers */}
      <AnimatePresence>
        {tip && (
          <motion.div
            ref={popoverRef}
            key={tip.key}
            role="tooltip"
            initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{ position: "fixed", top: tip.top, left: tip.left }}
            className="z-50 w-56 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 shadow-lg"
          >
            <p className="text-xs leading-relaxed text-zinc-600">
              {TOOLTIPS[tip.key]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="-mx-5 mt-auto border-t border-zinc-100 bg-white px-5 pb-6 pt-4">
        <div className="mb-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600/60">
            Draft
          </p>
          <p className="flex items-center gap-1.5 text-sm text-zinc-700">
            <span
              className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${hasUnappliedChanges ? "bg-amber-500" : "bg-emerald-500"}`}
            />
            {statusLabel}
          </p>
          <p className="text-xs leading-relaxed text-zinc-500">
            Sidebar changes stay local until you update the forecast.
          </p>
        </div>
        <motion.button
          type="button"
          whileHover={shouldReduceMotion ? undefined : { scale: 1.01 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          onClick={onApplyChanges}
          disabled={!hasUnappliedChanges || isApplying}
          className="h-10 w-full rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
        >
          {isApplying ? "Updating…" : "Update Forecast"}
        </motion.button>
        <button
          type="button"
          onClick={onResetChanges}
          disabled={!hasUnappliedChanges || isApplying}
          className="mt-2 h-9 w-full rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-400"
        >
          Reset Draft
        </button>

        {error ? (
          <div
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            role="alert"
          >
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
