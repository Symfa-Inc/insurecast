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
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
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
          className="h-11 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition-all duration-200 hover:shadow-lg"
        >
          Apply Scenario
        </button>
      </div>

      {error && <p className="mt-3 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</p>}
    </section>
  );
}
