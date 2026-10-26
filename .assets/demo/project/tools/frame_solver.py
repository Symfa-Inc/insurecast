"""Camera framing solver for the InsureCast demo (v3).

For each beat: the bounding box of the relevant blocks + padding (PAD of the frame, clamped at gutters/app edges) is
fitted to a 16:9 frame and the LARGEST scale is chosen whose four edges cut no block (text line, control, card,
chart, table row) anywhere on screen. Blocks are measured from the rebuilt DOM (assets/data/blocks.json). Main-column
blocks move with the main scroll, the scenario notice line (+19.5 px) and the expanded table rows; a block that the
app's own main viewport clips (under the header, or at the window bottom) counts as cut if it is in the frame.
Frames may be wider than the app (ground shows at the sides) only when the scale is below 4/3.

Usage: python3 tools/frame_solver.py  -> prints each beat and writes assets/data/framing.json
"""

import json
import os
from typing import Any

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP_W, APP_H, FW, FH = 1440.0, 1080.0, 1920.0, 1080.0
PAD = 0.06  # target padding, fraction of the frame on every side
MAIN_TOP = 56.0
THUMB = 6.0
ROW_H = 65.3
NOTICE = 19.5

raw = json.load(open(os.path.join(ROOT, "assets/data/blocks.json")))
BASE, seen = [], set()
for b in raw:
    key = (round(b["x0"]), round(b["y0"]), round(b["x1"]), round(b["y1"]))
    if key in seen:
        continue
    seen.add(key)
    y0, y1 = b["y0"], b["y1"]
    if "track" in str(b["id"]):
        y0, y1 = y0 - THUMB, y1 + THUMB
    BASE.append(dict(b, y0=y0, y1=y1))


def blocks(scroll=0.0, notice=0.0, more_rows=0, extra=()):
    out = []
    for b in BASE:
        b = dict(b)
        if b["col"] == "main":
            shift = notice if b["y0"] >= 200 else 0.0
            if b["id"] == "ic-summary":
                b["y1"] += notice
            if b["id"] == "btn-more":
                shift += more_rows * ROW_H
            b["y0"] += shift - scroll
            b["y1"] += shift - scroll
        out.append(b)
    for i in range(more_rows):
        y = 1366.4 + notice + i * ROW_H - scroll
        out.append(
            {
                "col": "main",
                "kind": "row",
                "id": f"mrow-{i}",
                "x0": 313,
                "x1": 1415,
                "y0": y,
                "y1": y + ROW_H,
            },
        )
    for x0, y0, x1, y1, col in extra:
        out.append(
            {
                "col": col,
                "kind": "overlay",
                "id": "overlay",
                "x0": x0,
                "y0": y0,
                "x1": x1,
                "y1": y1,
            },
        )
    return out


def cuts(frame, bl):
    fx0, fy0, fx1, fy1 = frame
    bad = []
    for b in bl:
        vy0, vy1 = b["y0"], b["y1"]
        if b["col"] == "main" and b["kind"] != "overlay":
            vy0, vy1 = max(vy0, MAIN_TOP), min(vy1, APP_H)
            if vy1 <= vy0:
                continue
        if not (
            b["x0"] < fx1 - 0.5
            and b["x1"] > fx0 + 0.5
            and vy0 < fy1 - 0.5
            and vy1 > fy0 + 0.5
        ):
            continue
        if (
            b["col"] == "main"
            and b["kind"] != "overlay"
            and (b["y0"] < MAIN_TOP - 0.5 or b["y1"] > APP_H + 0.5)
        ):
            bad.append(("app-clip", b["id"]))
        for e in (fy0, fy1):
            if vy0 + 0.5 < e < vy1 - 0.5:
                bad.append(("h", b["id"]))
        for e in (fx0, fx1):
            if b["x0"] + 0.5 < e < b["x1"] - 0.5:
                bad.append(("v", b["id"]))
    return bad


def gutter_limits(rel, bl):
    """For each side of the relevant box: how far the gutter next to it reaches (to the first block or app edge)."""
    rx0, ry0, rx1, ry1 = rel

    def vis(b):
        if b["col"] == "main" and b["kind"] != "overlay":
            return max(b["y0"], MAIN_TOP), min(b["y1"], APP_H)
        return b["y0"], b["y1"]

    top, bot, left, right = 0.0, APP_H, 0.0, APP_W
    for b in bl:
        y0, y1 = vis(b)
        if y1 <= y0:
            continue
        if b["x0"] < rx1 and b["x1"] > rx0:  # blocks above / below the box
            if y1 <= ry0 + 0.5:
                top = max(top, y1)
            if y0 >= ry1 - 0.5:
                bot = min(bot, y0)
        if y0 < ry1 and y1 > ry0:  # blocks left / right of the box
            if b["x1"] <= rx0 + 0.5:
                left = max(left, b["x1"])
            if b["x0"] >= rx1 - 0.5:
                right = min(right, b["x0"])
    return top, bot, left, right


def solve(name, rel_fn, scrolls, smin=1.0, smax=2.4, **kw):
    """rel_fn(scroll) -> relevant box; scrolls: candidate main scrolls. Returns the best (largest-scale) frame.
    Padding rule: each frame edge is at least PAD of the frame beyond the relevant box, unless it sits in the gutter
    right next to the box (then the gutter or the app edge is the padding)."""
    best = None
    s = smax
    while s >= smin - 1e-9 and best is None:
        W, H = FW / s, FH / s
        px, py = PAD * W, PAD * H
        for sc in scrolls:
            rx0, ry0, rx1, ry1 = rel_fn(sc)
            bl = blocks(scroll=sc, **kw)
            gt, gb, gl, gr = gutter_limits((rx0, ry0, rx1, ry1), bl)

            # x0 must satisfy: x0 <= rx0 - px  OR  gl <= x0 <= rx0 ; same for the other sides
            def ok_side(v, lo_pad, gutter_lo, edge):  # edge on the low side
                return v <= edge - lo_pad + 1e-6 or (
                    gutter_lo - 1e-6 <= v <= edge + 1e-6
                )

            if W >= APP_W:
                xs = [APP_W / 2 - W / 2]
            else:
                xs = [float(i) for i in range(0, int(APP_W - W) + 1)]
            ys = (
                [i * 0.5 for i in range(0, int((APP_H - H) * 2) + 1)]
                if H <= APP_H
                else []
            )
            for x0 in xs:
                x1 = x0 + W
                if not (x0 <= rx0 + 1e-6 and x1 >= rx1 - 1e-6):
                    continue
                if not (x0 <= rx0 - px + 1e-6 or x0 >= gl - 1e-6 or rx0 <= 0):
                    continue
                if not (x1 >= rx1 + px - 1e-6 or x1 <= gr + 1e-6 or rx1 >= APP_W):
                    continue
                for y0 in ys:
                    y1 = y0 + H
                    if not (y0 <= ry0 + 1e-6 and y1 >= ry1 - 1e-6):
                        continue
                    if not (y0 <= ry0 - py + 1e-6 or y0 >= gt - 1e-6 or ry0 <= 0):
                        continue
                    if not (y1 >= ry1 + py - 1e-6 or y1 <= gb + 1e-6 or ry1 >= APP_H):
                        continue
                    fr = (x0, y0, x1, y1)
                    if cuts(fr, bl):
                        continue
                    c = (
                        abs((x0 + W / 2) - (rx0 + rx1) / 2)
                        + abs((y0 + H / 2) - (ry0 + ry1) / 2)
                        + 0.01 * sc
                    )
                    if best is None or c < best[0]:
                        best = (c, fr, sc, (rx0, ry0, rx1, ry1))
        if best is None:
            s = round(s - 0.005, 3)
    if best is None:
        return {"name": name, "scale": None}
    _, fr, sc, rel = best
    return {
        "name": name,
        "scale": round(s, 3),
        "cx": round((fr[0] + fr[2]) / 2, 1),
        "cy": round((fr[1] + fr[3]) / 2, 1),
        "scroll": sc,
        "frame": [round(v, 1) for v in fr],
        "rel": [round(v, 1) for v in rel],
    }


M_STATE = (20, 174, 267, 344, "side")
M_IND = (20, 248, 267, 354, "side")
M_CT = (20, 322, 267, 428, "side")
SIDE_X = (20, 267)


def main_box(c0, c1, notice=0.0):
    return lambda sc: (312, c0 + notice - sc, 1416, c1 + notice - sc)


BEATS: list[tuple[str, Any, list[float], dict[str, Any]]] = [
    # name, relevant box (may depend on scroll), candidate scrolls, solver kwargs
    ("establish (app reveal)", lambda sc: (0, 0, APP_W, 1042), [0], {}),
    (
        "segment: selects + menus + draft + charts",
        lambda sc: (20, 80, 1416, 1042),
        [0],
        {"extra": (M_STATE, M_IND, M_CT)},
    ),
    ("read conclusion + claims chart", main_box(80, 632), [0], {}),
    (
        "cost chart + tooltip",
        main_box(648, 1042),
        [float(s) for s in range(0, 360)],
        {},
    ),
    ("scenario: sliders + draft + update", lambda sc: (20, 521, 267, 1032), [0], {}),
    (
        "scenario result: cost chart + first rows",
        main_box(648, 1301.1, NOTICE),
        [float(s) for s in range(0, 369)] + [368.5],
        {"notice": NOTICE},
    ),
    (
        "table expanded",
        main_box(1062, 1062 + 63 + 44.5 + 8 * ROW_H, NOTICE),
        [float(s) for s in range(360, 1000, 2)],
        {"notice": NOTICE, "more_rows": 14},
    ),
]

if __name__ == "__main__":
    res = []
    for name, rel, scrolls, kw in BEATS:
        r = solve(name, rel, scrolls, **kw)
        res.append(r)
        print(json.dumps(r))
    json.dump(res, open(os.path.join(ROOT, "assets/data/framing.json"), "w"), indent=1)
