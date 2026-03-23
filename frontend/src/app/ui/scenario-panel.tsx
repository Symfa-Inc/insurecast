"use client";

import { useState } from "react";

type ScenarioPanelProps = {
  /** Called with current slider values when the user clicks Apply. */
  onApplyScenario: (
    severityInflationPct: number,
    frequencyShockPct: number,
  ) => void;
  error: string | null;
};

/** Strip default UA shadow/outline “frame” on range inputs; keep flat track + thumb. */
const rangeClass = [
  "mt-2 h-3 w-full max-w-full cursor-pointer bg-transparent shadow-none",
  "appearance-none [-webkit-appearance:none]",
  "outline-none ring-0 focus:shadow-none focus:outline-none focus:ring-0",
  "focus-visible:outline-none focus-visible:ring-0",
  "accent-white disabled:opacity-50",
  "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full",
  "[&::-webkit-slider-runnable-track]:border-0 [&::-webkit-slider-runnable-track]:bg-white/25",
  "[&::-webkit-slider-runnable-track]:shadow-none",
  "[&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
  "[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:rounded-full",
  "[&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white",
  "[&::-webkit-slider-thumb]:shadow-none [&::-webkit-slider-thumb]:[box-shadow:none]",
  "[&::-webkit-slider-thumb]:[-webkit-appearance:none]",
  "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:border-0",
  "[&::-moz-range-track]:bg-white/25 [&::-moz-range-track]:shadow-none",
  "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full",
  "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-none",
  "[&::-moz-range-thumb]:[box-shadow:none]",
].join(" ");

export function ScenarioPanel({ onApplyScenario, error }: ScenarioPanelProps) {
  const [severityInflation, setSeverityInflation] = useState(0);
  const [frequencyShock, setFrequencyShock] = useState(0);

  return (
    <section className="rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-teal-600 p-5 text-white shadow-lg shadow-indigo-200/30">
      <p className="text-lg font-bold tracking-tight">Scenario</p>
      <p className="mt-1 text-xs text-white/85">
        Adjust severity and frequency, then apply
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-white/90">
          Severity inflation ({severityInflation}%)
          <input
            type="range"
            min={0}
            max={20}
            value={severityInflation}
            onChange={(e) => setSeverityInflation(Number(e.target.value))}
            className={rangeClass}
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-white/90">
          Frequency shock ({frequencyShock}%)
          <input
            type="range"
            min={-10}
            max={25}
            value={frequencyShock}
            onChange={(e) => setFrequencyShock(Number(e.target.value))}
            className={rangeClass}
          />
        </label>
        <button
          type="button"
          onClick={() =>
            void onApplyScenario(severityInflation, frequencyShock)
          }
          className="mt-1 h-11 w-full rounded-lg border border-white/30 bg-white px-4 text-sm font-semibold text-indigo-700 shadow-sm transition-all duration-200 hover:bg-white/90 focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-indigo-600"
        >
          Apply scenario
        </button>
      </div>

      {error ? (
        <p
          className="mt-3 rounded-lg border border-rose-200/40 bg-rose-950/35 px-3 py-2 text-sm text-rose-50"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
