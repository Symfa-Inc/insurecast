"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type ScenarioPanelProps = {
  /** Called with current slider values when the user clicks Apply. */
  onApplyScenario: (
    severityInflationPct: number,
    frequencyShockPct: number,
  ) => void;
  error: string | null;
};

const SEVERITY_TOOLTIP =
  "Scales the modeled average cost per claim (severity) for forecast months when you click Apply. Historical months on the chart keep real series values; only the forecast segment uses this adjustment.";

const FREQUENCY_TOOLTIP =
  "Scales forecast claim counts up or down by this percentage before paid totals and intervals are recalculated. Click Apply to refresh the charts and table.";

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

export function ScenarioPanel({ onApplyScenario, error }: ScenarioPanelProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [severityInflation, setSeverityInflation] = useState(0);
  const [frequencyShock, setFrequencyShock] = useState(0);

  return (
    <div className="px-5 py-6">
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
              {severityInflation}%
            </span>
          </div>
          <input
            type="range"
            name="severityInflation"
            min={0}
            max={20}
            value={severityInflation}
            onChange={(e) => setSeverityInflation(Number(e.target.value))}
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
              {frequencyShock}%
            </span>
          </div>
          <input
            type="range"
            name="frequencyShock"
            min={-10}
            max={25}
            value={frequencyShock}
            onChange={(e) => setFrequencyShock(Number(e.target.value))}
            className={rangeClass}
            aria-describedby="scenario-tip-frequency"
          />
        </div>

        <motion.button
          type="button"
          whileHover={shouldReduceMotion ? undefined : { scale: 1.01 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          onClick={() =>
            void onApplyScenario(severityInflation, frequencyShock)
          }
          className="mt-1 h-9 w-full rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Apply scenario
        </motion.button>
      </div>

      {error ? (
        <div
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          role="alert"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
