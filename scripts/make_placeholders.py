#!/usr/bin/env python3
"""Generates placeholder SVG images for the portfolio.
Run: python3 scripts/make_placeholders.py
Delete this whole /scripts folder once real images are in place.
"""
import os
from xml.sax.saxutils import escape

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(OUT, exist_ok=True)

LILAC = "#0A0A0A"
CREAM = "#F1F1EE"
INK = "#0A0A0A"

def svg(w, h, label, sublabel, bg=CREAM, fg=INK, accent=LILAC):
    stripe = f"""
    <defs>
      <pattern id="stripes" width="28" height="28" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <rect width="28" height="28" fill="{bg}"/>
        <rect width="14" height="28" fill="{bg}"/>
        <line x1="0" y1="0" x2="0" y2="28" stroke="{accent}" stroke-width="1" opacity="0.18"/>
      </pattern>
    </defs>
    """
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
  {stripe}
  <rect width="{w}" height="{h}" fill="url(#stripes)"/>
  <rect width="{w}" height="{h}" fill="none" stroke="{fg}" stroke-opacity="0.12" stroke-width="2"/>
  <circle cx="{w-48}" cy="48" r="5" fill="{accent}"/>
  <text x="40" y="{h-64}" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="{fg}" letter-spacing="0.5">{escape(label)}</text>
  <text x="40" y="{h-36}" font-family="Arial, sans-serif" font-size="14" fill="{fg}" opacity="0.6">{escape(sublabel)}</text>
</svg>"""

CASES = [
    ("case-01", "Circuit — cover image", "Replace with a 1600×1000 export from Figma"),
    ("case-02", "Lemon Energia — cover image", "Replace with a 1600×1000 export from Figma"),
    ("case-03", "Work & Co — cover image", "Replace with a 1600×1000 export from Figma"),
    ("case-04", "Nubank — cover image", "Replace with a 1600×1000 export from Figma"),
]
for name, label, sub in CASES:
    with open(os.path.join(OUT, f"{name}.svg"), "w") as f:
        f.write(svg(1600, 1000, label, sub))

PROJECTS = [
    ("proj-01", "Fjord — snippet", "Replace with a 900×900 export"),
    ("proj-02", "Project 02 — snippet", "Replace with a 900×900 export"),
    ("proj-03", "Side project — snippet", "Replace with a 900×900 export"),
    ("proj-04", "Exploration — snippet", "Replace with a 900×900 export"),
    ("proj-05", "Exploration — snippet", "Replace with a 900×900 export"),
    ("proj-06", "Exploration — snippet", "Replace with a 900×900 export"),
]
for name, label, sub in PROJECTS:
    with open(os.path.join(OUT, f"{name}.svg"), "w") as f:
        f.write(svg(900, 900, label, sub))

with open(os.path.join(OUT, "portrait.svg"), "w") as f:
    f.write(svg(900, 1100, "Portrait", "Replace with a real photo, 900×1100"))

with open(os.path.join(OUT, "og-image.svg"), "w") as f:
    f.write(svg(1200, 630, "Social preview image", "Export a PNG version, 1200×630, for real social sharing"))

print("Wrote", len(CASES) + len(PROJECTS) + 2, "placeholder SVGs to", OUT)
