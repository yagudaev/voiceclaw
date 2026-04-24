#!/usr/bin/env python3
# Generates a macOS-correct icon from a square source PNG.
#
# Apple's macOS icon template (Big Sur+) is NOT a full-bleed square:
#   - 1024x1024 canvas
#   - 824x824 artwork centered (100px transparent margin on each side)
#   - Artwork clipped to a superellipse ("squircle"), not a circular arc
#
# Shipping the raw square (as icon-1024x1024.png does for iOS) makes the
# .app look like a tile-inside-a-tile because macOS draws its own shadow
# around the full opaque rectangle. This script bakes in the squircle
# with transparent corners so the OS shadow + hover + dock highlight all
# hug the intended shape.

import sys
from pathlib import Path
from PIL import Image, ImageDraw

# Apple's squircle is closer to a superellipse with n≈5; larger n = flatter
# sides, sharper corners. 5.0 matches Sketch/Figma's "Apple squircle" preset.
SQUIRCLE_N = 5.0

# Inner artwork bounds within 1024 canvas. 824 matches Apple's macOS icon
# template; tweak MARGIN to change breathing room.
CANVAS = 1024
MARGIN = 100
INNER = CANVAS - 2 * MARGIN  # 824


def make_squircle_mask(size: int, n: float) -> Image.Image:
    """8-bit alpha mask of a centered superellipse filling `size` x `size`."""
    # Render at 4x then downsample for anti-aliasing — PIL has no native AA
    # for polygon fills, and a raw per-pixel rasterization at 1x shows stair
    # stepping at 512/1024 scale.
    scale = 4
    big = size * scale
    mask = Image.new("L", (big, big), 0)
    draw = ImageDraw.Draw(mask)
    # Walk the superellipse perimeter and fill it as a polygon.
    a = big / 2.0
    steps = 720
    pts = []
    import math
    for i in range(steps):
        t = (i / steps) * 2.0 * math.pi
        # Parametric superellipse:
        ct = math.cos(t)
        st = math.sin(t)
        x = a + math.copysign(abs(ct) ** (2.0 / n), ct) * a
        y = a + math.copysign(abs(st) ** (2.0 / n), st) * a
        pts.append((x, y))
    draw.polygon(pts, fill=255)
    return mask.resize((size, size), Image.LANCZOS)


def crop_inner_tile(source: Image.Image) -> Image.Image:
    """Crop the carbon tile out of the iOS master (which has a grid-paper
    outer background meant to be masked away by the iOS squircle).

    Scans for the inner-tile color (#211b16) to find its bounds rather than
    hardcoding, so a re-exported source with slightly different dimensions
    still works.
    """
    rgb = source.convert("RGB")
    px = rgb.load()
    w, h = rgb.size
    # Probe a known-tile-background pixel at ~30% in from top-left. The iOS
    # master places the inner tile ~20% inset, so 30% is safely inside it
    # and avoids the cream Mark in the center.
    tile = px[int(w * 0.3), int(h * 0.3)]

    def is_tile(p, tol=4):
        return all(abs(p[i] - tile[i]) <= tol for i in range(3))

    y_probe = int(h * 0.3)
    left = next(x for x in range(w) if is_tile(px[x, y_probe]))
    right = next(x for x in range(w - 1, -1, -1) if is_tile(px[x, y_probe]))
    x_probe = int(w * 0.3)
    top = next(y for y in range(h) if is_tile(px[x_probe, y]))
    bot = next(y for y in range(h - 1, -1, -1) if is_tile(px[x_probe, y]))
    return source.crop((left, top, right + 1, bot + 1))


def build_master(src: Path, out: Path) -> None:
    source = Image.open(src).convert("RGBA")
    tile = crop_inner_tile(source)
    inner = tile.resize((INNER, INNER), Image.LANCZOS)
    mask = make_squircle_mask(INNER, SQUIRCLE_N)
    # Punch the squircle mask into the artwork's alpha.
    r, g, b, a = inner.split()
    clipped_alpha = Image.eval(Image.new("L", inner.size, 0), lambda _: 0)
    clipped_alpha.paste(mask, (0, 0))
    inner.putalpha(clipped_alpha)

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.paste(inner, (MARGIN, MARGIN), inner)
    canvas.save(out, "PNG")


def build_iconset(master: Path, iconset: Path) -> None:
    """Emit the 10 PNGs iconutil needs inside a .iconset directory."""
    sizes = [
        (16, "icon_16x16.png"),
        (32, "icon_16x16@2x.png"),
        (32, "icon_32x32.png"),
        (64, "icon_32x32@2x.png"),
        (128, "icon_128x128.png"),
        (256, "icon_128x128@2x.png"),
        (256, "icon_256x256.png"),
        (512, "icon_256x256@2x.png"),
        (512, "icon_512x512.png"),
        (1024, "icon_512x512@2x.png"),
    ]
    iconset.mkdir(parents=True, exist_ok=True)
    big = Image.open(master).convert("RGBA")
    for size, name in sizes:
        resized = big.resize((size, size), Image.LANCZOS)
        resized.save(iconset / name, "PNG")


if __name__ == "__main__":
    src = Path(sys.argv[1]).resolve()
    master_out = Path(sys.argv[2]).resolve()
    iconset_out = Path(sys.argv[3]).resolve()
    build_master(src, master_out)
    build_iconset(master_out, iconset_out)
    print(f"wrote {master_out} and populated {iconset_out}")
