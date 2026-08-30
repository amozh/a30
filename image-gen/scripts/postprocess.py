"""A20 panel post-processing — the approved "natural painting" pass (c06/c08/c13 line).

Usage: uv run --with pillow --with numpy python scripts/postprocess.py IN OUT
Steps: desaturate 20%, contrast x0.92, lift blacks, compress highlights,
35% soft-blur blend, fine grain (sigma 4.5), blue x0.97.
"""
import sys
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

img = Image.open(sys.argv[1]).convert('RGB')
img = ImageEnhance.Color(img).enhance(0.80)
img = ImageEnhance.Contrast(img).enhance(0.92)
a = np.asarray(img).astype(np.float32) / 255.0
a = 0.04 + a * 0.94                                   # lift blacks
hi = a > 0.85
a[hi] = 0.85 + (a[hi] - 0.85) * 0.6                   # compress highlights
soft = np.asarray(Image.fromarray((a*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))).astype(np.float32)/255.0
a = a * 0.65 + soft * 0.35                            # painterly softening
rng = np.random.default_rng(20)
a += rng.normal(0, 4.5/255.0, a.shape).astype(np.float32)   # fine grain
a[..., 2] *= 0.97                                     # cool the blue a touch
a = np.clip(a, 0, 1)
Image.fromarray((a*255).astype(np.uint8)).save(sys.argv[2])
print(sys.argv[2])
