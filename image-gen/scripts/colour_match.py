"""Histogram-match CANDIDATE to REF and write OUT. Content stays, colour drift goes.

Usage: uv run --with pillow --with numpy --with scikit-image python scripts/colour_match.py REF CANDIDATE OUT
"""
import sys
import numpy as np
from PIL import Image
from skimage.exposure import match_histograms

ref, cand, out = sys.argv[1:4]
r = np.asarray(Image.open(ref).convert('RGB'))
c = np.asarray(Image.open(cand).convert('RGB'))
m = match_histograms(c, r, channel_axis=-1)
Image.fromarray(np.clip(m, 0, 255).astype(np.uint8)).save(out)
print(out)
