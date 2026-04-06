# InsureCast UI/UX Redesign

**Date:** 2026-04-06
**Approach:** Hierarchy-first redesign (Approach 2)
**Direction:** Clean data-forward — neutral whites/grays, typography-led, charts take center stage

---

## Background

InsureCast is a single-page insurance claims forecasting dashboard built with Next.js 16, React 19, Tailwind CSS v4, and Recharts. The current UI suffers from four identified pain points:

- **A. Too colorful/loud** — indigo/violet/teal gradients applied everywhere, overwhelming the data
- **B. Lacks visual hierarchy** — everything the same visual weight, color doing work that type should do
- **C. Charts feel cramped** — 256px height, heavy card chrome, harsh color choices
- **D. Controls feel dated** — generic browser-default selects, webkit-hacked sliders, unpolished sidebar

The redesign resolves all four by stripping back color to a single accent, rebuilding hierarchy through typography, giving charts more space, and replacing all animation with Framer Motion.

---

## Section 1: Foundation — Color & Visual Noise

**Goal:** Remove all decorative color. Establish a quiet, neutral surface that lets data speak.

### Color palette

| Purpose | Tailwind | Hex | CSS token |
|---------|----------|-----|-----------|
| Page background | `zinc-50` | #FAFAFA | `--color-background` |
| Card / sidebar background | `white` | #FFFFFF | `--color-surface` |
| Border | `zinc-200` | #E4E4E7 | `--color-border` |
| Primary text | `zinc-900` | #18181B | `--color-text-primary` |
| Secondary text | `zinc-700` | #3F3F46 | `--color-text-secondary` |
| Muted text (labels) | `zinc-500` | #71717A | `--color-text-muted` |
| Placeholder / axis ticks | `zinc-400` | #A1A1AA | `--color-text-placeholder` |
| Accent | `blue-600` | #2563EB | `--color-accent` |
| Accent badge background | `blue-50` | #EFF6FF | `--color-accent-light` |
| Confidence band fill | `blue-100` | #DBEAFE | (inline hex only) |

Use `--color-text-muted` (#71717A) for control labels and body-level muted text. Use `--color-text-placeholder` (#A1A1AA) for axis ticks, section divider labels, and timestamps. Do not use the other value interchangeably.

### Removals
- All indigo, violet, teal fills from UI chrome
- All gradient backgrounds (`from-indigo-600 via-violet-600 to-teal-600`)
- All `ring-*` decorative rings
- `shadow-*` reduced to `shadow-sm` on cards only

### Chart data colors (survive the purge)
- Historical line + solidBridge connector: `#71717A` (zinc-500) — neutral past data. Both series use the same color so the bridge reads as a seamless continuation of historical data.
- Forecast line: `#2563EB` (blue-600) — single accent, clearly "prediction"
- Confidence band fill: `#DBEAFE` (blue-100) at 50% opacity

### `globals.css` replacement

Replace the **entire contents** of `frontend/src/app/globals.css` with exactly the following. This removes: `--background`, `--background-warm`, `--ink`, `--focus-ring` tokens; the gradient body background; the indigo `box-shadow` focus rule on `input:focus` / `select:focus`; and the `forecast-summary-enter` keyframe.

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

**Do NOT add `focus:ring-*` Tailwind classes on any individual input or select element.** The global `:focus-visible` rule is the sole focus style.

---

## Section 2: Typography & Visual Hierarchy

**Goal:** Replace color-as-hierarchy with weight-and-size-as-hierarchy. One clear ladder.

### Hierarchy ladder

| Level | Usage | Tailwind classes |
|-------|-------|-------|
| 1 — Page title | App name "InsureCast" | `text-base font-semibold text-zinc-900` |
| 2 — Section label | "Parameters", "Scenario", "Forecast conclusion" | `text-xs font-semibold uppercase tracking-widest text-zinc-400` |
| 3 — Data value | Input values, chart titles, summary heading | `text-sm font-semibold text-zinc-800` |
| 4 — Body | Narrative summary, table data | `text-sm text-zinc-700` |
| 5 — Metadata | Control labels, axis ticks, timestamps | `text-xs text-zinc-500` |

### Component-specific typography

- **Control labels (sidebar):** `text-xs font-medium text-zinc-500`
- **Control inputs:** `text-sm text-zinc-900`
- **Table headers (`<th>`):** `text-xs font-semibold uppercase tracking-wide text-zinc-500 bg-white border-b border-zinc-200`
- **Table rows (`<td>`):** `text-sm tabular-nums text-zinc-800`
- **Historical table row background:** `bg-white`
- **Forecast table row background:** `bg-blue-50/40` (replaces `bg-violet-50/85`)
- **Forecast badge:** `text-[10px] font-semibold uppercase tracking-wide text-blue-600 bg-blue-50 rounded px-1.5 py-0.5` (replaces `text-violet-700/90 bg-violet-100` badge)
- **Table cell borders:** `border-zinc-100` for all rows (replaces `border-indigo-100/70` and `border-violet-200/55`)
- **Summary bold spans:** `font-medium text-zinc-900`

### Table toggle/collapse button

Replace the existing indigo-styled toggle button header with:

```tsx
<button
  type="button"
  id="monthly-table-toggle"
  onClick={() => setExpanded((e) => !e)}
  className="w-full flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200 text-left hover:bg-zinc-50 transition-colors"
  aria-expanded={expanded}
  aria-controls="monthly-table-panel"
>
  <div>
    <h2 className="text-sm font-semibold text-zinc-800">Monthly values</h2>
    <p className="mt-0.5 text-xs text-zinc-500">Forecast rows are highlighted in blue.</p>
  </div>
  <svg
    className={`w-4 h-4 text-zinc-400 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
    fill="none" stroke="currentColor" viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
</button>
```

Note: `id="monthly-table-toggle"` and `aria-controls="monthly-table-panel"` are preserved from the existing code (lines 41–43). The `type="button"` and `onClick={() => setExpanded((e) => !e)}` pattern (line 44) is unchanged.

**Rule:** Color is never used to establish importance — only weight and size.

---

## Section 3: Charts — Space & Readability

**Goal:** Make charts the dominant visual element. More height, less chrome, cleaner colors.

### Chart container
- White card: `rounded-xl border border-zinc-200 shadow-sm`
- No inner sub-container (remove `bg-slate-50/50` wrapper)
- Padding: `p-5`
- Above the `<ResponsiveContainer>`, a flex row: `<div className="flex items-center justify-between mb-3">` containing:
  - Left: chart title — `<h3 className="text-sm font-semibold text-zinc-800">{title}</h3>`
  - Right: custom legend (see below)

### Chart dimensions
- Height: **320px** (up from 256px)
- In `forecast-chart.tsx`, remove the inner `<div className="mt-4 relative w-full min-w-0 rounded-xl bg-slate-50/50 border border-indigo-100/60 p-3" style={{ height: 256 }}>` wrapper entirely (line 257–260).
- Set the height directly on `<ResponsiveContainer>` by changing `height="100%"` to `height={320}`.
- Remove the `initialDimension` prop from `<ResponsiveContainer>` — it is non-standard and has no effect; the explicit `height={320}` prop is sufficient.
- Set `minHeight={280}` on `<ResponsiveContainer>` (replaces `minHeight={220}`).

### Visual styling
- **Grid:** `<CartesianGrid vertical={false} stroke="#E4E4E7" />` — horizontal lines only, no dots
- **Axes:** Add `axisLine={false}` and `tickLine={false}` to both `<XAxis>` and `<YAxis>`. Set `tick={{ fontSize: 11, fill: "#a1a1aa" }}` on both.
- **Reference line** (forecast boundary): `<ReferenceLine stroke="#d4d4d8" strokeDasharray="4 3">` with `<Label value="Forecast starts" position="insideTopRight" style={{ fontSize: 10, fill: "#a1a1aa" }} />`. **Important:** add `Label` to the recharts import in `forecast-chart.tsx` (line 4–15). The current imports do not include `Label`. Change the import block to include `Label`:
  ```tsx
  import { Area, CartesianGrid, ComposedChart, Label, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
  ```
  Remove `Legend` from this import since it is replaced by custom JSX.
- **solidBridge series:** `stroke="#71717A"`, `strokeDasharray` unset (solid), same as historical

### Custom legend (inline above chart)

Remove the Recharts `<Legend>` component. Replace with a manual JSX element inside the title row. Render exactly two items — Historical and Forecast. The confidence band is self-evident and not listed.

```tsx
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
```

Note: `h-0` + `border-t-2` renders as a 2px horizontal line with zero height, which correctly mimics a chart line swatch.

### Tooltip

**Add the following import to `forecast-chart.tsx`:**
```tsx
import { motion } from "framer-motion";
```

Create a `CustomTooltip` component inside `forecast-chart.tsx` (above the main export). It receives Recharts' standard `TooltipProps` interface. Render the following structure:

```tsx
import type { TooltipProps } from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";

function CustomTooltip({ active, payload, label }: TooltipProps<ValueType, NameType>) {
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
        <div key={entry.dataKey as string} className="flex items-center justify-between gap-4 text-sm">
          <span className="text-zinc-500">{entry.name}</span>
          <span className="font-semibold text-zinc-900">
            {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </motion.div>
  );
}
```

Pass it to the Recharts tooltip: `<Tooltip content={<CustomTooltip />} />`.

Because Recharts manages tooltip mount/unmount internally, the `motion.div` entry animation fires each time the tooltip appears. No `AnimatePresence` wrapper is needed.

---

## Section 4: Controls & Sidebar

**Goal:** Make the sidebar feel like a purposeful control surface, not a form dump.

### Top-level page layout

**`layout.tsx` changes:**

The current `layout.tsx` body renders `{children}` directly inside `<body>`. The `<body>` tag has `className={${geistSans.variable} ${geistMono.variable} antialiased}` — **preserve this className exactly**. Only add an inner wrapper div:

```tsx
// Keep the existing <body> tag with its className unchanged.
// Replace {children} with:
<div className="flex flex-col h-screen">
  <header className="h-14 shrink-0 border-b border-zinc-200 bg-white px-6 flex items-center justify-between z-10">
    <span className="text-base font-semibold text-zinc-900">InsureCast</span>
    <span className="text-xs text-zinc-400">Insurance claims forecasting</span>
  </header>
  <div className="flex flex-1 min-h-0 overflow-hidden">
    {children}
  </div>
</div>
```

**`page.tsx` changes:**

1. **Remove** the `import { SmoothSummaryStack } from "./ui/smooth-summary-stack"` import line at the top of the file. `page.tsx` is the only consumer — no other file imports `SmoothSummaryStack`.
2. **Remove** the `<header>` element (lines 419–426) — the app title/description is now in `layout.tsx`.
3. **Delete** the outer `<main className="mx-auto max-w-[1600px] ...">` element (line 416) along with its inner `<div className="flex justify-center">` and `<div className="flex w-full ...">` wrappers. The entire return statement becomes a fragment:

```tsx
return (
  <>
    <aside className="w-72 shrink-0 bg-white border-r border-zinc-200 flex flex-col overflow-y-auto">
      <DashboardHeader {/* existing props unchanged */} />
      <div className="border-t border-zinc-100 mx-5" />
      <ScenarioPanel {/* existing props unchanged */} />
    </aside>
    <main className="flex-1 overflow-y-auto bg-zinc-50 px-6 py-6">
      <div className="space-y-5">
        {/* n=0 */ }
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1], delay: 0 }}>
          <ForecastSummaryPanel summary={forecastSummary} loadPhase={summaryLoadPhase} />
        </motion.div>
        {/* n=1 */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1], delay: 0.06 }}>
          <section className="flex flex-col gap-4">
            <ForecastChart title="Amount of Claims per Month" description="Historical data plus forecast for the selected period." data={claimsChartData} valueFormatter={formatNumber} allowDataOverflow />
            <ForecastChart title="Average Cost per Claim per Month" description="Historical data plus forecast for the selected period." data={avgCostChartData} valueFormatter={formatCurrency} skipZeroFloor allowDataOverflow />
          </section>
        </motion.div>
        {/* n=2 */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1], delay: 0.12 }}>
          <MonthlyTable key={hasMonthlyTableData ? monthlyRows.length : 0} rows={hasMonthlyTableData ? monthlyRows : []} />
        </motion.div>
      </div>
    </main>
  </>
);
```

All existing prop names and values remain unchanged — only the wrapper structure changes.

**Add the following import to `page.tsx`:**
```tsx
import { motion } from "framer-motion";
```

### Sidebar components (`DashboardHeader`, `ScenarioPanel`)

Both components' outermost element becomes a plain `<div className="px-5 py-6">`. Remove all gradient `className` props and inline `style` background props. Do not add `flex-1` or `flex-none` — both components size to their natural content height inside the `flex flex-col overflow-y-auto` `<aside>`.

Each section opens with:
```tsx
<p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
  Parameters {/* or "Scenario" */}
</p>
```

### Select / input controls

Apply the following classes to every `<select>` and `<input type="month">` in `DashboardHeader`:

```
h-9 w-full text-sm text-zinc-900 bg-white border border-zinc-200 rounded-lg px-3 appearance-none hover:border-zinc-300 transition-colors
```

Do NOT add `focus:ring-*` — the global `:focus-visible` in `globals.css` handles it.

Custom chevron for `<select>` elements — add this inline `style` (removes browser arrow, adds custom SVG):

```tsx
style={{
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='none' stroke='%23a1a1aa' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M2.5 4.5 6 8l3.5-3.5'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  paddingRight: "28px",
}}
```

### Scenario sliders

**Add the following import to `scenario-panel.tsx`:**
```tsx
import { motion } from "framer-motion";
```

Replace the current webkit/moz hacked slider markup with:

```tsx
<div className="mb-5">
  <div className="flex items-center justify-between mb-1.5">
    <label className="text-xs text-zinc-500">{label}</label>
    <span className="text-sm font-semibold text-zinc-900">{displayValue}</span>
  </div>
  <input
    type="range"
    className="w-full h-1 appearance-none rounded-full bg-zinc-200 cursor-pointer
               [&::-webkit-slider-thumb]:appearance-none
               [&::-webkit-slider-thumb]:w-3
               [&::-webkit-slider-thumb]:h-3
               [&::-webkit-slider-thumb]:rounded-full
               [&::-webkit-slider-thumb]:bg-blue-600
               [&::-webkit-slider-thumb]:shadow-sm
               [&::-moz-range-thumb]:w-3
               [&::-moz-range-thumb]:h-3
               [&::-moz-range-thumb]:rounded-full
               [&::-moz-range-thumb]:bg-blue-600
               [&::-moz-range-thumb]:border-0"
    {...rangeProps}
  />
</div>
```

### Apply button

```tsx
<motion.button
  whileHover={{ scale: 1.01 }}
  whileTap={{ scale: 0.97 }}
  className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
  onClick={handleApply}
>
  Apply scenario
</motion.button>
```

### Error state in ScenarioPanel

Replace the current `bg-rose-950/35 border-rose-200/40 text-rose-50` error block with:

```tsx
<div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
  {errorMessage}
</div>
```

---

## Section 5: Animations & Micro-interactions

**Goal:** Replace all ad-hoc CSS animations and the `SmoothSummaryStack` FLIP component with consistent Framer Motion patterns.

### Dependency

Add to `frontend/package.json` dependencies:
```json
"framer-motion": "^11.0.0"
```

### Framer Motion imports — required per file

Add these imports to each file that uses Framer Motion:

| File | Import |
|------|--------|
| `page.tsx` | `import { motion } from "framer-motion";` |
| `forecast-chart.tsx` | `import { motion } from "framer-motion";` |
| `forecast-summary-panel.tsx` | `import { motion, AnimatePresence } from "framer-motion";` |
| `monthly-table.tsx` | `import { motion, AnimatePresence } from "framer-motion";` |
| `scenario-panel.tsx` | `import { motion } from "framer-motion";` |

### Page load / section entry

In `page.tsx`, wrap each of the three main content blocks (summary panel, charts section, table) in a `motion.div`. Use `n = 0, 1, 2` for the three blocks:

```tsx
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1], delay: n * 0.06 }}
>
  {/* block content */}
</motion.div>
```

### Summary panel (replaces `SmoothSummaryStack` + `forecast-summary-enter`)

In `forecast-summary-panel.tsx`:

- `ForecastSummaryPanel` currently does NOT import `SmoothSummaryStack` — that import is in `page.tsx` and has already been removed in Section 4.
- Wrap the narrative/loading content in `AnimatePresence` with a `key` that changes when the content changes. The component already returns `null` when `loadPhase === "idle"`, so `AnimatePresence` is only active for the `"charts"`, `"llm"`, and loaded states:

```tsx
// Derive summaryKey from the current content state so AnimatePresence re-animates on change:
const summaryKey = summary?.segment_label ?? loadPhase ?? "empty";

// ...

<AnimatePresence mode="wait">
  <motion.div
    key={summaryKey}
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: "auto" }}
    exit={{ opacity: 0, height: 0 }}
    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    style={{ overflow: "hidden" }}
  >
    {/* existing loading states and narrative content — unchanged */}
  </motion.div>
</AnimatePresence>
```

### Loading spinners

The `SummaryLoadingInline` sub-component in `forecast-summary-panel.tsx` currently uses a CSS `animate-spin` border div with two color variants (`border-indigo-200 border-t-indigo-600` for charts phase; `border-violet-200 border-t-violet-700` for LLM phase). Replace both variants with a single Framer Motion spinner — the two-phase distinction is retained via the label text only, not color. Also update the `formatBoldSegments` function at line 38: change `<strong className="font-semibold text-indigo-950">` to `<strong className="font-medium text-zinc-900">`.

```tsx
// Replace the spinner <div> in both loading branches with:
<motion.div
  className="w-5 h-5 rounded-full border-2 border-zinc-200 border-t-blue-600 shrink-0"
  animate={{ rotate: 360 }}
  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
/>
```

The `animate-spin` class and the `border-indigo-*` / `border-violet-*` classes are removed.

### Table expand/collapse

In `monthly-table.tsx`, replace the existing conditional render of the table with `AnimatePresence`. Preserve the existing `id="monthly-table-panel"` and `aria-labelledby` attributes on the wrapping element:

```tsx
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
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* existing table content */}
        </table>
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

Add `id="monthly-table-toggle"` to the toggle button so the `aria-labelledby` reference resolves.

---

## Files Affected

| File | Changes |
|------|---------|
| `frontend/src/app/globals.css` | Full replacement — see Section 1 for exact content |
| `frontend/src/app/layout.tsx` | Preserve `<body>` className; add inner flex shell + `h-14` app header bar |
| `frontend/src/app/page.tsx` | Remove `SmoothSummaryStack` import; remove `<header>` element; delete `<main>` root wrapper; return `<aside>` + `<main>` fragment; add Framer Motion entry wrappers; add `motion` import |
| `frontend/src/app/ui/dashboard-header.tsx` | Remove gradient background; restyle all controls and labels per Section 4 |
| `frontend/src/app/ui/scenario-panel.tsx` | Remove gradient background; restyle sliders, apply button, error state; add `motion` import |
| `frontend/src/app/ui/forecast-chart.tsx` | Update chart colors, grid, axes; replace tooltip with `CustomTooltip`; replace `<Legend>` with custom JSX; height 256→320px (set on `<ResponsiveContainer height={320}>`); remove `initialDimension` prop (non-standard no-op); add `Label` to recharts imports, remove `Legend`; add `motion` import |
| `frontend/src/app/ui/forecast-summary-panel.tsx` | Replace CSS spinner (indigo/violet) with Framer Motion; add `AnimatePresence` content wrapper; update typography; add `motion, AnimatePresence` imports |
| `frontend/src/app/ui/monthly-table.tsx` | Update row styles (violet→blue tint), forecast badge (violet→blue), `<thead>` and toggle button (indigo→zinc), `EmptyTableState` (`text-indigo-500/80`→`text-zinc-400`), outer `<section>` border (indigo→zinc), add `AnimatePresence` expand/collapse; preserve `id`/`aria-*`; add `motion, AnimatePresence` imports |
| `frontend/src/app/ui/smooth-summary-stack.tsx` | **Delete this file** |
| `frontend/package.json` | Add `"framer-motion": "^11.0.0"` |

---

## Success Criteria

- No indigo, violet, or teal in UI chrome — only in chart data if needed
- Single blue accent (`blue-600`) used in ≤4 places per screen
- Clear visual hierarchy: a new user can identify the most important element within 2 seconds
- Charts are visually dominant — largest single element on screen, 320px height
- Sidebar controls feel intentional and modern — no browser-default arrows, clean sliders
- All animations use Framer Motion; `SmoothSummaryStack` and `forecast-summary-enter` keyframe deleted
- Error states use light-mode-appropriate red (not dark `rose-950`)
- Focus styling governed solely by global `:focus-visible` — no per-component `focus:ring-*` duplication
- `layout.tsx` `<body>` className (Geist font variables) preserved unchanged
- `monthly-table.tsx` `id` and `aria-*` attributes preserved on the collapsible panel
