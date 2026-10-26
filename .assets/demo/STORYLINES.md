# InsureCast demo film: storylines

Subject: InsureCast, the claims and cost forecasting dashboard (FastAPI + SARIMAX backend, Next.js frontend).
Viewer: a claims, reserving or underwriting lead who has to put a number on next year for one book of business.
One real piece of data travels through every option: the segment **TX · Construction · LostTime**, captured from the
running app (backend on :8010, frontend on :3010), with its real SARIMAX forecast, its real OpenAI conclusion and its
real scenario recalculation (+10% severity, +15% frequency).

---

## A. "Next year's number" (chosen)

- **Device / form:** a moment in someone's day (one analyst, one segment, one what-if) told as one continuous take
  inside the product. The camera never leaves the app except for short headline sheets that wipe across it.
- **What the viewer sees and feels:** the dashboard does real work in front of them: dropdowns open, the forecast
  re-fits, the AI conclusion streams in, the sliders push the outlook up and the table counts to the new numbers.
  It feels calm and competent, like watching a colleague who knows the tool.
- **First two seconds:** a designed poster on the app's own #fafafa ground: the InsureCast mark and wordmark, the line
  "Next year's claims, forecast today." and the real TX construction claims curve drawing from history into its dashed
  blue forecast.
- **Beats:** hook (poster) → "Pick the segment you cover" → State, Industry, Claim type dropdowns → Update Forecast →
  charts re-fit, conclusion streams → "Read the forecast and its range" → claims chart, forecast start, band, cost
  chart → "What if costs rise 10%?" → drag severity and frequency → Update → charts lift, table counts up →
  expand to every month → end card held while the music fades.
- **Look:** the app's own system: #fafafa ground, zinc ink, one blue (#2563eb) accent, Geist 600/400 only; real UI at
  1.33x to 2.2x, never a small window floating on a void.
- **Sound:** a light, mid-tempo acoustic-electronic bed (generated with Lyria), soft clicks on real clicks, a short
  whoosh on each headline sheet, music resolves under the end card and fades to silence.

**Why this one:** a stranger can follow it without narration: one person, one segment, one question, and every
claim on screen is the product's own output. It also fixes all three points of feedback on v1 by construction: the
UI owns the full frame, every interaction is performed (cursor, open, hover, select, update), and the AI conclusion
is the real model output for the exact data on screen.

## B. "The number first"

- **Device / form:** the result first, then an endless pull-back.
- **What the viewer sees:** the film opens on one real figure from the app, the Jul 2026 paid forecast for TX
  construction (**$1,665,121**), filling the frame. It ticks up to **$2,106,367** as an unseen hand applies the
  scenario. The camera pulls back: the number is a cell in the monthly table, the table sits under the charts, the
  charts sit beside the scenario sliders that moved it, and finally the whole dashboard.
- **First two seconds:** "$1,665,121" in Geist 600 at 300 px, a blue underline drawing under it.
- **Beats:** number lands → it moves → pull back to table → to charts → to sliders → to the segment pickers →
  whole app → end card.
- **Look:** same app palette; giant tabular numerals; one continuous zoom.
- **Sound:** a pulse that thins out as the camera pulls back; ends on one held chord.
- **Not chosen because:** it is striking but it explains the tool backwards; the interactions (the owner's point 2)
  happen off camera or out of order, and the AI conclusion has no natural place.

## C. "Three questions"

- **Device / form:** type carries the argument; every question is answered by a punch into the UI and a hard cut
  back to type.
- **What the viewer sees:** "How many claims next month?" → the claims chart; "What will each one cost?" → the cost
  chart; "What if costs climb 10%?" → the sliders and the re-fit; "What do I tell the CFO?" → the AI conclusion.
- **First two seconds:** the first question typed in huge Geist on white, the cursor blinking after "month?".
- **Beats:** Q1 → chart → Q2 → chart → Q3 → scenario → Q4 → conclusion → end card.
- **Look:** white and blue type planes alternating with the app.
- **Sound:** cut on the beat, a riser into the last answer.
- **Not chosen because:** it drifts toward the "kinetic type slideshow" the owner did not ask for, and the
  type-to-UI cuts every 3 to 4 s leave too little time to show a full, believable dropdown interaction.

The chosen film borrows one thing from C: the chapter sheets are short questions or verbs, 6 words or fewer.
