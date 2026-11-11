"""Pixel-art sprites of the AI mentors for the learning companion.

Derived from the project's own mentor art (public/cabinet/<id>.webp):
crop to the figure, downscale to a small grid, reduce the palette and make
alpha binary, so the sprite renders crisp with image-rendering: pixelated.

Run from the repository root:
    python apps/desktop/scripts/gen-pixel-pets.py
"""

from pathlib import Path

from PIL import Image, ImageEnhance

SIZE = 48  # sprite grid, rendered at 3x in the app
COLORS = 18
OUTLINE = (24, 32, 58, 255)
ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "public" / "cabinet"
OUT = ROOT / "apps" / "desktop" / "src" / "renderer" / "pet" / "sprites"


def pixelate(name: str) -> Image.Image:
    img = Image.open(SRC / f"{name}.webp").convert("RGBA")
    box = img.getchannel("A").point(lambda a: 255 if a > 24 else 0).getbbox()
    img = img.crop(box)
    side = max(img.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(img, ((side - img.width) // 2, side - img.height))
    small = square.resize((SIZE - 2, SIZE - 2), Image.Resampling.BOX)
    small = ImageEnhance.Contrast(small).enhance(1.15)
    framed = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    framed.paste(small, (1, 1))
    small = framed
    alpha = small.getchannel("A").point(lambda a: 255 if a > 110 else 0)
    rgb = Image.new("RGB", small.size, (255, 255, 255))
    rgb.paste(small, mask=small.getchannel("A"))
    quant = rgb.quantize(
        colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE
    ).convert("RGB")
    out = quant.convert("RGBA")
    out.putalpha(alpha)
    # One-pixel dark outline around the silhouette.
    px = out.load()
    a = alpha.load()
    for y in range(SIZE):
        for x in range(SIZE):
            if a[x, y]:
                continue
            near = any(
                0 <= x + dx < SIZE and 0 <= y + dy < SIZE and a[x + dx, y + dy]
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
            )
            if near:
                px[x, y] = OUTLINE
    return out


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for mentor in ("volt", "oma", "rezik", "shina"):
        pixelate(mentor).save(OUT / f"{mentor}.png", optimize=True)
        print("ok", mentor)
