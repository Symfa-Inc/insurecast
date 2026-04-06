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

| Token | Value | Usage |
|-------|-------|-------|
| Page background | `zinc-50` (#FAFAFA) | Canvas |
| Card / sidebar background | `white` | Surfaces |
| Border | `zinc-200` (#E4E4E7) | All borders consistently |
| Primary text | `zinc-900` | Headings, values |
| Secondary text | `zinc-700` | Body, narrative |
| Muted text | `zinc-500` / `zinc-400` | Labels, metadata |
| Accent | `blue-600` (#2563EB) | Focus, CTA, forecast line only |
| Accent light | `blue-50` / `blue-100` | Badge backgrounds, confidence band |

### Removals
- All indigo, violet, teal fills from UI chrome
- All gradient backgrounds (`from-indigo-600 via-violet-600 to-teal-600`)
- All `ring-*` decorative rings
- `shadow-*` reduced to `shadow-sm` on cards only

### Chart data colors (survive the purge)
- Historical line: `zinc-500` (#71717A) — neutral past data
- Forecast line: `blue-600` (#2563EB) — single accent, clearly "prediction"
- Confidence band fill: `blue-100` at 50% opacity

---

## Section 2: Typography & Visual Hierarchy

**Goal:** Replace color-as-hierarchy with weight-and-size-as-hierarchy. One clear ladder.

### Hierarchy ladder

| Level | Usage | Style |
|-------|-------|-------|
| 1 — Page title | App name "InsureCast" | `text-base font-semibold text-zinc-900` |
| 2 — Section label | "Parameters", "Scenario", "Forecast conclusion" | `text-xs font-semibold uppercase tracking-widest text-zinc-400` |
| 3 — Data value | Input values, chart titles, summary heading | `text-sm font-semibold text-zinc-800` |
| 4 — Body | Narrative summary, table data | `text-sm text-zinc-700` |
| 5 — Metadata | Control labels, axis ticks, timestamps | `text-xs text-zinc-500` |

### Component-specific typography

- **Control labels (sidebar):** `text-xs font-medium text-zinc-500`
- **Control inputs:** `text-sm text-zinc-900`
- **Table headers:** `text-xs font-semibold uppercase tracking-wide text-zinc-500`
- **Table rows:** `text-sm tabular-nums text-zinc-800`
- **Forecast badge:** `text-[10px] font-semibold uppercase tracking-wide text-blue-600 bg-blue-50 rounded px-1.5`
- **Summary bold spans:** `font-medium text-zinc-900`

**Rule:** Color is never used to establish importance — only weight and size.

---

## Section 3: Charts — Space & Readability

**Goal:** Make charts the dominant visual element. More height, less chrome, cleaner colors.

### Chart container
- White card: `rounded-xl border border-zinc-200 shadow-sm`
- No inner sub-container (remove `bg-slate-50/50` wrapper)
- Padding: `p-5`
- Chart title: `text-sm font-semibold text-zinc-800` above the chart

### Chart dimensions
- Height: **320px** (up from 256px)

### Visual styling
- **Grid:** Horizontal lines only, `stroke="#E4E4E7"` (zinc-200), no vertical grid lines, no dots
- **Axes:** `text-xs` zinc-400 labels, no tick marks, no axis lines — floating labels only
- **Reference line** (forecast boundary): `stroke="#D4D4D8"` dashed, `text-[10px] text-zinc-400` label "Forecast starts"
- **Legend:** Inline above chart, right-aligned — two `inline-flex items-center gap-1.5` pills replacing Recharts default

### Tooltip
- White background, `border border-zinc-200 shadow-md rounded-lg p-3`
- `text-sm text-zinc-800` — matches card language
- Wrapped in Framer Motion `motion.div` for animated entry

---

## Section 4: Controls & Sidebar

**Goal:** Make the sidebar feel like a purposeful control surface, not a form dump.

### Sidebar structure
- `w-72 bg-white border-r border-zinc-200` full viewport height
- Padding: `px-5 py-6`
- Two sections divided by `border-t border-zinc-100`:
  1. **Parameters** — state, industry, claim type, from month, forecast period
  2. **Scenario** — severity slider, frequency slider, apply button

### App header
- `h-14 border-b border-zinc-200 bg-white px-6 flex items-center justify-between`
- Left: `InsureCast` — `text-base font-semibold text-zinc-900`
- Right: last updated timestamp — `text-xs text-zinc-400`

### Select / input controls
```
h-9 w-full text-sm text-zinc-900 bg-white
border border-zinc-200 rounded-lg px-3
appearance-none                          ← removes browser arrow
focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
hover:border-zinc-300 transition-colors
```
- Custom chevron via inline SVG background-image (no browser default)

### Scenario sliders
- Track: `h-1 bg-zinc-200 rounded-full`
- Thumb: `w-3 h-3 bg-blue-600 rounded-full shadow-sm`
- Value readout inline right of label: `text-sm font-semibold text-zinc-900`
- Label: `text-xs text-zinc-500`

### Apply button
```
w-full h-9 bg-blue-600 hover:bg-blue-700
text-white text-sm font-medium rounded-lg transition-colors
```
- Only solid-filled button in the UI — unambiguous primary action

---

## Section 5: Animations & Micro-interactions

**Goal:** Replace all ad-hoc CSS animations and the `SmoothSummaryStack` FLIP component with consistent Framer Motion patterns.

### Dependency
Add `framer-motion` to `frontend/package.json`.

### Page load / section entry
Each major section (summary panel, chart cards, table) enters with:
```js
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1], delay: n * 0.06 }}
```
Stagger delays: 0ms → 60ms → 120ms.

### Summary panel (replaces `SmoothSummaryStack` + `forecast-summary-enter` keyframe)
- `AnimatePresence` wraps narrative text
- Height: `motion.div` with `animate={{ height: "auto" }}` — replaces FLIP logic
- Content swap: `initial={{ opacity: 0 }} animate={{ opacity: 1 }}`

### Loading states
- CSS spinner → Framer Motion `animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}`
- Chart skeleton: `motion.div` shimmer with `animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}`

### Interactive controls
- Slider thumb wrapper: `whileTap={{ scale: 0.9 }}`
- Apply button: `whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}`
- Input focus ring: `transition: all 0.15s ease` (CSS, no Framer needed)

### Chart tooltip
- Custom Recharts tooltip wrapped in `motion.div`:
  ```js
  initial={{ opacity: 0, scale: 0.97 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.1 }}
  ```

### Table expand/collapse
- Replace manual toggle height tracking with `AnimatePresence` + `motion.div`:
  ```js
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: "auto", opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
  ```

---

## Files Affected

| File | Changes |
|------|---------|
| `frontend/src/app/globals.css` | Remove gradient tokens, `forecast-summary-enter` keyframe; add minimal base tokens |
| `frontend/src/app/layout.tsx` | Add `h-14` app header bar |
| `frontend/src/app/page.tsx` | Update layout classes, wrap sections in Framer Motion entry animations |
| `frontend/src/app/ui/dashboard-header.tsx` | Strip gradient, restyle all controls and labels |
| `frontend/src/app/ui/scenario-panel.tsx` | Restyle sliders, apply button, remove gradient |
| `frontend/src/app/ui/forecast-chart.tsx` | Update colors, grid, axes, tooltip, legend, height; add motion tooltip |
| `frontend/src/app/ui/forecast-summary-panel.tsx` | Replace CSS animation with Framer Motion; update typography |
| `frontend/src/app/ui/monthly-table.tsx` | Update row styles, forecast badge, add AnimatePresence expand/collapse |
| `frontend/src/app/ui/smooth-summary-stack.tsx` | **Delete** — replaced by Framer Motion in `forecast-summary-panel.tsx` |
| `frontend/package.json` | Add `framer-motion` dependency |

---

## Success Criteria

- No indigo, violet, or teal in UI chrome — only in chart data if needed
- Single blue accent (`blue-600`) used in ≤4 places per screen
- Clear visual hierarchy: a new user can identify the most important element within 2 seconds
- Charts are visually dominant — largest single element on screen
- Sidebar controls feel intentional and modern, not browser-default
- All animations use Framer Motion, `SmoothSummaryStack` deleted
