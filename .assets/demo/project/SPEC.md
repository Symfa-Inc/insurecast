# SPEC: InsureCast product demo (opus)

GOAL:    a claims or reserving lead finishes the film knowing InsureCast forecasts claims and cost per
         segment, lets them stress-test it with two sliders, and explains the result in plain English.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps, H.264 yuv420p + AAC.
TIME:    62.5 s x 30 = 1875 frames. Music bed ~100 BPM (Lyria, generated), so 1 beat = 18 frames,
         1 bar = 72 frames (2.4 s). Chapter sheets land near bar lines; cuts follow the motion.

LOOK:    the product's own system, nothing invented.
         ground #fafafa (app --color-background); surfaces #ffffff; borders #e4e4e7;
         ink #18181b, secondary #71717a; ONE accent #2563eb (app --color-accent), used for the
         forecast line, one word per headline, the URL on the end card.
         Brand mark (navy/orange shield) appears twice only: poster frame and end card.
         Display: Geist 600, 104 px headlines, tracking -0.025em, line-height 1.02.
         Body: Geist 400/500. Callouts: Geist 600 30 px on white, 1 px #e4e4e7 border, 12 px radius,
         shadow 0 12 32 rgba(24,24,27,.12), 3 px blue rule on the left edge, a 1.5 px leader line to a
         7 px blue dot on the element.
         The UI is the real dashboard rebuilt as DOM from the captured page (Tailwind CSS from the
         running app, real Recharts SVG paths, real API values, real OpenAI conclusion) at 1440 x 1080
         CSS px and framed by a camera between 1.333x (full width) and 2.2x.
         Font note: the app declares Geist (layout.tsx, globals.css); the dev build currently falls
         back to Times because `@theme inline` does not emit --font-sans. The film uses the declared Geist.
OBJECTS: cursor = macOS-style black arrow with white 1.5 px edge, 24 px tall in app space (44-53 px on
         screen at 1.8-2.2x); dropdown menu = white card under the select, 4 px inset, 32 px rows,
         hovered row #eff6ff with #1d4ed8 text, check mark on the current value; slider = the app's
         6 px track with blue fill and 16 px white thumb with a 2 px blue ring.
MOTION:  camera moves power2.inOut 0.9-1.1 s, one at a time, never during a click.
         cursor travel power3.inOut 0.5-0.9 s; press = cursor scale 0.86 for 4 frames + control press.
         menu open 0.2 s power2.out (opacity 0->1, scaleY 0.96->1, y -4->0); close 0.14 s power2.in.
         chart re-fit 1.0 s sine.inOut (matches Recharts animationDuration 1000 ms ease-in-out).
         numbers count over 1.0-1.2 s power2.out, integers only, tabular figures.
         conclusion streams word by word in uneven bursts, 0.03-0.11 s apart, each word blur 4->0 px.
         chapter sheet: full-frame #fafafa sheet, whips in from the right 0.45 s power3.inOut with
         horizontal blur peaking 14 px, holds, whips out to the left 0.45 s. This is the only
         transition between chapters; inside chapters the camera does the work.
         headline words: blur 8->0 px + opacity, 0.16 s each, 0.08 s apart, no translate; landed
         headlines do not move.
SHOTS (global seconds):
  0.0-4.0   HOOK poster: mark + "InsureCast", "Next year's claims, forecast today." and the real
            TX Construction LostTime claims curve drawing into its dashed forecast. Frame 0 is the
            finished poster minus the forecast tail.
  4.0-6.0   same stage rebuilds: curve and line blur out, "Pick the segment you cover" lands.
  6.0-6.45  sheet whips out left: the dashboard, NY Healthcare Indemnity, at 1.333x.
  6.6-13.0  push to the sidebar (2.2x). State NY->TX, Industry Healthcare->Construction,
            Claim type Indemnity->LostTime: each a full cursor/open/hover/select/close; the draft
            counter reads 1, 2, 3 unapplied changes.
  13.0-15.0 pan to Update Forecast, hover, press, "Updating..."
  15.0-22.0 pull back to the main pane: loading badge, both charts re-fit to TX, the segment line
            changes, the real conclusion streams in; push to the conclusion and hold to read.
  22.0-24.4 sheet "Read the forecast and its range".
  24.4-36.4 claims chart at 1.68x: callouts "Actual claims through Dec 2025", "12-month SARIMAX
            forecast", "Range widens further out"; pan to the cost chart, hover Jul 2026 for the
            real tooltip; callout "Average cost per claim, projected".
  36.4-38.8 sheet "What if costs rise 10%?" (10% rolls 2% -> 5% -> 10%).
  38.8-46.5 scenario at 2.2x: drag severity 0->10%, frequency 0->15%, draft "2 unapplied
            changes", Update Forecast.
  46.5-51.0 pull back to charts + table (1.333x): notice line opens, both charts lift, the Dec 2026
            row counts 57->65 claims, $1,234,477->$1,561,650, $21,814->$23,996; callout
            "Severity +10% lifts cost per claim".
  49.7-52.8 push to the table, click "Show 45 more rows", rows stagger in while the page scrolls.
  53.0-55.0 pull back to the whole dashboard: TX · Construction · LostTime, +10% / +15%, every month.
  55.0-62.5 sheet whips in as the end card: mark wipes in, "InsureCast", "Forecast claims. Test
            the what-ifs.", insurecast.symfa.ai. Held ~6 s; music fades from 58.9 to silence at 61.8 (0.7 s of silence closes the film).
SOUND:   music bed (final mix -15.8 LUFS integrated, true peak -1.6 dBTP), low-passed at 12 kHz (Lyria high-band artefacts) and
         low-shelf -4 dB at 110 Hz; soft click on every real click (-8 dB under the hits' default),
         alternating whoosh takes on the five sheets; nothing else.
BANNED:  persistent caption or subtitle strip; any hard content swap without a tween; error, empty,
         "N/A", "fallback" or "OPENAI_API_KEY" text; localhost or browser chrome; spinners longer
         than 1 s; dark void ground; glow, particles, gradients; glass cards; pill chips;
         centred-everything (headlines are left aligned, only the end card is centred); titles that
         drift after landing; three cards in a row; the logo docked in a corner; click rings.
QA:      frames every 2 s and around every seam (+-0.2 s); text >= 28 px for headlines and callouts;
         no clipping of axis labels ("Dec 2026"); the conclusion text matches capture.json;
         audio: music present from 0, no clipping (true peak <= -1 dBTP), silence in the last 0.2 s.
