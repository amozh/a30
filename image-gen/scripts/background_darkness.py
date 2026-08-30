"""
Measure how dark a painting's background is, to pick the take that matches the
anchor painting instead of eyeballing it.

Reports mean luminance (0 = black, 255 = white) over the four corner patches,
which are background in every portrait in this series. The rabbit anchor sits at
~9; anything much above ~12 has a visible warm glow and will not hang beside it.

Python rather than bun because Pillow is the pragmatic way to decode a PNG here.

    uv run --with pillow python scripts/background_darkness.py refs/rabbit_center.jpeg output/*.png
"""

import sys

from PIL import Image


def corner_luminance(path: str) -> tuple[float, list[int]]:
    image = Image.open(path).convert("L")
    width, height = image.size
    patch = max(8, int(min(width, height) * 0.08))
    boxes = [
        (0, 0, patch, patch),
        (width - patch, 0, width, patch),
        (0, height - patch, patch, height),
        (width - patch, height - patch, width, height),
    ]
    means = []
    for box in boxes:
        data = list(image.crop(box).getdata())
        means.append(sum(data) / len(data))
    return sum(means) / len(means), [round(m) for m in means]


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    rows = [(corner_luminance(path), path) for path in sys.argv[1:]]
    for (mean, corners), path in sorted(rows):
        name = path.split("/")[-1][:48]
        print(f"{mean:>6.1f}  corners={corners}  {name}")


if __name__ == "__main__":
    main()
