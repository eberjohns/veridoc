# Algorithm: File Fingerprinting & Duplicate Detection

## Overview

Three-layer fingerprinting detects exact and near-duplicate documents uploaded to Veridoc.

## Layer 1: SHA-256 (Exact Duplicate)

**Reference**: FIPS 180-4 (NIST 2015)

```python
hashlib.sha256(file_bytes).hexdigest()
```

- Any single byte change → completely different hash
- Use: exact re-upload detection, file integrity verification
- Comparison: equality check

## Layer 2: DCT Perceptual Hash / pHash (Near-Visual Duplicate)

**Reference**: Krawetz, N. (2011). "Kind of Like That." _Hacker Factor Blog._

```
1. Resize image to 64×64 grayscale
2. Compute 2D DCT (scipy.fft.dctn)
3. Extract top-left 16×16 block (low-frequency)
4. Threshold against median value → 256-bit fingerprint
5. Encode as hex string
```

- Comparison: **Hamming distance ≤ 10** → near-duplicate
- Robust to: JPEG re-compression, minor brightness/contrast change, small resizes

## Layer 3: SimHash (Near-Duplicate Text Content)

**Reference**: Charikar, M. (2002). "Similarity estimation techniques from rounding algorithms." _STOC 2002._

```
1. Tokenize text into overlapping 3-gram word shingles
2. For each shingle: MD5 hash → 64-bit integer
3. For each bit position: sum +1/-1 weighted votes
4. Final bit = sign of accumulated sum → 64-bit fingerprint
```

- Comparison: **Hamming distance ≤ 5** → near-duplicate text
- Robust to: minor wording changes, reordering of short sentences
- Fails for: completely rewritten documents (correct — those are not duplicates)

## Duplicate Check Flow

```
new_doc.sha256 == stored.sha256          → exact duplicate
phash_hamming(new, stored) ≤ 10         → near-visual duplicate
simhash_hamming(new, stored) ≤ 5        → near-text duplicate
```

## Unit Test Coverage

See `tests/test_forensics.py → TestFileSHA256, TestPHash, TestSimHash`
