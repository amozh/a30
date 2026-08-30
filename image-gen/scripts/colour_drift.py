"""Measure colour drift of a candidate against a reference take.

Usage: uv run --with pillow --with numpy python scripts/colour_drift.py REF CANDIDATE [...]

Prints per-image mean R/G/B, mean saturation, mean luminance and the deltas from REF.
Stats are taken on midtones only. Rule of thumb from the A20 runs: a warm shift shows
as ΔR−ΔB > +3 or Δsat > +5 (№32 vs №31 was visibly warm; c10 vs c04 badly so);
anything past that is visible on the wall next to the reference. Fix by histogram-
matching to the reference (scripts/colour_match.py), not by regenerating.

This is a coarse filter: it caught c10 (+9 sat) but scored №32 as "ok" although the
breeches had visibly gone orange — hue shifts inside one channel band hide from channel
means. It does not replace looking at the take beside its reference.
"""
import sys
import numpy as np
from PIL import Image


def stats(path: str):
    im = Image.open(path).convert('RGB')
    im.thumbnail((768, 768))
    a = np.asarray(im).astype(np.float32)
    hsv = np.asarray(im.convert('HSV')).astype(np.float32)
    # Midtones only: the near-black background dominates a plain mean and hides the
    # warm cast that sits on the figure, the cloth and the props.
    mid = (hsv[..., 2] > 50) & (hsv[..., 2] < 225)
    a, hsv = a[mid], hsv[mid]
    r, g, b = a[:, 0].mean(), a[:, 1].mean(), a[:, 2].mean()
    return r, g, b, hsv[:, 1].mean(), hsv[:, 2].mean()


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    ref = stats(sys.argv[1])
    print(f'{"image":48} {"R":>6} {"G":>6} {"B":>6} {"sat":>6} {"lum":>6}   dR-dB  dSat  verdict')
    print(f'{sys.argv[1][-48:]:48} {ref[0]:6.1f} {ref[1]:6.1f} {ref[2]:6.1f} {ref[3]:6.1f} {ref[4]:6.1f}   (reference)')
    for p in sys.argv[2:]:
        s = stats(p)
        warm = (s[0] - ref[0]) - (s[2] - ref[2])
        dsat = s[3] - ref[3]
        verdict = 'DRIFT — histogram-match' if warm > 3 or abs(dsat) > 5 else 'ok'
        print(f'{p[-48:]:48} {s[0]:6.1f} {s[1]:6.1f} {s[2]:6.1f} {s[3]:6.1f} {s[4]:6.1f}   {warm:+5.1f} {dsat:+5.1f}  {verdict}')


if __name__ == '__main__':
    main()
