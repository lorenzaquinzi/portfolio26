#!/usr/bin/env python3
"""Generates the remaining case-study pages from case-study-circuit.html as the base
template. Run once after editing the base template; safe to delete afterwards.
"""
import os

ROOT = os.path.join(os.path.dirname(__file__), "..")
BASE = os.path.join(ROOT, "case-study-circuit.html")

with open(BASE, "r", encoding="utf-8") as f:
    base = f.read()

PROJECTS = [
    {
        "file": "case-study-lemon-energia.html",
        "page_title": "Lemon Energia — Case Study — Lorenza Quinzi",
        "meta_desc": "[Placeholder] Case study: redesigning energy billing at Lemon Energia.",
        "eyebrow": "Lemon Energia · 2021–2023 · Product Designer",
        "title": "Redesigning energy billing for millions of customers",
        "outcome": "[Placeholder] Simplified how customers understand and manage their solar "
                   "energy credits, raising self-service resolution by <strong>X%</strong> and "
                   "reducing billing-related churn.",
        "cover": "case-02.svg",
        "cover_alt": "Placeholder hero image for the Lemon Energia case study — replace with your real project screenshot.",
        "next_href": "case-study-work-co.html",
        "next_title": "Work &amp; Co — shaping product strategy for a global client",
    },
    {
        "file": "case-study-work-co.html",
        "page_title": "Work &amp; Co — Case Study — Lorenza Quinzi",
        "meta_desc": "[Placeholder] Case study: shaping product strategy at Work & Co.",
        "eyebrow": "Work &amp; Co · 2020–2021 · Product Designer",
        "title": "Shaping product strategy for a global client",
        "outcome": "[Placeholder] Led product design for a Fortune 500 client engagement, "
                   "from discovery through a shipped MVP, working inside a cross-functional "
                   "agency team.",
        "cover": "case-03.svg",
        "cover_alt": "Placeholder hero image for the Work &amp; Co case study — replace with your real project screenshot.",
        "next_href": "case-study-nubank.html",
        "next_title": "Nubank — scaling a design system across product teams",
    },
    {
        "file": "case-study-nubank.html",
        "page_title": "Nubank — Case Study — Lorenza Quinzi",
        "meta_desc": "[Placeholder] Case study: scaling a design system at Nubank.",
        "eyebrow": "Nubank · 2018–2020 · Product Designer",
        "title": "Scaling a design system across product teams",
        "outcome": "[Placeholder] Built and rolled out shared components and patterns "
                   "across multiple product teams, cutting design-to-dev handoff time by "
                   "<strong>X%</strong>.",
        "cover": "case-04.svg",
        "cover_alt": "Placeholder hero image for the Nubank case study — replace with your real project screenshot.",
        "next_href": "case-study-circuit.html",
        "next_title": "Circuit — cutting checkout friction",
    },
]

for p in PROJECTS:
    out = base
    out = out.replace("Circuit — Case Study — Lorenza Quinzi", p["page_title"])
    out = out.replace(
        '[Placeholder] Case study: cutting checkout friction at Circuit.',
        p["meta_desc"],
    )
    out = out.replace(
        "Circuit · 2023–2024 · Product Designer",
        p["eyebrow"],
    )
    out = out.replace(
        "Cutting checkout friction at Circuit",
        p["title"],
    )
    out = out.replace(
        "[Placeholder] Redesigned the core purchase flow end to end, reducing drop-off\n"
        "        by <strong>X%</strong> and cutting checkout-related support tickets by\n"
        "        <strong>X%</strong> within two quarters of launch.",
        p["outcome"],
    )
    out = out.replace('src="assets/case-01.svg"', f'src="assets/{p["cover"]}"')
    out = out.replace(
        'alt="Placeholder hero image for the Circuit case study — replace with your real project screenshot."',
        f'alt="{p["cover_alt"]}"',
    )
    out = out.replace('href="case-study-lemon-energia.html"', f'href="{p["next_href"]}"')
    out = out.replace(
        "Lemon Energia — redesigning energy billing",
        p["next_title"],
    )

    with open(os.path.join(ROOT, p["file"]), "w", encoding="utf-8") as f:
        f.write(out)

print("Generated:", ", ".join(p["file"] for p in PROJECTS))
