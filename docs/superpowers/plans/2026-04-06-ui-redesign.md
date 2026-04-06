# UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the colorful indigo/violet/teal UI with a clean, hierarchy-first zinc/blue design and swap all ad-hoc animations for Framer Motion.

**Architecture:** Ten focused file edits — each file has one clear job. Foundation (globals, layout) first, then structural changes (page), then components in dependency order. No new files created except deleting `smooth-summary-stack.tsx`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Recharts 3, Framer Motion 11, pnpm

---

## File Map

| File | What changes |
|------|-------------|
| `frontend/package.json` | Add `framer-motion ^11.0.0` |
| `frontend/src/app/globals.css` | Full replacement — new token set, focus rule, no gradient |
| `frontend/src/app/layout.tsx` | Add `h-14` top bar + full-viewport flex shell |
| `frontend/src/app/page.tsx` | Remove `SmoothSummaryStack` import + old header; rewrite return as `<aside>` + `<main>` fragment with motion wrappers |
| `frontend/src/app/ui/smooth-summary-stack.tsx` | **Delete** |
| `frontend/src/app/ui/dashboard-header.tsx` | Strip gradient, restyle controls + labels |
| `frontend/src/app/ui/scenario-panel.tsx` | Strip gradient, restyle sliders + button + error state |
| `frontend/src/app/ui/forecast-chart.tsx` | Colors, height, grid/axes, `CustomTooltip`, inline legend, recharts imports |
| `frontend/src/app/ui/forecast-summary-panel.tsx` | `AnimatePresence` wrapper, Framer spinner, typography |
| `frontend/src/app/ui/monthly-table.tsx` | Colors, badge, toggle button, `AnimatePresence` expand/collapse |

All commands run from `frontend/`.

---

## Task 1: Install Framer Motion

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Add the dependency**

```bash
cd frontend && pnpm add framer-motion@^11.0.0
```

Expected: pnpm installs framer-motion and updates `pnpm-lock.yaml`.

- [ ] **Step 2: Verify TypeScript can resolve it**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no errors about `framer-motion` module not found (there may be pre-existing errors in other files — ignore those for now).

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add framer-motion ^11.0.0"
```

---

## Task 2: Replace globals.css

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Replace the entire file contents**

```css
@import "tailwindcss";

@theme inline {
  --color-background: #fafafa;
  --color-surface: #ffffff;
  --color-border: #e4e4e7;
  --color-text-primary: #18181b;
  --color-text-secondary: #3f3f46;
  --color-text-muted: #71717a;
  --color-text-placeholder: #a1a1aa;
  --color-accent: #2563eb;
  --color-accent-light: #eff6ff;
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  background-color: var(--color-background);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

/* Single global focus style — all components rely on this, do not add focus:ring-* per component */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

:focus:not(:focus-visible) {
  outline: none;
}
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: same output as before (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: replace globals.css with zinc/blue token system and single focus rule"
```

---

## Task 3: Update layout.tsx — Add App Header + Flex Shell

**Files:**
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Rewrite the file**

The `<body>` `className` must be preserved exactly. Only the content inside `<body>` changes:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://insurecast.symfa.ai"),
  title: "InsureCast",
  description: "Monthly claims and paid-amount forecasting dashboard",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex flex-col h-screen">
          <header className="h-14 shrink-0 border-b border-zinc-200 bg-white px-6 flex items-center justify-between z-10">
            <span className="text-base font-semibold text-zinc-900">InsureCast</span>
            <span className="text-xs text-zinc-400">Insurance claims forecasting</span>
          </header>
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add app header bar and full-viewport flex shell in layout.tsx"
```

---

## Task 4: Update page.tsx — New Layout Structure

**Files:**
- Modify: `frontend/src/app/page.tsx` (lines 29, 415–489)

- [ ] **Step 1: Remove the SmoothSummaryStack import (line 29)**

Delete this line:
```tsx
import { SmoothSummaryStack } from "./ui/smooth-summary-stack";
```

Add this import instead (anywhere near the other UI imports):
```tsx
import { motion } from "framer-motion";
```

- [ ] **Step 2: Replace the entire return statement (lines 415–489)**

Delete everything from `return (` through the closing `);` and replace with:

```tsx
  return (
    <>
      <aside className="w-72 shrink-0 bg-white border-r border-zinc-200 flex flex-col overflow-y-auto">
        <DashboardHeader
          segments={segments}
          stateValue={stateValue}
          setStateValue={setStateValue}
          industry={industry}
          setIndustry={setIndustry}
          claimType={claimType}
          setClaimType={setClaimType}
          fromMonth={fromMonth}
          setFromMonth={setFromMonth}
          forecastPeriod={forecastPeriod}
          setForecastPeriod={setForecastPeriod}
        />
        <div className="border-t border-zinc-100 mx-5" />
        <ScenarioPanel
          key={`${stateValue}-${industry}-${claimType}-${fromMonth}-${forecastPeriod}`}
          onApplyScenario={applyScenario}
          error={error}
        />
      </aside>
      <main className="flex-1 overflow-y-auto bg-zinc-50 px-6 py-6">
        <div className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1], delay: 0 }}
          >
            <ForecastSummaryPanel
              summary={forecastSummary}
              loadPhase={summaryLoadPhase}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1], delay: 0.06 }}
          >
            <section className="flex flex-col gap-4">
              <ForecastChart
                title="Amount of Claims per Month"
                description="Historical data plus forecast for the selected period."
                data={claimsChartData}
                valueFormatter={formatNumber}
                allowDataOverflow
              />
              <ForecastChart
                title="Average Cost per Claim per Month"
                description="Historical data plus forecast for the selected period."
                data={avgCostChartData}
                valueFormatter={formatCurrency}
                skipZeroFloor
                allowDataOverflow
              />
            </section>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1], delay: 0.12 }}
          >
            <MonthlyTable
              key={hasMonthlyTableData ? monthlyRows.length : 0}
              rows={hasMonthlyTableData ? monthlyRows : []}
            />
          </motion.div>
        </div>
      </main>
    </>
  );
```

- [ ] **Step 3: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | head -30
```

Expected: TypeScript error about `smooth-summary-stack` module not found is now gone. There may be a build error because `smooth-summary-stack.tsx` still exists but is no longer imported — that's fine. If there are new errors, fix before proceeding.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: restructure page layout to aside+main fragment with Framer Motion entry animations"
```

---

## Task 5: Delete smooth-summary-stack.tsx

**Files:**
- Delete: `frontend/src/app/ui/smooth-summary-stack.tsx`

- [ ] **Step 1: Delete the file**

```bash
rm src/app/ui/smooth-summary-stack.tsx
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no errors referencing `smooth-summary-stack`.

- [ ] **Step 3: Commit**

```bash
git add -u src/app/ui/smooth-summary-stack.tsx
git commit -m "refactor: delete SmoothSummaryStack — replaced by Framer Motion AnimatePresence"
```

---

## Task 6: Update dashboard-header.tsx

**Files:**
- Modify: `frontend/src/app/ui/dashboard-header.tsx`

- [ ] **Step 1: Rewrite the file**

```tsx
"use client";

import type { SegmentsResponse } from "@/app/utils/api";
import { filterStatesForUi } from "@/app/utils/allowed-states";

type DashboardHeaderProps = {
  segments: SegmentsResponse | null;
  stateValue: string;
  setStateValue: (value: string) => void;
  industry: string;
  setIndustry: (value: string) => void;
  claimType: string;
  setClaimType: (value: string) => void;
  fromMonth: string;
  setFromMonth: (value: string) => void;
  forecastPeriod: string;
  setForecastPeriod: (value: string) => void;
};

const chevronStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='none' stroke='%23a1a1aa' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M2.5 4.5 6 8l3.5-3.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 10px center",
  paddingRight: "28px",
};

const selectClass =
  "mt-1.5 h-9 w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 hover:border-zinc-300 transition-colors";

const inputClass =
  "mt-1.5 h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 hover:border-zinc-300 transition-colors";

export function DashboardHeader({
  segments,
  stateValue,
  setStateValue,
  industry,
  setIndustry,
  claimType,
  setClaimType,
  fromMonth,
  setFromMonth,
  forecastPeriod,
  setForecastPeriod,
}: DashboardHeaderProps) {
  return (
    <div className="px-5 py-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
        Parameters
      </p>

      <div className="flex flex-col gap-4">
        <label className="text-xs font-medium text-zinc-500">
          State
          <select
            value={stateValue}
            onChange={(e) => setStateValue(e.target.value)}
            className={selectClass}
            style={chevronStyle}
          >
            {filterStatesForUi(segments?.states ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-zinc-500">
          Industry
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className={selectClass}
            style={chevronStyle}
          >
            {(segments?.industries ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-zinc-500">
          Claim type
          <select
            value={claimType}
            onChange={(e) => setClaimType(e.target.value)}
            className={selectClass}
            style={chevronStyle}
          >
            {(segments?.claim_types ?? []).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-zinc-500">
          From
          <input
            type="month"
            value={fromMonth}
            onChange={(e) => setFromMonth(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="text-xs font-medium text-zinc-500">
          Forecast period
          <select
            value={forecastPeriod}
            onChange={(e) => setForecastPeriod(e.target.value)}
            className={selectClass}
            style={chevronStyle}
          >
            <option value="1">1 month</option>
            <option value="3">3 months</option>
            <option value="6">6 months</option>
            <option value="12">12 months</option>
          </select>
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/ui/dashboard-header.tsx
git commit -m "style: redesign DashboardHeader — strip gradient, restyle controls with zinc/blue"
```

---

## Task 7: Update scenario-panel.tsx

**Files:**
- Modify: `frontend/src/app/ui/scenario-panel.tsx`

- [ ] **Step 1: Rewrite the file**

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";

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
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => void onApplyScenario(severityInflation, frequencyShock)}
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/ui/scenario-panel.tsx
git commit -m "style: redesign ScenarioPanel — strip gradient, restyle sliders and apply button"
```

---

## Task 8: Update forecast-chart.tsx

**Files:**
- Modify: `frontend/src/app/ui/forecast-chart.tsx`

- [ ] **Step 1: Update the recharts import block (lines 4–15)**

Replace:
```tsx
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
```

With:
```tsx
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Label,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { motion } from "framer-motion";
```

- [ ] **Step 2: Update the color constants (lines 17–26)**

Replace:
```tsx
/** Historical (actuals) — blue */
const STROKE_HISTORICAL = "#1d4ed8";
/** Forecast dashed line — orange (bridge segment uses historical blue above) */
const STROKE_FORECAST = "#ea580c";
/** Vertical divider at forecast start */
const STROKE_FORECAST_MARKER = "#c2410c";
/** Confidence band (forecast only) — warm tint */
const CI_GRADIENT_START = "#ffedd5";
const CI_GRADIENT_END = "#fdba74";
```

With:
```tsx
/** Historical (actuals) + solidBridge — neutral zinc */
const STROKE_HISTORICAL = "#71717a";
/** Forecast dashed line — blue accent */
const STROKE_FORECAST = "#2563eb";
/** Vertical divider at forecast start */
const STROKE_FORECAST_MARKER = "#d4d4d8";
/** Confidence band (forecast only) — blue tint */
const CI_FILL = "#dbeafe";
```

- [ ] **Step 3: Add the CustomTooltip component**

Add this block immediately before the line `/** Same duration + easing...` (currently line 27):

```tsx
function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.1 }}
      className="bg-white border border-zinc-200 shadow-md rounded-lg p-3 min-w-[160px]"
    >
      <p className="text-xs font-semibold text-zinc-500 mb-2">{label}</p>
      {payload.map((entry) => (
        <div
          key={entry.dataKey as string}
          className="flex items-center justify-between gap-4 text-sm"
        >
          <span className="text-zinc-500">{entry.name}</span>
          <span className="font-semibold text-zinc-900">
            {typeof entry.value === "number"
              ? entry.value.toLocaleString()
              : entry.value}
          </span>
        </div>
      ))}
    </motion.div>
  );
}
```

- [ ] **Step 4: Update the `<article>` container and chart header (lines 252–260)**

Replace:
```tsx
  return (
    <article className="group rounded-2xl border border-indigo-200/50 bg-white p-5 shadow-sm ring-1 ring-indigo-100/50 transition-shadow hover:shadow-md">
      <h2 className="text-xl font-semibold text-indigo-900 md:text-2xl">
        {title}
      </h2>
      <p className="mt-1 text-sm text-indigo-700/70">{description}</p>
      <div
        className="mt-4 relative w-full min-w-0 rounded-xl bg-slate-50/50 border border-indigo-100/60 p-3"
        style={{ height: 256 }}
      >
```

With:
```tsx
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="inline-block w-5 h-0 border-t-2 border-zinc-400" />
            Historical
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="inline-block w-5 h-0 border-t-2 border-dashed border-blue-500" />
            Forecast
          </span>
        </div>
      </div>
      <div className="relative w-full min-w-0">
```

- [ ] **Step 5: Update `<ResponsiveContainer>` (lines 262–267)**

Replace:
```tsx
          <ResponsiveContainer
            width="100%"
            height="100%"
            minHeight={220}
            initialDimension={{ width: 400, height: 256 }}
          >
```

With:
```tsx
          <ResponsiveContainer
            width="100%"
            height={320}
            minHeight={280}
          >
```

- [ ] **Step 6: Update the `<defs>` CI gradient (lines 272–285)**

Replace the two `<stop>` elements inside the linearGradient:
```tsx
                <linearGradient id={ciGradientId} x1="0" y1="0" x2="1" y2="0">
                  <stop
                    offset="0%"
                    stopColor={CI_GRADIENT_START}
                    stopOpacity={0.55}
                  />
                  <stop
                    offset="100%"
                    stopColor={CI_GRADIENT_END}
                    stopOpacity={0.35}
                  />
                </linearGradient>
```

With:
```tsx
                <linearGradient id={ciGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CI_FILL} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={CI_FILL} stopOpacity={0.2} />
                </linearGradient>
```

- [ ] **Step 7: Update `<CartesianGrid>` (lines 286–290)**

Replace:
```tsx
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#c7b8f0"
                strokeOpacity={0.6}
              />
```

With:
```tsx
              <CartesianGrid vertical={false} stroke="#E4E4E7" />
```

- [ ] **Step 8: Update `<XAxis>` (lines 291–296)**

Replace:
```tsx
              <XAxis
                dataKey="month"
                interval="preserveStartEnd"
                minTickGap={20}
                tick={{ fill: "#5b21b6", fontSize: 11 }}
              />
```

With:
```tsx
              <XAxis
                dataKey="month"
                interval="preserveStartEnd"
                minTickGap={20}
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
```

- [ ] **Step 9: Update `<YAxis>` (lines 297–306)**

Replace:
```tsx
              <YAxis
                domain={yDomain}
                allowDataOverflow={allowDataOverflowProp ?? domainFromLineOnly}
                tick={{ fill: "#5b21b6", fontSize: 12 }}
                tickFormatter={(v) =>
                  typeof v === "number" && (v >= SANE_MAX || !isFinite(v))
                    ? ""
                    : valueFormatter(v as number)
                }
              />
```

With:
```tsx
              <YAxis
                domain={yDomain}
                allowDataOverflow={allowDataOverflowProp ?? domainFromLineOnly}
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
                tickFormatter={(v) =>
                  typeof v === "number" && (v >= SANE_MAX || !isFinite(v))
                    ? ""
                    : valueFormatter(v as number)
                }
                axisLine={false}
                tickLine={false}
              />
```

- [ ] **Step 10: Replace `<Tooltip>` (lines 307–317)**

Replace:
```tsx
              <Tooltip
                formatter={(value, name) => [
                  formatTooltipValue(value, valueFormatter),
                  name ?? "",
                ]}
                contentStyle={{
                  borderRadius: 10,
                  borderColor: "#fb923c",
                  backgroundColor: "#fff7ed",
                }}
              />
```

With:
```tsx
              <Tooltip content={<CustomTooltip />} />
```

- [ ] **Step 11: Remove `<Legend>` (line 318)**

Delete the line:
```tsx
              <Legend wrapperStyle={{ fontSize: 12 }} />
```

- [ ] **Step 12: Update the `<Area>` fill (lines 321–331)**

Replace the `fill` prop:
```tsx
                fill={`url(#${ciGradientId})`}
```

This line stays as-is — the gradient id is still used, the new `<defs>` already uses `CI_FILL`.

- [ ] **Step 13: Update historical `<Line>` stroke (line 336)**

Replace:
```tsx
                stroke={STROKE_HISTORICAL}
```

This stays — `STROKE_HISTORICAL` is now `"#71717a"` (updated in Step 2). No edit needed here.

- [ ] **Step 14: Update `<ReferenceLine>` to use new color and add Label (lines 377–387)**

Replace:
```tsx
              {boundaryRef != null ? (
                <ReferenceLine
                  x={boundaryRef.x}
                  position={boundaryRef.position}
                  stroke={STROKE_FORECAST_MARKER}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  strokeOpacity={0.95}
                  zIndex={500}
                />
              ) : null}
```

With:
```tsx
              {boundaryRef != null ? (
                <ReferenceLine
                  x={boundaryRef.x}
                  position={boundaryRef.position}
                  stroke={STROKE_FORECAST_MARKER}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  zIndex={500}
                >
                  <Label
                    value="Forecast starts"
                    position="insideTopRight"
                    style={{ fontSize: 10, fill: "#a1a1aa" }}
                  />
                </ReferenceLine>
              ) : null}
```

- [ ] **Step 15: Update the "no data" fallback div (lines 391–393)**

Replace:
```tsx
          <div className="flex h-full w-full items-center justify-center text-indigo-500/80">
            <p className="text-base font-medium">No data</p>
          </div>
```

With:
```tsx
          <div className="flex items-center justify-center" style={{ height: 320 }}>
            <p className="text-sm font-medium text-zinc-400">No data</p>
          </div>
```

- [ ] **Step 16: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If `ValueType` or `NameType` import paths differ in your Recharts version, fix the import paths (they may be at `recharts/types/component/DefaultTooltipContent` or inline in `recharts`).

- [ ] **Step 17: Commit**

```bash
git add src/app/ui/forecast-chart.tsx
git commit -m "style: redesign ForecastChart — zinc/blue colors, 320px height, custom tooltip, inline legend"
```

---

## Task 9: Update forecast-summary-panel.tsx

**Files:**
- Modify: `frontend/src/app/ui/forecast-summary-panel.tsx`

- [ ] **Step 1: Rewrite the file**

```tsx
import type { ForecastSummaryLLMResponse } from "@/app/utils/api";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div
      className="flex items-start gap-3 py-0.5"
      aria-busy="true"
      aria-live="polite"
    >
      <motion.div
        className="mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 border-zinc-200 border-t-blue-600"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-800">{title}</p>
        {detail ? (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {detail}
          </p>
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
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          style={{ overflow: "hidden" }}
        >
          {isLoading ? (
            <div className="flex flex-col justify-start pt-0.5">
              {loadingCharts ? (
                <SummaryLoadingInline
                  title="Loading chart data…"
                  detail="Fetching claims and cost series for your selection."
                />
              ) : (
                <SummaryLoadingInline title="Generating forecast conclusion…" />
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
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">
                    Forecast conclusion
                  </p>
                  <h2
                    id="forecast-summary-heading"
                    className="text-sm font-semibold text-zinc-800 mb-1"
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/ui/forecast-summary-panel.tsx
git commit -m "style: redesign ForecastSummaryPanel — Framer Motion AnimatePresence, zinc typography, Framer spinner"
```

---

## Task 10: Update monthly-table.tsx

**Files:**
- Modify: `frontend/src/app/ui/monthly-table.tsx`

- [ ] **Step 1: Rewrite the file**

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency, formatNumber, monthToLabel } from "@/app/utils/format";

export type MonthlyRow = {
  month: string;
  claims: number;
  paid: number;
  avgCost: number;
  /** True when this month is in the forecast horizon (no actual claims yet) */
  isForecast: boolean;
};

type MonthlyTableProps = {
  rows: MonthlyRow[];
};

function EmptyTableState() {
  return (
    <div className="px-4 py-8 text-center text-zinc-400">
      <p className="text-sm font-medium">No data</p>
    </div>
  );
}

const thClass =
  "border-b border-zinc-200 px-2 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:px-3 md:px-4";
const tdBase = "px-2 py-3 align-middle text-center sm:px-3 md:px-4";
const tdHistorical = `${tdBase} border-b border-zinc-100`;
const tdForecast = `${tdBase} border-b border-zinc-100`;

export function MonthlyTable({ rows }: MonthlyTableProps) {
  const hasRows = rows.length > 0;
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        id="monthly-table-toggle"
        aria-expanded={expanded}
        aria-controls="monthly-table-panel"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200 text-left hover:bg-zinc-50 transition-colors"
      >
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Monthly values</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Forecast rows are highlighted in blue.
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id="monthly-table-panel"
            role="region"
            aria-labelledby="monthly-table-toggle"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            {hasRows ? (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-full table-fixed border-collapse text-sm">
                  <colgroup>
                    <col style={{ width: "25%" }} />
                    <col style={{ width: "18.75%" }} />
                    <col style={{ width: "28.125%" }} />
                    <col style={{ width: "28.125%" }} />
                  </colgroup>
                  <thead className="bg-white">
                    <tr>
                      <th className={thClass}>Month</th>
                      <th className={thClass}>Claims</th>
                      <th className={thClass}>Paid amount</th>
                      <th className={thClass}>Avg cost per claim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.month}
                        className={
                          row.isForecast
                            ? "bg-blue-50/40 transition-colors hover:bg-blue-100/40"
                            : "bg-white transition-colors hover:bg-zinc-50"
                        }
                      >
                        <td
                          className={
                            row.isForecast
                              ? `${tdForecast} text-zinc-800`
                              : `${tdHistorical} text-zinc-800`
                          }
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-medium text-zinc-800">
                              {monthToLabel(row.month)}
                            </span>
                            {row.isForecast && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 bg-blue-50 rounded px-1.5 py-0.5">
                                forecast
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className={`tabular-nums ${row.isForecast ? `${tdForecast} text-zinc-800` : `${tdHistorical} text-zinc-800`}`}
                        >
                          {formatNumber(row.claims)}
                        </td>
                        <td
                          className={`tabular-nums ${row.isForecast ? `${tdForecast} text-zinc-800` : `${tdHistorical} text-zinc-800`}`}
                        >
                          {formatCurrency(row.paid)}
                        </td>
                        <td
                          className={`tabular-nums ${row.isForecast ? `${tdForecast} text-zinc-800` : `${tdHistorical} text-zinc-800`}`}
                        >
                          {formatCurrency(row.avgCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyTableState />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript — full clean check**

```bash
pnpm tsc --noEmit 2>&1
```

Expected: zero errors. Fix any that appear before committing.

- [ ] **Step 3: Commit**

```bash
git add src/app/ui/monthly-table.tsx
git commit -m "style: redesign MonthlyTable — zinc/blue colors, Framer Motion expand/collapse, updated toggle button"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Run TypeScript check one more time**

```bash
pnpm tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 2: Start the dev server and visually verify**

```bash
pnpm dev
```

Open `http://localhost:3000` and verify:
- Top bar: "InsureCast" left, "Insurance claims forecasting" right, `h-14` white bar with zinc-200 bottom border
- Left sidebar: white, zinc-200 right border, "PARAMETERS" section label in uppercase zinc-400, clean select controls with chevron arrow
- "SCENARIO" section below divider line, clean sliders with blue thumb, blue "Apply scenario" button
- Main area: zinc-50 background
- Charts: 320px tall, white card, zinc-200 border, inline legend top-right, zinc/blue lines, no orange anywhere
- Monthly table: white card, zinc-200 border, blue-tinted forecast rows, blue forecast badges, smooth expand/collapse animation
- No indigo, violet, or teal visible anywhere in the UI chrome

- [ ] **Step 3: Push**

```bash
git push
```
