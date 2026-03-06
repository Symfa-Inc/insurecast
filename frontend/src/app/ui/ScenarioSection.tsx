"use client";

type ScenarioSectionProps = {
  severityInflation: number;
  frequencyShock: number;
  onSeverityInflationChange: (value: number) => void;
  onFrequencyShockChange: (value: number) => void;
  onApplyScenario: () => void;
};

export default function ScenarioSection({
  severityInflation,
  frequencyShock,
  onSeverityInflationChange,
  onFrequencyShockChange,
  onApplyScenario,
}: ScenarioSectionProps) {
  return (
    <section className="scenario">
      <h2>Scenario Controls</h2>
      <div className="scenario-grid">
        <label>
          Severity Inflation: {severityInflation}%
          <input
            type="range"
            min={0}
            max={20}
            value={severityInflation}
            onChange={(event) => onSeverityInflationChange(Number(event.target.value))}
          />
        </label>
        <label>
          Frequency Shock: {frequencyShock}%
          <input
            type="range"
            min={-10}
            max={25}
            value={frequencyShock}
            onChange={(event) => onFrequencyShockChange(Number(event.target.value))}
          />
        </label>
        <button onClick={onApplyScenario} type="button">
          Apply Scenario
        </button>
      </div>
    </section>
  );
}
