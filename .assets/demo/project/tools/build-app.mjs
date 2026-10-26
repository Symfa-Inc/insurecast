// Builds compositions/app.html from the captured app (assets/data/*) and the hand-written sources in src/.
// Run: node tools/build-app.mjs   (from the project root)
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const cap = JSON.parse(rd("assets/data/capture.json"));
const css = rd("assets/data/app-tailwind.css")
  .split("\n")
  .filter((l) => !/^\s*\.[^{]*(transition|duration-|ease-in-out)[^{]*\{/.test(l)) // drop browser-clock transitions; GSAP owns every change
  .join("\n") + "\n" + rd("src/app.style.css");
let markup = rd("src/app.markup.html");
const timeline = rd("src/app.timeline.js");

// ---------- helpers ----------
const pts = (d) => {
  // points of a Recharts monotone/linear path: the M point and every segment end point
  const out = [];
  const re = /([MLCZ])([^MLCZ]*)/g;
  let m;
  while ((m = re.exec(d))) {
    const n = m[2].split(/[ ,]+/).filter(Boolean).map(Number);
    if (m[1] === "M" || m[1] === "L") out.push([n[0], n[1]]);
    if (m[1] === "C") out.push([n[4], n[5]]);
  }
  return out;
};
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const SVG_ORIGIN = { c1: [333, 291], c2: [333, 701] }; // svg top-left in app px (S0/S1 layout)
const NOTICE_H = 19.5; // the scenario notice line pushes everything below the summary down

// ---------- charts ----------
function chartSvg(id, c0) {
  const g = (i, y) => `<line id="${id}-g${i}" x1="60" x2="1054" y1="${y}" y2="${y}" stroke="#E4E4E7" />`;
  const yt = (st, c, on) =>
    `<g id="${id}-yt-${st}"${on ? "" : ' opacity="0"'}>` +
    c.yTicks.map((t) => `<text x="52" y="${t.y}" dy="0.355em" text-anchor="end" font-size="11" fill="#a1a1aa">${esc(t.text)}</text>`).join("") +
    `</g>`;
  const xt = c0.xTicks.map((t) => `<text x="${t.x}" y="${t.y}" dy="0.71em" text-anchor="middle" font-size="11" fill="#a1a1aa">${esc(t.text)}</text>`).join("");
  const s = cap.charts;
  const idx = id === "c1" ? 0 : 1;
  return `<svg id="${id}-svg" width="1062" height="320" viewBox="0 0 1062 320">
  <defs>
    <linearGradient id="${id}-ci" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#dbeafe" stop-opacity="0.65"/><stop offset="100%" stop-color="#dbeafe" stop-opacity="0.35"/></linearGradient>
    <clipPath id="${id}-clip"><rect x="60" y="8" width="994" height="282"/></clipPath>
  </defs>
  <g>${c0.grid.map((y, i) => g(i, y)).join("")}</g>
  <g clip-path="url(#${id}-clip)">
    <path id="${id}-area" d="${c0.area}" fill="url(#${id}-ci)" fill-opacity="0.6" stroke="none"/>
    <path id="${id}-hist" d="${c0.hist}" fill="none" stroke="#71717a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path id="${id}-bridge" d="${c0.bridge}" fill="none" stroke="#71717a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path id="${id}-fc" d="${c0.fc}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="8 4" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <line x1="${c0.ref}" x2="${c0.ref}" y1="290" y2="8" stroke="#d4d4d8" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="${c0.refLabel.x}" y="${c0.refLabel.y}" dy="0.71em" text-anchor="end" style="font-size:10px;fill:#a1a1aa">Forecast starts</text>
  <g id="${id}-hover" opacity="0"></g>
  ${yt("s0", s.s0[idx], true)}${yt("s1", s.s1[idx], false)}${yt("s2", s.s2[idx], false)}
  <g>${xt}</g>
</svg>`;
}
function chartArticle(id, title) {
  const idx = id === "c1" ? 0 : 1;
  return `<article class="ic-chart rounded-xl border border-zinc-200 border-t-blue-600/40 bg-white p-5 shadow-sm" id="${id}">
  <div class="flex items-center justify-between mb-3">
    <h3 class="text-sm font-semibold text-zinc-800">${title}</h3>
    <div class="flex items-center gap-4">
      <span class="inline-flex items-center gap-1.5 text-xs text-zinc-500"><span class="inline-block w-5 h-0 border-t-2 border-zinc-400"></span>Historical</span>
      <span class="inline-flex items-center gap-1.5 text-xs text-zinc-500"><span class="inline-block w-5 h-0 border-t-2 border-dashed border-blue-500"></span>Forecast</span>
    </div>
  </div>
  <div class="relative w-full min-w-0" style="height:320px">${chartSvg(id, cap.charts.s0[idx])}${id === "c2" ? TOOLTIP : ""}</div>
</article>`;
}

// tooltip on the cost chart at Jul 2026 (S1): values from the API, CI from forecast-chart / page.tsx rules
const c2s1 = cap.charts.s1[1];
const fcPts = pts(c2s1.fc); // Jan..Dec 2026
const jul = fcPts[6];
// y scale of the S1 cost chart from two inner ticks
const [tA, tB] = [c2s1.yTicks[1], c2s1.yTicks[3]];
const vA = Number(tA.text.replace(/[$,]/g, "")), vB = Number(tB.text.replace(/[$,]/g, ""));
const yOf = (v) => tA.y + ((v - vA) * (tB.y - tA.y)) / (vB - vA);
const JUL_AVG = 21383.35; // /series/costs avg_cost_per_claim 2026-07, TX Construction LostTime
const ciLo = JUL_AVG * 0.84, ciHi = JUL_AVG * 1.16; // halfSpread = v * 0.1 * (1 + 0.1 * 6)
const usd = (v) => "$" + Math.round(v).toLocaleString("en-US");
const TIP_X = jul[0], TIP_Y = jul[1];
const TOOLTIP = `<div class="ic-tip" data-layout-allow-overlap data-layout-allow-occlusion id="c2-tip" style="right:${(1062 - (TIP_X - 10)).toFixed(1)}px; top:${(TIP_Y - 150).toFixed(1)}px; white-space:nowrap">
  <p class="text-xs font-semibold text-zinc-500 mb-2">Jul 2026</p>
  <div class="flex items-center justify-between gap-4 text-sm"><span class="text-zinc-500">Forecast CI</span><span class="font-semibold text-zinc-900">${usd(ciLo)} - ${usd(ciHi)}</span></div>
  <div class="flex items-center justify-between gap-4 text-sm"><span class="text-zinc-500">Forecast</span><span class="font-semibold text-zinc-900">${usd(JUL_AVG)}</span></div>
</div>`;
const HOVER_C2 = `<path d="M${TIP_X},8L${TIP_X},290" stroke="#ccc"/>` +
  `<circle cx="${TIP_X}" cy="${yOf(ciHi).toFixed(2)}" r="4" fill="url(#c2-ci)" stroke="#fff" stroke-width="2"/>` +
  `<circle cx="${TIP_X}" cy="${yOf(ciLo).toFixed(2)}" r="4" fill="url(#c2-ci)" stroke="#fff" stroke-width="2"/>` +
  `<circle cx="${TIP_X}" cy="${TIP_Y}" r="4" fill="#2563eb" stroke="#fff" stroke-width="2"/>`;

// ---------- summary narratives ----------
// emphasis follows forecast-summary-panel.tsx: plain numbers -> bg-blue-50/90 chips, **bold** numbers -> bg-blue-100/80
const chip = (t, strong) =>
  strong
    ? `<strong class="font-semibold text-stone-800"><strong class="rounded-sm bg-blue-100/80 px-1 py-0.5 font-semibold text-stone-800">${t}</strong></strong>`
    : `<strong class="rounded-sm bg-blue-50/90 px-1 py-0.5 font-semibold text-stone-700">${t}</strong>`;
function narrative(text, strongSet, wrapWords) {
  const tokens = text.split(" ");
  return tokens
    .map((tok) => {
      const m = tok.match(/^(\$?[\d,.]+)([.,]?)$/);
      let html;
      if (m && /\d/.test(m[1])) {
        const num = m[1].replace(/[.,]$/, "");
        const trail = tok.slice(num.length);
        html = chip(num, strongSet.has(num)) + trail;
      } else html = esc(tok);
      return wrapWords ? `<span class="w">${html}</span>` : html;
    })
    .join(" ");
}
const NARR_S0 = narrative(cap.summary.s0.text, new Set(["6", "4.77", "$1,268,983"]), false);
const NARR_S1 = narrative(cap.summary.s1.text, new Set(["59", "61", "$1,331,177"]), true);

// ---------- table ----------
const COLGROUP = `<colgroup><col style="width:25%"><col style="width:18.75%"><col style="width:28.125%"><col style="width:28.125%"></colgroup>`;
const td = "px-2 py-3 align-middle text-center sm:px-3 md:px-4 border-b border-zinc-100 text-zinc-800";
const row = (r, i, ids) => `<tr class="${r.fc ? "bg-blue-50/40" : "bg-white"}" style="height:65.3px"${ids ? ` id="row-${i}"` : ` id="mrow-${i}"`}>
  <td class="${td}"><div class="flex flex-col items-center gap-0.5"><span class="font-medium text-zinc-800">${r.month}</span>${r.fc ? '<span class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600">forecast</span>' : ""}</div></td>
  <td class="tabular-nums ${td}"${ids ? ` id="r${i}-c"` : ""}>${r.claims}</td>
  <td class="tabular-nums ${td}"${ids ? ` id="r${i}-p"` : ""}>${r.paid}</td>
  <td class="tabular-nums ${td}"${ids ? ` id="r${i}-a"` : ""}>${r.avg}</td></tr>`;
const ROWS_TOP = cap.rows.s1.slice(0, 3).map((r, i) => row(r, i, true)).join("");
const MORE_N = 14;
const ROWS_MORE = cap.rows.s2.slice(3, 3 + MORE_N).map((r, i) => row(r, i, false)).join("");

// ---------- menus ----------
const CHECK = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>`;
const G = Object.assign({}, cap.geom, fs.existsSync(path.join(ROOT, "assets/data/geom-recreation.json")) ? JSON.parse(rd("assets/data/geom-recreation.json")) : {});
const MENU_DEFS = {
  state: { sel: G.state, items: ["FL", "NY", "HI", "LA", "TX"], cur: 1 },
  ind: { sel: G.industry, items: ["Construction", "Healthcare", "Manufacturing"], cur: 1 },
  ct: { sel: G.claimType, items: ["Indemnity", "LostTime", "MedicalOnly"], cur: 0 },
};
const MENUS = Object.entries(MENU_DEFS)
  .map(([k, m]) => `<div class="ic-menu" data-layout-allow-overlap data-layout-allow-occlusion id="menu-${k}" style="left:${m.sel.x}px; top:${m.sel.y + m.sel.h + 4}px; width:${m.sel.w}px">
  <div class="ic-menu-hl" id="menu-${k}-hl"></div>
  ${m.items.map((it, i) => `<div class="ic-item" id="menu-${k}-i${i}"><span>${it}</span>${i === m.cur ? CHECK : ""}</div>`).join("")}
</div>`)
  .join("\n");

// ---------- callouts ----------
// anchor in app px; box offset (dx, dy) and font size are in SCREEN px, divided by the zoom the callout is seen at
const c1s1 = cap.charts.s1[0];
const [o1x, o1y] = SVG_ORIGIN.c1, [o2x, o2y] = SVG_ORIGIN.c2;
const histPts = pts(c1s1.hist), fc1Pts = pts(c1s1.fc), area1 = pts(c1s1.area);
const c2s2 = cap.charts.s2[1];
const fc2s2 = pts(c2s2.fc);
const CALL = [
  { id: "call-a", text: "Actual claims through Dec 2025", ax: o1x + histPts.at(-1)[0], ay: o1y + histPts.at(-1)[1], dx: -380, dy: -250, z: 1.68 },
  { id: "call-b", text: "12-month SARIMAX forecast", ax: o1x + fc1Pts[6][0], ay: o1y + fc1Pts[6][1], dx: -560, dy: -210, z: 1.68 },
  { id: "call-c", text: "Range widens further out", ax: o1x + area1[10][0], ay: o1y + area1[10][1], dx: -520, dy: -40, z: 1.68 },
  { id: "call-d", text: "Average cost per claim, projected", ax: o2x + fcPts[3][0], ay: o2y + fcPts[3][1], dx: -560, dy: -190, z: 1.68 },
  { id: "call-e", text: "Severity +10% lifts cost per claim", ax: o2x + fc2s2[0][0], ay: o2y - 349 + fc2s2[0][1], dx: -600, dy: -150, z: 1.333 },
];
function callout(c) {
  const fs = 30 / c.z, padY = 14 / c.z, padX = 22 / c.z, dot = 9 / c.z, lw = 2 / c.z;
  const bw = (c.text.length * 30 * 0.53 + 44) / c.z, bh = fs * 1.2 + 2 * padY; // box size estimate for the leader
  const bx = c.ax + c.dx / c.z, by = c.ay + c.dy / c.z; // box top-left
  // leader ends at the box edge closest to the anchor (bottom or top centre-ish)
  const ex = bx + (c.dx < 0 ? bw - 24 / c.z : 24 / c.z), ey = c.dy < 0 ? by + bh : by;
  const len = Math.hypot(ex - c.ax, ey - c.ay), ang = (Math.atan2(ey - c.ay, ex - c.ax) * 180) / Math.PI;
  return `<div class="ic-call" data-layout-allow-overlap data-layout-allow-occlusion id="${c.id}" style="left:0;top:0">
  <div class="ic-call-line" id="${c.id}-line" style="left:${c.ax}px; top:${c.ay - lw / 2}px; width:${len.toFixed(1)}px; height:${lw}px; transform:rotate(${ang.toFixed(2)}deg)"></div>
  <div class="ic-call-dot" style="left:${c.ax - dot / 2}px; top:${c.ay - dot / 2}px; width:${dot}px; height:${dot}px"></div>
  <div class="ic-call-box" id="${c.id}-box" style="left:${bx.toFixed(1)}px; top:${by.toFixed(1)}px; font-size:${fs.toFixed(2)}px; line-height:1.2; padding:${padY.toFixed(1)}px ${padX.toFixed(1)}px">${esc(c.text)}</div>
</div>`;
}
const CALLOUTS = CALL.map(callout).join("\n");

const INFO_ICON = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke-width="1.5"></circle><path stroke-linecap="round" stroke-width="1.5" d="M12 11v5"></path><circle cx="12" cy="7.5" r="0.75" fill="currentColor" stroke="none"></circle></svg>`;

markup = markup
  .replaceAll("{{INFO_ICON}}", INFO_ICON)
  .replace("{{NOTICE}}", esc(cap.summary.s2notice))
  .replace("{{NARR_S0}}", NARR_S0)
  .replace("{{NARR_S1}}", NARR_S1)
  .replace("{{CHART1}}", chartArticle("c1", "Amount of Claims per Month"))
  .replace("{{CHART2}}", chartArticle("c2", "Average Cost per Claim per Month"))
  .replaceAll("{{COLGROUP}}", COLGROUP)
  .replace("{{ROWS_TOP}}", ROWS_TOP)
  .replace("{{ROWS_MORE}}", ROWS_MORE)
  .replace("{{MENUS}}", MENUS)
  .replace("{{CALLOUTS}}", CALLOUTS)
  .replace(`<g id="c2-hover" opacity="0"></g>`, `<g id="c2-hover" opacity="0">${HOVER_C2}</g>`);

// data the timeline needs (morph targets, counts, geometry)
const DATA = {
  geom: G,
  charts: ["s0", "s1", "s2"].reduce((o, s) => ((o[s] = cap.charts[s].map((c) => ({ grid: c.grid, area: c.area, hist: c.hist, bridge: c.bridge, fc: c.fc }))), o), {}),
  rows: { s1: cap.rows.s1.slice(0, 3), s2: cap.rows.s2.slice(0, 3) },
  menus: Object.fromEntries(Object.entries(MENU_DEFS).map(([k, m]) => [k, { top: m.sel.y + m.sel.h + 4, n: m.items.length }])),
  moreN: MORE_N,
  tip: { x: 333 + TIP_X, y: 701 + TIP_Y },
  noticeH: NOTICE_H,
};

const out = `<template>
<style>
${css}
</style>
${markup}
<script>
window.__IC_DATA = ${JSON.stringify(DATA)};
${timeline}
</script>
</template>
`;
fs.writeFileSync(path.join(ROOT, "compositions/app.html"), out);
console.log("wrote compositions/app.html", (out.length / 1024).toFixed(1) + " KB", "tooltip", usd(ciLo), usd(ciHi));

// ---------- intro (hook poster uses the real S1 claims curve) ----------
{
  const c = cap.charts.s1[0];
  const intro = rd("src/intro.html").replace("{{AREA}}", c.area).replace("{{HIST}}", c.hist).replace("{{BRIDGE}}", c.bridge).replace("{{FC}}", c.fc);
  fs.writeFileSync(path.join(ROOT, "compositions/intro.html"), intro);
  console.log("wrote compositions/intro.html");
}
