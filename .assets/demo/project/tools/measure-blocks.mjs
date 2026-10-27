// Lists every block a camera frame edge must not cut (text lines, controls, cards, table rows) in app px,
// for the rebuilt app at main scroll 0. Usage: node tools/measure-blocks.mjs <playwright-dir>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const { chromium } = createRequire(path.join(process.argv[2], "package.json"))("playwright");
const html = fs.readFileSync(path.join(ROOT, "compositions/app.html"), "utf8");
const inner = html.replace(/^<template>/, "").replace(/<\/template>\s*$/, "").replace(/<script>[\s\S]*<\/script>/, "");
const fontUrl = "file://" + path.join(ROOT, "assets/fonts/Geist-latin.woff2");
const browser = await chromium.launch({ executablePath: process.env.CHROME });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.setContent(`<!doctype html><html><body style="margin:0">${inner.replaceAll("assets/fonts/Geist-latin.woff2", fontUrl)}</body></html>`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
const blocks = await page.evaluate(() => {
  const out = [];
  const add = (el, kind, col) => { const b = el.getBoundingClientRect(); if (b.width && b.height) out.push({ kind, col, id: el.id || el.textContent.trim().slice(0, 28), x0: +b.left.toFixed(1), y0: +b.top.toFixed(1), x1: +b.right.toFixed(1), y1: +b.bottom.toFixed(1) }); };
  // header text
  document.querySelectorAll("#ic-header > span").forEach((e) => add(e, "text", "header"));
  // sidebar: every leaf block (labels, controls, lines, buttons)
  const aside = document.querySelector("#ic-aside");
  aside.querySelectorAll("p, .ic-select, .ic-track, #btn-update, #btn-reset, .flex.items-center.justify-between, .text-xs.font-medium.text-zinc-500").forEach((e) => {
    // label wrappers contain their select: take only the label text line (first 16px)
    if (e.matches(".text-xs.font-medium.text-zinc-500") && !e.matches("p")) { const b = e.getBoundingClientRect(); out.push({ kind: "label", col: "side", id: e.firstChild.textContent.trim(), x0: b.left, y0: b.top, x1: b.right, y1: b.top + 16 }); return; }
    add(e, "ctl", "side");
  });
  // main cards + table rows
  ["#ic-summary", "#c1", "#c2"].forEach((s) => add(document.querySelector(s), "card", "main"));
  const t = document.querySelector("#ic-table");
  add(t.children[0], "card", "main"); // table title block
  add(t.querySelector("thead"), "row", "main");
  t.querySelectorAll("#ic-table > table tbody tr").forEach((r) => add(r, "row", "main"));
  add(document.querySelector("#btn-more"), "row", "main");
  return out;
});
fs.writeFileSync(path.join(ROOT, "assets/data/blocks.json"), JSON.stringify(blocks, null, 1));
console.log(blocks.map((b) => `${b.col}\t${b.kind}\t${String(b.id).padEnd(28)}\t${b.x0.toFixed(0)}-${b.x1.toFixed(0)}\t${b.y0.toFixed(1)}-${b.y1.toFixed(1)}`).join("\n"));
await browser.close();
