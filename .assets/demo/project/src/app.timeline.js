(function () {
  "use strict";
  var D = window.__IC_DATA;
  // Keep every transform 2D: GSAP's force3D:"auto" switches to translate3d mid-tween, which promotes the
  // camera to a compositor layer that is rasterized at one scale and stretched (soft text, frame-to-frame flicker).
  gsap.config({ force3D: false });
  var tl = gsap.timeline({ paused: true });
  var NI = { immediateRender: false };
  function fromTo(t, a, b, pos) {
    b.immediateRender = false;
    var r = tl.fromTo(t, a, b, pos);
    if (b.filter === "blur(0px)") tl.set(t, { filter: "none" }, pos + (b.duration || 0.5) + 0.001);
    return r;
  }
  var APP0 = 5.9; // this scene's host data-start in index.html; all times below are GLOBAL seconds
  var T = function (g) { return Math.max(0, g - APP0); };
  var FPS = 30;
  var $ = function (id) { return document.getElementById(id); };

  // ---------------- camera ----------------
  function camAt(cx, cy, s) {
    var hw = 960 / s, hh = 540 / s;
    cx = Math.min(Math.max(cx, hw), 1440 - hw);
    cy = Math.min(Math.max(cy, hh), 1080 - hh);
    return { x: 960 - cx * s, y: 540 - cy * s, scale: s };
  }
  var CAM = "#ic-cam";
  function camSet(g, cx, cy, s) { tl.set(CAM, camAt(cx, cy, s), T(g)); }
  function cam(g, cx, cy, s, d) {
    var v = camAt(cx, cy, s);
    v.duration = d || 1.0; v.ease = "power2.inOut";
    tl.to(CAM, v, T(g));
  }

  // ---------------- cursor ----------------
  var CUR = "#ic-cursor";
  var HX = 5.5, HY = 2.5; // hotspot inside the 24px svg
  var cur = { x: 900, y: 600 };
  function curSet(g, x, y, op) { cur = { x: x, y: y }; tl.set(CUR, { x: x - HX, y: y - HY, opacity: op == null ? 1 : op }, T(g)); }
  function curMove(g, x, y, d, ease) {
    tl.to(CUR, { x: x - HX, y: y - HY, duration: d || 0.7, ease: ease || "power3.inOut" }, T(g));
    var from = cur; cur = { x: x, y: y };
    return { from: from, to: cur, g: g, d: d || 0.7, ease: ease || "power3.inOut" };
  }
  function click(g) {
    tl.to(CUR, { scale: 0.86, duration: 0.07, ease: "power2.out" }, T(g));
    tl.to(CUR, { scale: 1, duration: 0.14, ease: "power2.out" }, T(g + 0.1));
  }
  function swap(a, b, g, d) {
    d = d || 0.16;
    fromTo(a, { opacity: 1, filter: "blur(0px)" }, { opacity: 0, filter: "blur(3px)", duration: d * 0.8, ease: "power2.in" }, T(g));
    fromTo(b, { opacity: 0, filter: "blur(3px)" }, { opacity: 1, filter: "blur(0px)", duration: d, ease: "power2.out" }, T(g + d * 0.35));
  }

  // per-frame text sets (seek-safe counters)
  function countText(el, g, d, fn, ease) {
    var e = gsap.parseEase(ease || "power2.out");
    var n = Math.max(1, Math.round(d * FPS));
    var last = null;
    for (var f = 0; f <= n; f++) {
      var s = fn(e(f / n));
      if (s !== last) { tl.set(el, { textContent: s }, T(g + f / FPS)); last = s; }
    }
  }

  // ---------------- dropdowns ----------------
  function menuOpen(k, g) {
    fromTo("#menu-" + k, { opacity: 0, scaleY: 0.96, y: -4 }, { opacity: 1, scaleY: 1, y: 0, duration: 0.2, ease: "power2.out" }, T(g));
  }
  function menuClose(k, g) {
    tl.to("#menu-" + k, { opacity: 0, scaleY: 0.98, y: -2, duration: 0.14, ease: "power2.in" }, T(g));
  }
  // highlight follows the cursor tip across menu rows, frame by frame
  function menuTrack(k, mv) {
    var m = D.menus[k], e = gsap.parseEase(mv.ease), n = Math.round(mv.d * FPS), prev = -1;
    var hl = "#menu-" + k + "-hl";
    for (var f = 0; f <= n; f++) {
      var y = mv.from.y + (mv.to.y - mv.from.y) * e(f / n);
      var idx = Math.floor((y - (m.top + 4)) / 32);
      if (idx < 0 || idx >= m.n) idx = -1;
      if (idx !== prev) {
        var tt = T(mv.g + f / FPS);
        if (prev >= 0) tl.set("#menu-" + k + "-i" + prev, { color: "#18181b" }, tt);
        if (idx >= 0) {
          tl.set("#menu-" + k + "-i" + idx, { color: "#1d4ed8" }, tt);
          tl.set(hl, { y: idx * 32, opacity: 1 }, tt);
        } else tl.set(hl, { opacity: 0 }, tt);
        prev = idx;
      }
    }
  }
  function pick(k, g) { // press flash on the chosen row
    tl.to("#menu-" + k + "-hl", { backgroundColor: "#dbeafe", duration: 0.06 }, T(g));
  }
  function hoverSel(sel, g) { tl.to(sel, { borderColor: "#d4d4d8", duration: 0.12 }, T(g)); }
  function unhoverSel(sel, g) { tl.to(sel, { borderColor: "#e4e4e7", duration: 0.2 }, T(g)); }
  function pressSel(sel, g) {
    tl.to(sel, { backgroundColor: "#f4f4f5", duration: 0.06 }, T(g));
    tl.to(sel, { backgroundColor: "#ffffff", duration: 0.18 }, T(g + 0.1));
  }

  // ---------------- draft + buttons ----------------
  var draftNow = 0;
  function draft(n, g) { if (n === draftNow) return; swap("#draft-" + draftNow, "#draft-" + n, g, 0.18); draftNow = n; }
  function btnEnable(g) {
    tl.to("#btn-update", { backgroundColor: "#2563eb", color: "#ffffff", duration: 0.25, ease: "power1.out" }, T(g));
    tl.to("#btn-reset", { borderColor: "#e4e4e7", color: "#3f3f46", duration: 0.25 }, T(g));
  }
  function btnUpdating(g) {
    tl.to("#btn-update", { backgroundColor: "#e4e4e7", color: "#71717a", duration: 0.15 }, T(g));
    swap("#btn-update-a", "#btn-update-b", g, 0.14);
    tl.to("#btn-reset", { borderColor: "#f4f4f5", color: "#a1a1aa", duration: 0.15 }, T(g));
  }
  function btnIdle(g) { swap("#btn-update-b", "#btn-update-a", g, 0.14); }
  function pressBtn(sel, g) {
    tl.to(sel, { scale: 0.97, duration: 0.07, ease: "power2.out" }, T(g));
    tl.to(sel, { scale: 1, duration: 0.16, ease: "power2.out" }, T(g + 0.09));
  }

  // ---------------- charts ----------------
  function morph(from, to, g) {
    ["c1", "c2"].forEach(function (c, i) {
      var A = D.charts[from][i], B = D.charts[to][i];
      ["area", "hist", "bridge", "fc"].forEach(function (k) {
        fromTo("#" + c + "-" + k, { attr: { d: A[k] } }, { attr: { d: B[k] }, duration: 1.0, ease: "sine.inOut" }, T(g));
      });
      A.grid.forEach(function (y, j) {
        fromTo("#" + c + "-g" + j, { attr: { y1: y, y2: y } }, { attr: { y1: B.grid[j], y2: B.grid[j] }, duration: 1.0, ease: "sine.inOut" }, T(g));
      });
      fromTo("#" + c + "-yt-" + from, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "power1.in" }, T(g + 0.1));
      fromTo("#" + c + "-yt-" + to, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.out" }, T(g + 0.35));
    });
  }
  function busy(g, until) {
    tl.to("#sum-body", { opacity: 0.75, duration: 0.2 }, T(g));
    fromTo("#sum-badge", { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" }, T(g));
    fromTo("#sum-spinner", { rotation: 0 }, { rotation: 360 * ((until - g) / 0.8), duration: until - g, ease: "none" }, T(g));
    tl.to("#sum-badge", { opacity: 0, y: -6, duration: 0.15, ease: "power2.in" }, T(until));
    tl.to("#sum-body", { opacity: 1, duration: 0.2 }, T(until));
  }

  // ---------------- callouts ----------------
  function callout(id, g, hold) {
    var el = "#" + id;
    tl.set(el, { opacity: 1 }, T(g));
    fromTo(el + " .ic-call-dot", { scale: 0 }, { scale: 1, duration: 0.22, ease: "back.out(2)" }, T(g));
    fromTo(el + "-line", { scaleX: 0 }, { scaleX: 1, duration: 0.28, ease: "power3.out" }, T(g + 0.08));
    fromTo(el + "-box", { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.2, ease: "power2.out" }, T(g + 0.18));
    tl.to(el, { opacity: 0, duration: 0.2, ease: "power2.in" }, T(g + hold));
  }

  // ---------------- scroll ----------------
  function scrollTo(g, y, d) { tl.to("#ic-scroll", { y: -y, duration: d || 1.0, ease: "power2.inOut" }, T(g)); }

  // =============== initial state ===============
  gsap.set(CUR, { x: 1000, y: 640, opacity: 0, scale: 1 });
  gsap.set(CAM, camAt(720, 405, 4 / 3));
  gsap.set("#sev-fill", { scaleX: 0 });
  gsap.set("#freq-fill", { scaleX: 10 / 35 });
  gsap.set("#freq-thumb", { x: (10 / 35) * 231 });
  camSet(APP0, 720, 405, 4 / 3);
  tl.set(CUR, { x: 1000, y: 640, opacity: 0, scale: 1 }, 0);
  tl.set("#ic-scroll", { y: 0 }, 0);
  tl.set("#sev-fill", { scaleX: 0 }, 0);
  tl.set("#sev-thumb", { x: 0 }, 0);
  tl.set("#freq-fill", { scaleX: 10 / 35 }, 0);
  tl.set("#freq-thumb", { x: (10 / 35) * 231 }, 0);
  tl.set("#c2-tip", { opacity: 0 }, 0);

  // =============== 1. segment: State, Industry, Claim type ===============
  var S = D.geom.state, I = D.geom.industry, C = D.geom.claimType;
  cam(6.55, 436, 300, 2.2, 1.0);
  curSet(6.85, 860, 560, 1);
  curMove(6.9, 205, S.y + 18, 0.8);
  hoverSel("#sel-state", 7.62);
  click(7.95); pressSel("#sel-state", 7.95);
  menuOpen("state", 8.0);
  menuTrack("state", curMove(8.35, 185, D.menus.state.top + 4 + 4 * 32 + 16, 0.7, "power2.inOut"));
  click(9.2); pick("state", 9.2);
  menuClose("state", 9.3); unhoverSel("#sel-state", 9.3);
  swap("#sel-state-a", "#sel-state-b", 9.32);
  draft(1, 9.36); btnEnable(9.36);

  curMove(9.6, 205, I.y + 18, 0.6);
  hoverSel("#sel-ind", 10.15);
  click(10.4); pressSel("#sel-ind", 10.4);
  menuOpen("ind", 10.45);
  menuTrack("ind", curMove(10.75, 190, D.menus.ind.top + 4 + 16, 0.45, "power2.inOut"));
  click(11.35); pick("ind", 11.35);
  menuClose("ind", 11.45); unhoverSel("#sel-ind", 11.45);
  swap("#sel-ind-a", "#sel-ind-b", 11.47);
  draft(2, 11.5);

  curMove(11.7, 205, C.y + 18, 0.45);
  hoverSel("#sel-ct", 12.1);
  click(12.3); pressSel("#sel-ct", 12.3);
  menuOpen("ct", 12.35);
  menuTrack("ct", curMove(12.65, 190, D.menus.ct.top + 4 + 32 + 16, 0.45, "power2.inOut"));
  click(13.25); pick("ct", 13.25);
  menuClose("ct", 13.35); unhoverSel("#sel-ct", 13.35);
  swap("#sel-ct-a", "#sel-ct-b", 13.37);
  draft(3, 13.4);

  // Update Forecast
  var U = D.geom.update;
  cam(13.55, 436, 835, 2.2, 1.0);
  curMove(13.95, U.x + U.w / 2 + 6, U.y + U.h / 2 + 4, 0.75);
  tl.to("#btn-update", { backgroundColor: "#1d4ed8", duration: 0.12 }, T(14.7));
  click(14.95); pressBtn("#btn-update", 14.95);
  btnUpdating(15.05); draft(0, 15.05);
  tl.to(CUR, { opacity: 0, duration: 0.2 }, T(15.6));

  // results
  busy(15.1, 17.9);
  fromTo("#badge-a", { opacity: 1 }, { opacity: 0, duration: 0.12 }, T(17.15));
  fromTo("#badge-b", { opacity: 0 }, { opacity: 1, duration: 0.15 }, T(17.22));
  cam(15.3, 840, 400, 1.6, 1.0);
  morph("s0", "s1", 16.35);
  btnIdle(17.4);
  swap("#sum-label-a", "#sum-label-b", 17.95, 0.2);
  tl.to("#narr-a", { opacity: 0, filter: "blur(3px)", duration: 0.15 }, T(17.95));
  cam(17.6, 864, 314, 1.72, 1.0);
  // stream the real conclusion word by word, in uneven bursts (seeded)
  (function () {
    var seed = 7; var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    var words = document.querySelectorAll("#narr-b .w"), t = 18.15;
    for (var i = 0; i < words.length; i++) {
      fromTo(words[i], { opacity: 0, filter: "blur(4px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.14, ease: "power2.out" }, T(t));
      var burst = rnd() < 0.72;
      t += burst ? 0.03 + rnd() * 0.03 : 0.08 + rnd() * 0.05;
    }
  })();

  // =============== 2. reading the forecast (sheet covers 22.0-24.4) ===============
  camSet(22.6, 864, 435, 1.68);
  callout("call-a", 24.7, 1.6);
  callout("call-b", 26.55, 1.6);
  callout("call-c", 28.4, 1.6);
  cam(30.15, 864, 845, 1.68, 1.0);
  // hover Jul 2026 on the cost chart: the real Recharts tooltip
  curSet(30.9, 1500, 1120, 1);
  curMove(30.95, D.tip.x, D.tip.y + 4, 0.85);
  fromTo("#c2-hover", { opacity: 0 }, { opacity: 1, duration: 0.1 }, T(31.82));
  fromTo("#c2-tip", { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.12, ease: "power2.out" }, T(31.85));
  tl.to("#c2-hover", { opacity: 0, duration: 0.1 }, T(33.45));
  tl.to("#c2-tip", { opacity: 0, duration: 0.1 }, T(33.45));
  curMove(33.4, D.tip.x + 120, D.tip.y + 150, 0.5, "power2.in");
  tl.to(CUR, { opacity: 0, duration: 0.15 }, T(33.75));
  callout("call-d", 33.75, 1.8);

  // =============== 3. scenario (sheet covers 36.4-38.8) ===============
  camSet(37.0, 436, 640, 2.2);
  var SV = D.geom.sev, FQ = D.geom.freq;
  function thumbX(v, min, max) { return ((v - min) / (max - min)) * 231; }
  function drag(name, track, v0, v1, min, max, g, d, valId) {
    var e = gsap.parseEase("power2.inOut");
    var y = track.y + 3;
    var x0 = track.x + thumbX(v0, min, max) + 8, x1 = track.x + thumbX(v1, min, max) + 8;
    tl.to("#" + name + "-thumb", { x: thumbX(v1, min, max), duration: d, ease: "power2.inOut" }, T(g));
    tl.to("#" + name + "-fill", { scaleX: (v1 - min) / (max - min), duration: d, ease: "power2.inOut" }, T(g));
    tl.to(CUR, { x: x1 + 2 - HX, y: y + 4 - HY, duration: d, ease: "power2.inOut" }, T(g));
    cur = { x: x1 + 2, y: y + 4 };
    countText("#" + valId, g, d, function (p) { return Math.round(v0 + (v1 - v0) * p) + "%"; }, "power2.inOut");
  }
  function thumbHover(name, g) { tl.to("#" + name + "-thumb", { boxShadow: "0 0 0 4px rgba(37,99,235,0.12), 0 1px 4px rgba(0,0,0,0.18)", duration: 0.12 }, T(g)); }
  function thumbPress(name, g) {
    tl.to("#" + name + "-thumb", { boxShadow: "0 0 0 6px rgba(37,99,235,0.15), 0 1px 4px rgba(0,0,0,0.18)", duration: 0.08 }, T(g));
    tl.to(CUR, { scale: 0.86, duration: 0.07 }, T(g));
  }
  function thumbRelease(name, g) {
    tl.to("#" + name + "-thumb", { boxShadow: "0 0 0 0px rgba(37,99,235,0), 0 1px 4px rgba(0,0,0,0.18)", duration: 0.2 }, T(g));
    tl.to(CUR, { scale: 1, duration: 0.14 }, T(g));
  }
  curSet(38.7, 900, 760, 1);
  curMove(38.85, SV.x + 8 + 2, SV.y + 3 + 4, 0.85);
  thumbHover("sev", 39.7);
  thumbPress("sev", 39.9);
  drag("sev", SV, 0, 10, 0, 20, 40.0, 1.1, "sev-val");
  draft(1, 40.12); btnEnable(40.12);
  thumbRelease("sev", 41.2);

  curMove(41.45, FQ.x + thumbX(0, -10, 25) + 8 + 2, FQ.y + 3 + 4, 0.55);
  thumbHover("freq", 42.0);
  thumbPress("freq", 42.15);
  drag("freq", FQ, 0, 15, -10, 25, 42.25, 1.1, "freq-val");
  draft(2, 42.35);
  thumbRelease("freq", 43.45);

  cam(43.6, 436, 835, 2.2, 0.95);
  curMove(43.95, U.x + U.w / 2 + 6, U.y + U.h / 2 + 4, 0.65);
  tl.to("#btn-update", { backgroundColor: "#1d4ed8", duration: 0.12 }, T(44.6));
  click(44.85); pressBtn("#btn-update", 44.85);
  btnUpdating(44.95); draft(0, 44.95);
  tl.to(CUR, { opacity: 0, duration: 0.2 }, T(45.4));

  // pull back over charts + table; the scenario notice opens above (scroll compensates the push-down)
  cam(45.15, 720, 600, 4 / 3, 1.05);
  scrollTo(45.15, 349, 1.05);
  tl.to("#sum-notice-wrap", { height: D.noticeH, duration: 0.3, ease: "power2.out" }, T(46.2));
  tl.to("#ic-scroll", { y: -(349 + D.noticeH), duration: 0.3, ease: "power2.out" }, T(46.2));
  busy(45.0, 47.6);
  morph("s1", "s2", 46.45);
  btnIdle(46.9);
  // table: the first rows count to the scenario values
  [0, 1, 2].forEach(function (i) {
    var a = D.rows.s1[i], b = D.rows.s2[i];
    var num = function (s) { return Number(String(s).replace(/[$,]/g, "")); };
    var fmtN = function (v) { return Math.round(v).toLocaleString("en-US"); };
    var fmt$ = function (v) { return "$" + Math.round(v).toLocaleString("en-US"); };
    countText("#r" + i + "-c", 46.45, 1.15, function (p) { return fmtN(num(a.claims) + (num(b.claims) - num(a.claims)) * p); });
    countText("#r" + i + "-p", 46.45, 1.15, function (p) { return fmt$(num(a.paid) + (num(b.paid) - num(a.paid)) * p); });
    countText("#r" + i + "-a", 46.45, 1.15, function (p) { return fmt$(num(a.avg) + (num(b.avg) - num(a.avg)) * p); });
  });
  callout("call-e", 47.75, 1.8);

  // =============== 4. every month ===============
  cam(49.75, 840, 743, 1.6, 0.95);
  var moreY = 1366.8 + D.noticeH - (349 + D.noticeH) + 18.5; // centre of the button after scroll
  curSet(50.05, 1250, 1130, 1);
  curMove(50.1, 880, moreY + 4, 0.7);
  tl.to("#btn-more", { backgroundColor: "#fafafa", color: "#3f3f46", duration: 0.12 }, T(50.8));
  click(51.0);
  swap("#btn-more-a", "#btn-more-b", 51.08, 0.14);
  tl.to("#tbl-more-wrap", { height: D.moreN * 65.3, duration: 0.55, ease: "power2.out" }, T(51.1));
  tl.to("#tbl-more-wrap tr", { opacity: 1, duration: 0.25, ease: "power2.out", stagger: 0.05 }, T(51.12));
  tl.to("#btn-more", { backgroundColor: "#ffffff", color: "#71717a", duration: 0.2 }, T(51.3));
  tl.to(CUR, { opacity: 0, duration: 0.2 }, T(51.35));
  scrollTo(51.4, 349 + D.noticeH + 430, 1.4);
  // pull back to context: the whole dashboard with the scenario applied
  cam(53.0, 720, 540, 4 / 3, 1.1);
  tl.to({}, { duration: 0.01 }, T(56.5)); // hold to the end of the slot

  window.__timelines["app"] = tl;
})();
