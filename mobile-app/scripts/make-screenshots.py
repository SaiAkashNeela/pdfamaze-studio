#!/usr/bin/env python3
"""
Turns raw simulator screenshots into store screenshots: the screen on a paper-coloured canvas
with a short caption, in the sizes both stores accept.

    python3 scripts/make-screenshots.py <raw-dir>

<raw-dir> holds PNGs named like the SHOTS keys below (e.g. 01-home.png). Outputs:
  store/screenshots/play/*.png                1080 x 1920  (Google Play phone, 9:16)
  store/screenshots/appstore-6.3/*.png        1206 x 2622  (App Store "iPhone with Dynamic Island, medium display")
  store/screenshots/appstore-6.9/*.png        1320 x 2868  (App Store "iPhone with Dynamic Island, large display")
  store/screenshots/appstore-header.png       3840 x 1646  (App Store product page header)
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, "node_modules", "@expo-google-fonts")
OUT = os.path.join(ROOT, "store", "screenshots")

PAPER = (250, 247, 243)
GRID = (240, 236, 230)
INK = (41, 35, 29)
ACCENT = (200, 74, 39)
DARK_BG = (19, 17, 14)
DARK_GRID = (30, 27, 23)
DARK_INK = (234, 232, 227)
DARK_ACCENT = (225, 109, 67)

# file stem -> (eyebrow, caption, dark background?)
SHOTS = {
    "01-home": ("35 PDF TOOLS", "Every PDF job,\nin plain words", False),
    "02-onboarding": ("PRIVATE BY DESIGN", "Your files never\nleave your phone", False),
    "03-sign": ("SIGN & FILL", "Sign with your\nfinger, anywhere", False),
    "04-merge": ("ONE, TWO, THREE", "Choose a file,\nchoose how, done", False),
    "05-stats": ("ONLY ON THIS PHONE", "Your stats stay\nwith you", False),
    "06-dark": ("LIGHT OR DARK", "Easy on the eyes,\nday or night", True),
}


def font(weight, size, family="ibm-plex-sans", prefix="IBMPlexSans"):
    return ImageFont.truetype(os.path.join(FONTS, family, weight, f"{prefix}_{weight}.ttf"), size)


def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def compose(raw_path, eyebrow, caption, dark, size, out_path):
    w, h = size
    s = w / 1080  # everything below is designed at 1080 wide
    bg, grid, ink, accent = (DARK_BG, DARK_GRID, DARK_INK, DARK_ACCENT) if dark else (PAPER, GRID, INK, ACCENT)
    canvas = Image.new("RGB", size, bg)
    draw = ImageDraw.Draw(canvas)
    step = int(36 * s)
    for x in range(0, w, step):
        draw.line([(x, 0), (x, h)], fill=grid)
    for y in range(0, h, step):
        draw.line([(0, y), (w, y)], fill=grid)

    # Caption block.
    top = int(110 * s)
    draw.text((w / 2, top), eyebrow, font=font("500Medium", int(30 * s), "ibm-plex-mono", "IBMPlexMono"), fill=accent, anchor="ma")
    draw.multiline_text(
        (w / 2, top + int(62 * s)), caption, font=font("600SemiBold", int(76 * s)), fill=ink, anchor="ma", align="center", spacing=int(10 * s)
    )

    # Phone screen: scaled to the space below the caption, rounded, with a soft shadow and hairline.
    shot = Image.open(raw_path).convert("RGB")
    area_top = top + int(320 * s)
    max_h = h - area_top - int(80 * s)
    max_w = int(w * 0.78)
    scale = min(max_w / shot.width, max_h / shot.height)
    shot = shot.resize((int(shot.width * scale), int(shot.height * scale)), Image.LANCZOS)
    radius = int(64 * s)
    screen = rounded(shot.convert("RGBA"), radius)
    x = (w - shot.width) // 2
    y = area_top

    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [x, y + int(18 * s), x + shot.width, y + shot.height + int(18 * s)], radius=radius, fill=(0, 0, 0, 90 if dark else 45)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(int(28 * s)))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow)
    canvas.alpha_composite(screen, (x, y))
    ImageDraw.Draw(canvas).rounded_rectangle(
        [x, y, x + shot.width - 1, y + shot.height - 1], radius=radius, outline=(75, 71, 66) if dark else (220, 217, 211), width=max(2, int(3 * s))
    )
    canvas.convert("RGB").save(out_path, optimize=True)


def header(raw_dir, out_path, size=(3840, 1646)):
    """Wide product-page banner: wordmark and promise on the left, three screens fanned on the right."""
    w, h = size
    canvas = Image.new("RGB", size, PAPER)
    draw = ImageDraw.Draw(canvas)
    for x in range(0, w, 48):
        draw.line([(x, 0), (x, h)], fill=GRID)
    for y in range(0, h, 48):
        draw.line([(0, y), (w, y)], fill=GRID)

    left = 260
    bold, regular = font("600SemiBold", 230), font("400Regular", 230)
    draw.text((left, 420), "PDF", font=bold, fill=INK)
    draw.text((left + draw.textlength("PDF", font=bold), 420), "amaze", font=regular, fill=(105, 100, 93))
    draw.text((left, 760), "Private PDF tools", font=font("600SemiBold", 120), fill=INK)
    draw.text((left, 900), "for your phone", font=font("600SemiBold", 120), fill=INK)
    draw.text((left, 1110), "NO ACCOUNT · NO UPLOADS · WORKS OFFLINE", font=font("500Medium", 58, "ibm-plex-mono", "IBMPlexMono"), fill=ACCENT)

    canvas = canvas.convert("RGBA")
    screens = ["03-sign", "01-home", "05-stats"]
    phone_h = 1380
    centers = [2280, 2830, 3380]
    # Draw the outer phones first so the middle one sits in front.
    for i in (0, 2, 1):
        stem = screens[i]
        shot = Image.open(os.path.join(raw_dir, f"{stem}.png")).convert("RGB")
        scale = phone_h / shot.height
        shot = shot.resize((int(shot.width * scale), phone_h), Image.LANCZOS)
        screen = rounded(shot.convert("RGBA"), 70)
        x = centers[i] - shot.width // 2
        y = (h - phone_h) // 2 + (0 if i == 1 else 70)
        shadow = Image.new("RGBA", size, (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle([x, y + 24, x + shot.width, y + phone_h + 24], radius=70, fill=(0, 0, 0, 50))
        canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(36)))
        canvas.alpha_composite(screen, (x, y))
        ImageDraw.Draw(canvas).rounded_rectangle([x, y, x + shot.width - 1, y + phone_h - 1], radius=70, outline=(220, 217, 211), width=4)
    canvas.convert("RGB").save(out_path, optimize=True)


def main():
    raw_dir = sys.argv[1]
    targets = {"play": (1080, 1920), "appstore-6.3": (1206, 2622), "appstore-6.9": (1320, 2868)}
    for name in targets:
        os.makedirs(os.path.join(OUT, name), exist_ok=True)
    for stem, (eyebrow, caption, dark) in SHOTS.items():
        raw = os.path.join(raw_dir, f"{stem}.png")
        if not os.path.exists(raw):
            print(f"skip {stem} (no raw screenshot)")
            continue
        for name, size in targets.items():
            compose(raw, eyebrow, caption, dark, size, os.path.join(OUT, name, f"{stem}.png"))
        print(f"made {stem}")
    if all(os.path.exists(os.path.join(raw_dir, f"{s}.png")) for s in ("01-home", "03-sign", "05-stats")):
        header(raw_dir, os.path.join(OUT, "appstore-header.png"))
        print("made appstore-header")


if __name__ == "__main__":
    main()
