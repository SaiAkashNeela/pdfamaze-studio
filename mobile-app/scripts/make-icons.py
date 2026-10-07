#!/usr/bin/env python3
"""
Generates every app icon and store image from the PDFamaze logo mark.

    python3 scripts/make-icons.py

Needs rsvg-convert (brew install librsvg) and Pillow. Fonts come from the app's own
@expo-google-fonts packages, so the store graphics use IBM Plex like the app.

Outputs
  assets/images/icon.png                  1024 opaque  - App Store / iOS (no alpha, as Apple requires)
  assets/images/icon-dark.png             1024 alpha   - iOS 18+ dark appearance
  assets/images/icon-tinted.png           1024 alpha   - iOS 18+ tinted appearance (greyscale)
  assets/images/android-icon-*.png        1024         - Android adaptive icon layers + themed (monochrome)
  assets/images/notification-icon.png       96 alpha   - Android status-bar icon (white silhouette)
  assets/images/splash-icon.png            400 alpha   - splash screen
  assets/images/favicon.png                 48
  store/app-store-icon-1024.png           1024 opaque  - App Store Connect upload
  store/play-store-icon-512.png            512 opaque  - Google Play listing icon
  store/play-feature-graphic-1024x500.png               - Google Play feature graphic
"""
import os
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = os.path.join(ROOT, "assets", "images")
STORE = os.path.join(ROOT, "store")
FONTS = os.path.join(ROOT, "node_modules", "@expo-google-fonts")

PAPER = "#faf7f3"
INK = "#29231d"
ACCENT = "#c84a27"
DARK_BG = "#13110e"
DARK_INK = "#eae8e3"
DARK_ACCENT = "#e16d43"
MUTED = "#69645d"


def mark_svg(ink, accent, bg=None, scale=0.62, faded=0.5):
    """The logo on a 24-unit grid, sized so the mark spans `scale` of the canvas."""
    size = 24 / scale
    off = (size - 24) / 2
    rect = f'<rect x="{-off}" y="{-off}" width="{size}" height="{size}" fill="{bg}"/>' if bg else ""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-off} {-off} {size} {size}" fill="none" stroke-linecap="square">{rect}
<path d="M4.5 2.5h9.2L19.5 8v13.5h-15z" stroke="{ink}" stroke-width="1.6" stroke-linejoin="miter"/>
<path d="M13.4 2.8V8h5.4" stroke="{ink}" stroke-width="1.6"/>
<path d="M7.6 12.4h8.8" stroke="{ink}" stroke-width="1.6" opacity="{faded}"/>
<path d="M7.6 15.5h8.8" stroke="{accent}" stroke-width="1.6"/>
<path d="M7.6 18.6h5.2" stroke="{ink}" stroke-width="1.6" opacity="{faded}"/></svg>"""


def render(svg, px, out, opaque=False):
    with tempfile.NamedTemporaryFile("w", suffix=".svg", delete=False) as f:
        f.write(svg)
        path = f.name
    subprocess.run(["rsvg-convert", "-w", str(px), "-h", str(px), path, "-o", out], check=True)
    os.unlink(path)
    if opaque:
        Image.open(out).convert("RGB").save(out)


def font(weight, size, family="ibm-plex-sans", prefix="IBMPlexSans"):
    return ImageFont.truetype(os.path.join(FONTS, family, weight, f"{prefix}_{weight}.ttf"), size)


def feature_graphic(out):
    w, h = 1024, 500
    img = Image.new("RGB", (w, h), PAPER)
    draw = ImageDraw.Draw(img)
    # Faint ruled grid, like the web hero.
    for x in range(0, w, 32):
        draw.line([(x, 0), (x, h)], fill="#f0ece6")
    for y in range(0, h, 32):
        draw.line([(0, y), (w, y)], fill="#f0ece6")

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        mark_path = f.name
    render(mark_svg(INK, ACCENT, scale=0.92), 300, mark_path)
    mark = Image.open(mark_path).convert("RGBA")
    img.paste(mark, (70, 100), mark)
    os.unlink(mark_path)

    x = 410
    bold, regular = font("600SemiBold", 84), font("400Regular", 84)
    draw.text((x, 110), "PDF", font=bold, fill=INK)
    draw.text((x + draw.textlength("PDF", font=bold), 110), "amaze", font=regular, fill=MUTED)
    draw.text((x, 225), "Private PDF tools", font=font("600SemiBold", 40), fill=INK)
    draw.text((x, 275), "for your phone", font=font("600SemiBold", 40), fill=INK)
    mono = font("500Medium", 22, "ibm-plex-mono", "IBMPlexMono")
    draw.text((x, 352), "NO ACCOUNT · NO UPLOADS · WORKS OFFLINE", font=mono, fill=ACCENT)
    img.save(out)


def main():
    os.makedirs(STORE, exist_ok=True)
    p = lambda name: os.path.join(IMAGES, name)

    # iOS / general icon: opaque, no alpha channel (App Store requirement).
    render(mark_svg(INK, ACCENT, PAPER), 1024, p("icon.png"), opaque=True)
    # iOS 18+ appearances: the system draws its own background behind these.
    render(mark_svg(DARK_INK, DARK_ACCENT), 1024, p("icon-dark.png"))
    render(mark_svg("#ffffff", "#ffffff", faded=0.55), 1024, p("icon-tinted.png"))

    # Android adaptive icon: the mark sits inside the 66% safe zone of the foreground layer.
    render(mark_svg(INK, ACCENT, scale=0.5), 1024, p("android-icon-foreground.png"))
    Image.new("RGB", (1024, 1024), PAPER).save(p("android-icon-background.png"))
    render(mark_svg("#000000", "#000000", scale=0.5, faded=0.55), 1024, p("android-icon-monochrome.png"))

    # Android notification icon: a plain white silhouette on transparent.
    render(mark_svg("#ffffff", "#ffffff", scale=0.8, faded=1), 96, p("notification-icon.png"))

    render(mark_svg(ACCENT, ACCENT, scale=0.9), 400, p("splash-icon.png"))
    render(mark_svg(INK, ACCENT, PAPER), 48, p("favicon.png"), opaque=True)

    # Store listings.
    render(mark_svg(INK, ACCENT, PAPER), 1024, os.path.join(STORE, "app-store-icon-1024.png"), opaque=True)
    render(mark_svg(INK, ACCENT, PAPER), 512, os.path.join(STORE, "play-store-icon-512.png"), opaque=True)
    feature_graphic(os.path.join(STORE, "play-feature-graphic-1024x500.png"))
    print("Icons written to assets/images and store/")


if __name__ == "__main__":
    main()
