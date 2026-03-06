"use client";

import type { SegmentsResponse } from "../utils/api";

type FiltersPanelProps = {
  segments: SegmentsResponse | null;
  stateValue: string;
  industry: string;
  claimType: string;
  fromMonth: string;
  toMonth: string;
  onStateChange: (value: string) => void;
  onIndustryChange: (value: string) => void;
  onClaimTypeChange: (value: string) => void;
  onFromMonthChange: (value: string) => void;
  onToMonthChange: (value: string) => void;
};

export default function FiltersPanel({
  segments,
  stateValue,
  industry,
  claimType,
  fromMonth,
  toMonth,
  onStateChange,
  onIndustryChange,
  onClaimTypeChange,
  onFromMonthChange,
  onToMonthChange,
}: FiltersPanelProps) {
  return (
    <section className="filters">
      <label>
        State
        <select value={stateValue} onChange={(event) => onStateChange(event.target.value)}>
          {(segments?.states ?? []).map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </label>
      <label>
        Industry
        <select value={industry} onChange={(event) => onIndustryChange(event.target.value)}>
          {(segments?.industries ?? []).map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </label>
      <label>
        Claim Type
        <select value={claimType} onChange={(event) => onClaimTypeChange(event.target.value)}>
          {(segments?.claim_types ?? []).map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </label>
      <label>
        From
        <input
          type="month"
          value={fromMonth}
          onChange={(event) => onFromMonthChange(event.target.value)}
        />
      </label>
      <label>
        To
        <input type="month" value={toMonth} onChange={(event) => onToMonthChange(event.target.value)} />
      </label>
    </section>
  );
}
