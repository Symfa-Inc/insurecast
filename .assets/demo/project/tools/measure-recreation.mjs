// Measures the rebuilt app DOM (compositions/app.html) so cursor targets match the recreation exactly.
// Usage: node tools/measure-recreation.mjs <path-to-playwright-module-dir>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const req = createRequire(path.join(process.argv[2], "package.json"));
const { chromium } = req("playwright");
const html = fs.readFileSync(path.join(ROOT, "compositions/app.html"), "utf8");
const inner = html.replace(/^<template>/, "").replace(/<\/template>\s*$/, "").replace(/<script>[\s\S]*<\/script>/, "");
const fontUrl = "file://" + path.join(ROOT, "assets/fonts/Geist-latin.woff2");
const browser = await chromium.launch({ executablePath: process.env.CHROME });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.setContent(`<!doctype html><html><body style="margin:0">${inner.replaceAll("assets/fonts/Geist-latin.woff2", fontUrl)}</body></html>`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
const geom = await page.evaluate(() => {
  const r = (s) => { const el = document.querySelector(s); const b = el.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  return {
    state: r("#sel-state"), industry: r("#sel-ind"), claimType: r("#sel-ct"),
    sev: r("#sev-track"), freq: r("#freq-track"), update: r("#btn-update"), reset: r("#btn-reset"),
    summary: r("#ic-summary"), chart1: r("#c1"), chart2: r("#c2"), svg1: r("#c1-svg"), svg2: r("#c2-svg"),
    table: r("#ic-table"), more: r("#btn-more"), row0: r("#row-0"),
  };
});
fs.writeFileSync(path.join(ROOT, "assets/data/geom-recreation.json"), JSON.stringify(geom, null, 1));
console.log(JSON.stringify(geom));
await browser.close();
