# Algorithm: DCT Block-Matching Copy-Move Forgery Detection

## Overview

Copy-move forgery is one of the most common document manipulation techniques: a region is copied from within the same document and pasted elsewhere (e.g. duplicating a stamp, signature, or line item). Our detection algorithm uses DCT (Discrete Cosine Transform) block-matching, the canonical forensic approach.

## Academic References

- **Popescu & Farid (2004)** — "Exposing Digital Forgeries by Detecting Duplicated Image Regions", IEEE Trans. Signal Processing. _Original DCT block-match approach._
- **Christlein et al. (2012)** — "An Evaluation of Popular Copy-Move Forgery Detection Approaches", IEEE Trans. Information Forensics & Security. _Benchmark study confirming DCT superiority over keypoint-based methods for document images._

## Algorithm Steps

### 1. Preprocessing
```
Image → Resize to max 600×600 (preserving aspect ratio)
      → Convert to grayscale float32
```

### 2. Sliding Block Extraction
```
For each overlapping 16×16 block (stride=8):
  - Apply 2D DCT (scipy.fft.dctn, ortho norm)
  - Extract top-left 25 low-frequency coefficients (zigzag order)
  - Store as (feature_vector[25], origin_yx)
```

### 3. Lexicographic Sort
Sort all `(feature_vector, origin)` pairs lexicographically. Matching blocks will be adjacent in this sorted order.

### 4. Pair Detection
```
For adjacent pairs in sorted list:
  if L2(fv1, fv2) ≤ 80.0:        # Frequency match threshold
    if spatial_dist ≥ 32 px:       # Must be spatially separated
      shift = round((y2-y1)/8)*8, round((x2-x1)/8)*8  # Normalized shift vector
      shift_map[shift].append((pos1, pos2))
```

### 5. Shift Vector Clustering
```
For each unique shift vector:
  if count(pairs) ≥ 5:            # MIN_CLUSTER threshold
    → Confirmed copy-move region
```

### 6. Bounding Box Reconstruction
Source and destination bounding boxes are computed from the extent of matching block origins, scaled back to the original image resolution.

## Why DCT vs ORB (keypoints)

| Method | JPEG Robust | Scale Robust | Document Precision |
|--------|------------|--------------|-------------------|
| ORB (keypoints) | Poor | Good | Low |
| DCT block-match | **High** | Fair | **High** |

ORB is dominated by high-contrast keypoints (text, borders) and produces false positives on all text-heavy documents. DCT works in the frequency domain and is inherently robust to mild JPEG re-compression artifacts.

## Tunable Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `BLOCK_SIZE` | 16 | Block size in pixels |
| `STRIDE` | 8 | Sliding stride (overlap = 50%) |
| `DCT_COEFFS` | 25 | Low-frequency coefficients extracted |
| `L2_THRESHOLD` | 80.0 | Max L2 distance for a match |
| `MIN_CLUSTER` | 5 | Min block pairs with same shift to confirm |
| `MIN_SPATIAL_DIST` | 32 | Min pixel separation between source & dest |

## Unit Test Coverage

See `tests/test_forensics.py → TestDCTCopyMove`:
- Plain image → no false positives
- Explicit 48×48 copy-move patch → detected
- Bounding boxes validated in [0,100]% range
- All required finding fields present
