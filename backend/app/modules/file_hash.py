"""
File Fingerprinting & Duplicate Detection Module
=================================================
Implements three-layer document fingerprinting:

1. SHA-256 cryptographic hash  → exact byte-identical detection
2. DCT Perceptual Hash (pHash) → near-duplicate image detection (resize, quality change)
3. SimHash (text 3-gram)       → near-duplicate PDF/text content detection

References:
- Krawetz, N. (2011). "Kind of Like That" — perceptual image hashing
- Charikar, M. (2002). Similarity estimation techniques from rounding algorithms (SimHash)
"""

import io
import hashlib
import re
from typing import Optional, Tuple
from PIL import Image


def compute_sha256(file_bytes: bytes) -> str:
    """Compute SHA-256 cryptographic hash of raw file bytes."""
    return hashlib.sha256(file_bytes).hexdigest()


def compute_phash(pil_img: Image.Image, hash_size: int = 16) -> Optional[str]:
    """
    Compute a DCT-based perceptual hash (pHash) for an image.

    Algorithm (Krawetz 2011):
      1. Resize image to (hash_size * 4) x (hash_size * 4) — 64x64 default
      2. Convert to grayscale
      3. Apply 2D DCT over the image pixel matrix
      4. Take the top-left hash_size x hash_size block (low-frequency DCT coefficients)
      5. Compute the median of those coefficients
      6. For each coefficient: bit = 1 if coefficient > median, else 0
      7. Pack 64 bits into a hex string

    Comparison: Hamming distance <= 10 → near-duplicate
    """
    try:
        import numpy as np
        from scipy.fft import dctn

        # Step 1-2: resize and grayscale
        n = hash_size * 4  # 64 default
        img_resized = pil_img.convert("L").resize((n, n), Image.LANCZOS)
        pixels = np.array(img_resized, dtype=np.float32)

        # Step 3: 2D DCT
        dct_coefficients = dctn(pixels, norm="ortho")

        # Step 4: top-left hash_size x hash_size block
        low_freq = dct_coefficients[:hash_size, :hash_size].flatten()

        # Step 5: median threshold
        med = float(np.median(low_freq))

        # Step 6-7: bitmask → hex
        bits = (low_freq > med).astype(int)
        bit_str = "".join(map(str, bits))
        hex_val = f"{int(bit_str, 2):0{len(bits)//4}x}"
        return hex_val

    except Exception:
        return None


def phash_hamming_distance(hash_a: str, hash_b: str) -> int:
    """
    Compute Hamming distance between two pHash hex strings.
    Returns number of differing bits.
    """
    try:
        a = int(hash_a, 16)
        b = int(hash_b, 16)
        xor = a ^ b
        return bin(xor).count("1")
    except (ValueError, TypeError):
        return 999


def compute_text_simhash(text: str, hash_bits: int = 64) -> Optional[str]:
    """
    Compute a SimHash fingerprint for text content.

    Algorithm (Charikar 2002):
      1. Tokenize text into overlapping 3-grams (shingles)
      2. For each shingle: compute MD5 hash → 64-bit integer
      3. For each bit position: +1 if bit=1, -1 if bit=0
      4. Accumulate weighted vector across all shingles
      5. Final hash bit = 1 if position sum > 0 else 0

    Comparison: Hamming distance <= 5 → near-duplicate text
    """
    try:
        if not text or len(text) < 10:
            return None

        # Clean and tokenize
        tokens = re.findall(r"[a-zA-Z0-9]+", text.lower())
        if len(tokens) < 3:
            return None

        # 3-gram shingles
        shingles = [" ".join(tokens[i:i+3]) for i in range(len(tokens) - 2)]
        if not shingles:
            return None

        # Weighted bit vector
        v = [0] * hash_bits
        for shingle in shingles:
            h = int(hashlib.md5(shingle.encode()).hexdigest(), 16)
            for bit_pos in range(hash_bits):
                bit = (h >> bit_pos) & 1
                v[bit_pos] += 1 if bit else -1

        # Final fingerprint
        bits = [1 if x > 0 else 0 for x in v]
        bit_str = "".join(map(str, reversed(bits)))
        hex_val = f"{int(bit_str, 2):0{hash_bits//4}x}"
        return hex_val

    except Exception:
        return None


def simhash_hamming_distance(hash_a: str, hash_b: str) -> int:
    """Compute Hamming distance between two SimHash hex strings."""
    try:
        a = int(hash_a, 16)
        b = int(hash_b, 16)
        xor = a ^ b
        return bin(xor).count("1")
    except (ValueError, TypeError):
        return 999


def fingerprint_document(
    file_bytes: bytes,
    filename: str,
    primary_image: Optional[Image.Image] = None,
    text_content: Optional[str] = None
) -> Tuple[str, Optional[str], Optional[str]]:
    """
    Compute all three fingerprints for a document.

    Returns:
        (sha256_hex, phash_hex_or_None, simhash_hex_or_None)
    """
    sha256 = compute_sha256(file_bytes)
    phash = None
    simhash = None

    if primary_image is not None:
        phash = compute_phash(primary_image)

    if text_content:
        simhash = compute_text_simhash(text_content)

    return sha256, phash, simhash


def check_duplicate_against_manifest(
    sha256: str,
    phash: Optional[str],
    simhash: Optional[str],
    manifest: list,
    current_doc_id: Optional[str] = None
) -> Tuple[Optional[str], str]:
    """
    Cross-check new document fingerprints against all stored manifest entries and existing uploads.

    Returns:
        (duplicate_name_or_id_or_None, match_type: 'exact' | 'near-visual' | 'near-text' | 'none')
    """
    import os
    import json
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads")
    sample_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "sample_data")

    # Combine manifest entries with any cached analysis files in uploads
    all_entries = list(manifest) if manifest else []
    seen_ids = {e.get("id") for e in all_entries if e.get("id")}

    # Also inspect existing analysis JSON files in uploads directory
    if os.path.exists(uploads_dir):
        for fname in os.listdir(uploads_dir):
            if fname.endswith(".json") and fname != "manifest.json":
                stem = fname[:-5]
                if stem != current_doc_id and stem not in seen_ids:
                    try:
                        with open(os.path.join(uploads_dir, fname), "r", encoding="utf-8") as f:
                            data = json.load(f)
                            all_entries.append({
                                "id": data.get("document_id", stem),
                                "filename": data.get("filename", stem),
                                "file_sha256": data.get("metadata", {}).get("file_sha256"),
                                "file_phash": data.get("metadata", {}).get("file_phash"),
                                "file_simhash": data.get("metadata", {}).get("file_simhash"),
                                "metadata": data.get("metadata", {})
                            })
                            seen_ids.add(stem)
                    except Exception:
                        pass

    for entry in all_entries:
        entry_id = entry.get("id", "")
        if entry_id == current_doc_id:
            continue

        stored_meta = entry.get("metadata", {})
        stored_sha = stored_meta.get("file_sha256") or entry.get("file_sha256")
        stored_phash = stored_meta.get("file_phash") or entry.get("file_phash")
        stored_simhash = stored_meta.get("file_simhash") or entry.get("file_simhash")
        entry_filename = entry.get("filename", entry_id)

        # If hashes are missing from manifest entry, attempt to load from disk
        if not stored_sha and os.path.exists(uploads_dir):
            json_file = os.path.join(uploads_dir, f"{entry_id}.json")
            if os.path.exists(json_file):
                try:
                    with open(json_file, "r", encoding="utf-8") as jf:
                        jdata = json.load(jf)
                        stored_meta = jdata.get("metadata", {})
                        stored_sha = stored_meta.get("file_sha256")
                        stored_phash = stored_meta.get("file_phash")
                        stored_simhash = stored_meta.get("file_simhash")
                except Exception:
                    pass

        # 1. Exact byte match (SHA-256)
        if stored_sha and stored_sha.lower() == sha256.lower():
            return entry_filename, "exact"

        # 2. Near-duplicate visual (pHash Hamming <= 10)
        if phash and stored_phash:
            hd = phash_hamming_distance(phash, stored_phash)
            if hd <= 10:
                return entry_filename, "near-visual"

        # 3. Near-duplicate text (SimHash Hamming <= 5)
        if simhash and stored_simhash:
            hd = simhash_hamming_distance(simhash, stored_simhash)
            if hd <= 5:
                return entry_filename, "near-text"

    return None, "none"
