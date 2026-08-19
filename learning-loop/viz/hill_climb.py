"""Rendering: the hill-climb curve and the demo bar charts.

Stdlib-only, matching the aibvf ethos: an ASCII chart to the terminal plus a
hand-written SVG to artifacts/, in the Craig Horton Advisory palette. No
matplotlib dependency required.
"""
from __future__ import annotations
from pathlib import Path

from config import ARTIFACTS_DIR, NAVY, BURNT_ORANGE


def _ascii_line(values: list[float], width: int = 50, height: int = 12) -> str:
    lo, hi = min(values), max(values)
    span = (hi - lo) or 1.0
    rows = [[" "] * len(values) for _ in range(height)]
    for x, v in enumerate(values):
        y = int(round((v - lo) / span * (height - 1)))
        rows[height - 1 - y][x] = "*"
    out = []
    for i, row in enumerate(rows):
        val = hi - (hi - lo) * i / (height - 1)
        out.append(f"{val:6.3f} |" + "".join(row))
    out.append("       +" + "-" * len(values))
    out.append("        " + "".join(str(i % 10) for i in range(len(values))))
    return "\n".join(out)


def render_hill_climb(curve: list[float], mode: str, model: str) -> Path:
    print("\nHill-climb: private-eval reward vs loop iteration")
    print(f"(mode={mode}, base model={model})\n")
    print(_ascii_line(curve))

    n = len(curve)
    w, h, pad = 640, 360, 50
    lo, hi = min(curve), max(curve)
    span = (hi - lo) or 1.0

    def px(i): return pad + i * (w - 2 * pad) / max(1, n - 1)
    def py(v): return h - pad - (v - lo) / span * (h - 2 * pad)

    pts = " ".join(f"{px(i):.1f},{py(v):.1f}" for i, v in enumerate(curve))
    dots = "".join(
        f'<circle cx="{px(i):.1f}" cy="{py(v):.1f}" r="4" fill="{BURNT_ORANGE}"/>'
        for i, v in enumerate(curve)
    )
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" font-family="Tahoma,sans-serif">
<rect width="{w}" height="{h}" fill="white"/>
<text x="{pad}" y="28" font-size="18" fill="{NAVY}">The hill-climbing machine</text>
<text x="{pad}" y="46" font-size="12" fill="{NAVY}">Private-eval reward vs loop iteration ({mode}, {model})</text>
<line x1="{pad}" y1="{h-pad}" x2="{w-pad}" y2="{h-pad}" stroke="{NAVY}" stroke-width="1"/>
<line x1="{pad}" y1="{pad}" x2="{pad}" y2="{h-pad}" stroke="{NAVY}" stroke-width="1"/>
<polyline points="{pts}" fill="none" stroke="{NAVY}" stroke-width="2.5"/>
{dots}
<text x="{px(0):.1f}" y="{h-pad+18:.1f}" font-size="11" fill="{NAVY}">cold</text>
<text x="{px(n-1):.1f}" y="{h-pad+18:.1f}" font-size="11" fill="{NAVY}">iter {n-1}</text>
</svg>"""
    path = Path(ARTIFACTS_DIR) / "hill_climb.svg"
    path.write_text(svg)
    print(f"\nSVG: {path}")
    return path


def render_bars(title: str, labels: list[str], cold: list[float], lifted: list[float], filename: str) -> Path:
    print(f"\n{title}")
    for lab, c, l in zip(labels, cold, lifted):
        print(f"  {lab:>16}  cold {c:.3f}  ->  lifted {l:.3f}   ({l - c:+.3f})")

    w, h, pad = 680, 380, 60
    n = len(labels)
    all_vals = cold + lifted
    hi = max(all_vals) or 1.0
    group_w = (w - 2 * pad) / n
    bar_w = group_w / 3

    def by(v): return h - pad - v / hi * (h - 2 * pad)

    bars = []
    for i, (lab, c, l) in enumerate(zip(labels, cold, lifted)):
        x0 = pad + i * group_w + bar_w * 0.25
        x1 = x0 + bar_w
        bars.append(f'<rect x="{x0:.1f}" y="{by(c):.1f}" width="{bar_w:.1f}" height="{h-pad-by(c):.1f}" fill="{NAVY}"/>')
        bars.append(f'<rect x="{x1:.1f}" y="{by(l):.1f}" width="{bar_w:.1f}" height="{h-pad-by(l):.1f}" fill="{BURNT_ORANGE}"/>')
        bars.append(f'<text x="{pad + i*group_w + group_w/2:.1f}" y="{h-pad+18:.1f}" font-size="11" fill="{NAVY}" text-anchor="middle">{lab}</text>')
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" font-family="Tahoma,sans-serif">
<rect width="{w}" height="{h}" fill="white"/>
<text x="{pad}" y="30" font-size="17" fill="{NAVY}">{title}</text>
<text x="{pad}" y="50" font-size="12" fill="{NAVY}">navy = cold base model, orange = base model + Veteran Capital artifact</text>
<line x1="{pad}" y1="{h-pad}" x2="{w-pad}" y2="{h-pad}" stroke="{NAVY}" stroke-width="1"/>
{''.join(bars)}
</svg>"""
    path = Path(ARTIFACTS_DIR) / filename
    path.write_text(svg)
    print(f"  SVG: {path}")
    return path
