"""Capture the TraceLens demo screenshots from the live public site.

Uses Selenium + headless Chrome so a demo session can be set for the analyst
workspace scene, which a plain --screenshot capture cannot do.
"""
from __future__ import annotations

import time
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

BASE = "https://tracelensproject.netlify.app"
SHOTS = Path(__file__).resolve().parent / "shots"
SHOTS.mkdir(parents=True, exist_ok=True)

SCENES = [
    ("01_overview", "/"),
    ("02_data", "/how-it-works"),
    ("03_detection", "/technology"),
    ("04_investigation", "/research"),
    ("05_explainability", "/judge"),
    ("06_experiments", "/demo"),
    ("07_reports", "/about"),
]


def options() -> Options:
    o = Options()
    for arg in (
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--force-device-scale-factor=1",
        "--window-size=1440,900",
    ):
        o.add_argument(arg)
    return o


def snap(driver: webdriver.Chrome, name: str) -> None:
    driver.execute_script("window.scrollTo(0, 0)")
    time.sleep(1)
    out = SHOTS / f"{name}.png"
    driver.save_screenshot(str(out))
    print(f"{name} -> {out} ({out.stat().st_size} bytes)")


def main() -> None:
    driver = webdriver.Chrome(options=options())
    driver.set_page_load_timeout(60)
    try:
        for name, path in SCENES:
            driver.get(BASE + path)
            time.sleep(4)
            snap(driver, name)

        # Analyst workspace: set a demo session on the live origin first.
        driver.get(BASE + "/")
        driver.execute_script("sessionStorage.setItem('tracelens:demo-session','1')")
        driver.get(BASE + "/app/overview")
        time.sleep(6)
        snap(driver, "08_about")
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
