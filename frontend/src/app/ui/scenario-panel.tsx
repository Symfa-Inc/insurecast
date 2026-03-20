"use client";

type ScenarioPanelProps = {
  severityInflation: number;
  setSeverityInflation: (value: number) => void;
  frequencyShock: number;
  setFrequencyShock: (value: number) => void;
  onApplyScenario: () => void;
  error: string | null;
};

export function ScenarioPanel({
  severityInflation,
  setSeverityInflation,
  frequencyShock,
  setFrequencyShock,
  onApplyScenario,
  error,
}: ScenarioPanelProps) {
  return (
    <section className="rounded-2xl border border-indigo-200/50 bg-white p-5 shadow-sm ring-1 ring-indigo-100/50">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700/80">Scenario</p>
      <p className="mt-0.5 text-xs text-indigo-600/70">Adjust severity and frequency, then apply</p>
      <div className="mt-3 flex flex-col gap-3">
        <label className="text-sm font-semibold text-indigo-900/80">
          Severity Inflation: {severityInflation}%
          <input
            type="range"
            min={0}
            max={20}
            value={severityInflation}
            onChange={(e) => setSeverityInflation(Number(e.target.value))}
            className="mt-2 w-full accent-indigo-600"
          />
        </label>
        <label className="text-sm font-semibold text-indigo-900/80">
          Frequency Shock: {frequencyShock}%
          <input
            type="range"
            min={-10}
            max={25}
            value={frequencyShock}
            onChange={(e) => setFrequencyShock(Number(e.target.value))}
            className="mt-2 w-full accent-indigo-600"
          />
        </label>
        <button
          type="button"
          onClick={() => void onApplyScenario()}
          className="h-11 w-full rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-indigo-700 hover:shadow-lg"
        >
          Apply scenario
        </button>
      </div>

      {error && <p className="mt-3 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</p>}
    </section>
  );
}
