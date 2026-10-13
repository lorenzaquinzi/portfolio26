import os
from playwright.sync_api import sync_playwright

OUT = "/root/portfolio/qa"
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/opt/pw-browsers/chromium/chrome-linux/chrome" if os.path.exists("/opt/pw-browsers/chromium/chrome-linux/chrome") else None)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})

    page.goto("http://localhost:8123/index.html", wait_until="networkidle")
    height = page.evaluate("document.body.scrollHeight")
    y = 0
    while y < height:
        page.evaluate(f"window.scrollTo(0, {y})")
        page.wait_for_timeout(120)
        y += 600
        height = page.evaluate("document.body.scrollHeight")
    page.evaluate("window.scrollTo(0, 0)")
    page.mouse.move(700, 500)
    page.wait_for_timeout(200)
    page.screenshot(path=f"{OUT}/home-light.png", full_page=True)

    # hover the first index item to capture the cursor-preview image panel
    page.hover(".index-item a")
    page.mouse.move(760, 420, steps=8)
    page.wait_for_timeout(500)
    page.screenshot(path=f"{OUT}/home-hover.png", clip={"x": 0, "y": 0, "width": 1440, "height": 900})

    # toggle dark mode (theme toggle is always visible in the nav now)
    page.mouse.move(700, 500)
    page.click("[data-theme-toggle]")
    page.wait_for_timeout(300)
    page.mouse.move(700, 500)
    page.wait_for_timeout(200)
    page.screenshot(path=f"{OUT}/home-dark.png", full_page=True)

    # back to light, mobile viewport
    page.click("[data-theme-toggle]")
    page.wait_for_timeout(200)
    page.mouse.move(700, 500)
    page.wait_for_timeout(200)
    page.set_viewport_size({"width": 390, "height": 844})
    page.wait_for_timeout(200)
    page.screenshot(path=f"{OUT}/home-mobile.png", full_page=True)

    # case study page, desktop (unchanged this round)
    page.set_viewport_size({"width": 1440, "height": 1000})
    page.goto("http://localhost:8123/case-study-circuit.html", wait_until="networkidle")
    page.screenshot(path=f"{OUT}/case-study.png", full_page=True)

    browser.close()

print("done")
