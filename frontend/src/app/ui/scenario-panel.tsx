"use client";

import { motion, useReducedMotion } from "framer-motion";

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

const SEVERITY_TOOLTIP =
  "Scales the modeled average cost per claim for forecast months after you update the forecast. Historical months keep the real series values.";

const FREQUENCY_TOOLTIP =
  "Scales forecast claim counts up or down after you update the forecast. Charts and table reflect the adjusted outlook.";

const rangeClass = [
  "w-full h-1 appearance-none rounded-full bg-zinc-200 cursor-pointer",
  "[&::-webkit-slider-thumb]:appearance-none",
  "[&::-webkit-slider-thumb]:w-3",
  "[&::-webkit-slider-thumb]:h-3",
  "[&::-webkit-slider-thumb]:rounded-full",
  "[&::-webkit-slider-thumb]:bg-blue-600",
  "[&::-webkit-slider-thumb]:shadow-sm",
  "[&::-moz-range-thumb]:w-3",
  "[&::-moz-range-thumb]:h-3",
  "[&::-moz-range-thumb]:rounded-full",
  "[&::-moz-range-thumb]:bg-blue-600",
  "[&::-moz-range-thumb]:border-0",
].join(" ");

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
  const statusLabel = hasUnappliedChanges
    ? `${pendingChangeCount} unapplied ${pendingChangeCount === 1 ? "change" : "changes"}`
    : "Forecast is up to date.";

  return (
    <div className="flex min-h-full flex-1 flex-col px-5 py-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
        Scenario
      </p>

      <div className="flex flex-col gap-1">
        <p id="scenario-tip-severity" className="sr-only">
          {SEVERITY_TOOLTIP}
        </p>
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <label
              className="text-xs text-zinc-500 cursor-help"
              title={SEVERITY_TOOLTIP}
            >
              Severity inflation
            </label>
            <span className="text-sm font-semibold text-zinc-900">
              {severityInflationPct}%
            </span>
          </div>
          <input
            type="range"
            name="severityInflation"
            min={0}
            max={20}
            value={severityInflationPct}
            onChange={(e) => setSeverityInflationPct(Number(e.target.value))}
            className={rangeClass}
            aria-describedby="scenario-tip-severity"
          />
        </div>

        <p id="scenario-tip-frequency" className="sr-only">
          {FREQUENCY_TOOLTIP}
        </p>
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <label
              className="text-xs text-zinc-500 cursor-help"
              title={FREQUENCY_TOOLTIP}
            >
              Frequency shock
            </label>
            <span className="text-sm font-semibold text-zinc-900">
              {frequencyShockPct}%
            </span>
          </div>
          <input
            type="range"
            name="frequencyShock"
            min={-10}
            max={25}
            value={frequencyShockPct}
            onChange={(e) => setFrequencyShockPct(Number(e.target.value))}
            className={rangeClass}
            aria-describedby="scenario-tip-frequency"
          />
        </div>
      </div>

      <div className="mt-auto border-t border-zinc-100 pt-4">
        <div className="mb-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Draft
          </p>
          <p className="text-sm text-zinc-700">{statusLabel}</p>
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
          className="h-10 w-full rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
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
