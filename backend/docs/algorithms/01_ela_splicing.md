# Algorithm: Error Level Analysis (ELA) & Splicing Detection

## Overview

Error Level Analysis (ELA) is a visual forensic technique designed to detect digital image splicing, patches, and insertions. When a lossy JPEG image is edited and resaved, modified or spliced regions exhibit a different error/compression profile compared to the surrounding untouched areas.

## Academic References

- **Krawetz, N. (2007)** — "A Picture's Worth... Digital Image Analysis", Hacker Factor Solutions. _Pioneering work introducing Error Level Analysis._
- **Farid, H. (2009)** — "Exposing Digital Forgeries from JPEG Ghosts", IEEE Transactions on Information Forensics and Security.
- **Rocha, A. et al. (2011)** — "Vision of an Unseen World: Digital Image Forensics", IEEE Signal Processing Magazine.

## Algorithm Steps

### 1. In-Memory Re-Compression
The source image $I_{orig}$ is re-compressed in memory at a fixed JPEG quality (default: $Q = 90$):
$$I_{resaved} = \text{JPEG}_{encode/decode}(I_{orig}, Q=90)$$

### 2. Difference Amplification
The absolute pixel-by-pixel difference between the original and recompressed image is computed and amplified:
$$\Delta = |I_{orig} - I_{resaved}| \times M$$
where $M = 20.0$ is the amplification multiplier.

### 3. Statistical Dynamic Thresholding
Rather than using an arbitrary hardcoded threshold, Veridoc calculates dynamic thresholding across the image's difference distribution:
$$\mu_{\Delta} = \text{mean}(\Delta_{gray}), \quad \sigma_{\Delta} = \text{std}(\Delta_{gray})$$
$$T_{dynamic} = \text{clamp}(\mu_{\Delta} + 2.5 \cdot \sigma_{\Delta}, 30.0, 140.0)$$

Pixels exceeding $T_{dynamic}$ have significantly higher compression error rates than the global image baseline, indicating foreign spliced inserts or multiple compression cycles.

### 4. Morphological Cleanup & Bounding Box Generation
1. Binary threshold mask: $B = (\Delta_{gray} > T_{dynamic})$.
2. Morphological closing with a $5\times 5$ rectangular kernel to bridge discontinuous edge contours.
3. Contour extraction (`cv2.findContours`).
4. Any connected contour occupying $> 0.15\%$ of total page area is flagged as an ELA Splicing Anomaly with a normalized bounding box.

### 5. Alpha-Glow Heatmap Generation
A perceptual false-color heatmap is generated via `cv2.applyColorMap(..., cv2.COLORMAP_HOT)` with an alpha transparency mask, enabling the web UI to overlay compression disparities directly onto the canvas.

## Boundary Discontinuity & Doodle Stroke Checks

In addition to pure JPEG frequency ELA, two complementary spatial checks operate on the canvas:
1. **High-Contrast Patch / Spliced Logo Insert**: Detects sharp rectangular inserts surrounded by unnatural Laplacian variance jumps ($\nabla^2 > 80$).
2. **Artificial Digital Markup / Pen Doodle**: Detects digital pen strokes (high dark-pixel concentration with intense Laplacian gradient $\nabla^2 > 120$ in page margins).
