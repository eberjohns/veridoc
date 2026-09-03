"""
Unit Tests — Veridoc Forensic Engine

Covers:
- File fingerprinting (SHA-256, pHash, SimHash)
- DCT copy-move detection
- Applicable layer computation
- LLM agent module availability check
- OCR module interface
- ELA module

Run with:
    cd backend
    python -m pytest tests/test_forensics.py -v
"""

import io
import os
import sys
import hashlib
import pytest
import numpy as np
from PIL import Image

# Ensure backend is importable from tests dir
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_plain_image(width=256, height=256, color=(200, 200, 200)) -> Image.Image:
    return Image.new("RGB", (width, height), color)


def _make_copy_move_image(width=400, height=400) -> np.ndarray:
    """Create a synthetic image with an explicit copy-move patch."""
    img = np.full((height, width, 3), 200, dtype=np.uint8)
    patch = np.full((48, 48, 3), 30, dtype=np.uint8)
    patch[10:30, 10:30] = [120, 60, 20]
    img[10:58, 10:58] = patch      # Source
    img[200:248, 200:248] = patch  # Copy-moved destination
    return img


def _pil_to_bytes(img: Image.Image, fmt="PNG") -> bytes:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


# ── SHA-256 ───────────────────────────────────────────────────────────────────

class TestFileSHA256:
    def test_sha256_exact_duplicate(self):
        from app.modules.file_hash import compute_sha256
        data = b"Veridoc test payload 12345"
        assert compute_sha256(data) == compute_sha256(data)

    def test_sha256_differs_on_change(self):
        from app.modules.file_hash import compute_sha256
        assert compute_sha256(b"Invoice Total: $1000") != compute_sha256(b"Invoice Total: $9000")

    def test_sha256_hex_format(self):
        from app.modules.file_hash import compute_sha256
        h = compute_sha256(b"test")
        assert len(h) == 64
        assert h == h.lower()
        int(h, 16)


# ── pHash ─────────────────────────────────────────────────────────────────────

class TestPHash:
    def test_phash_identical_images(self):
        from app.modules.file_hash import compute_phash
        img = _make_plain_image(color=(100, 150, 200))
        assert compute_phash(img) == compute_phash(img)

    def test_phash_different_images(self):
        from app.modules.file_hash import compute_phash, phash_hamming_distance
        img1 = _make_plain_image(color=(255, 255, 255))
        # Image with structural high-frequency grid pattern
        arr = np.zeros((256, 256, 3), dtype=np.uint8)
        arr[::8, :] = 255
        arr[:, ::8] = 255
        img2 = Image.fromarray(arr)
        h1 = compute_phash(img1)
        h2 = compute_phash(img2)
        assert h1 is not None and h2 is not None
        assert phash_hamming_distance(h1, h2) > 10

    def test_phash_near_duplicate(self):
        from app.modules.file_hash import compute_phash, phash_hamming_distance
        img = _make_plain_image(color=(123, 200, 50))
        img_reloaded = Image.open(io.BytesIO(_pil_to_bytes(img, "JPEG"))).convert("RGB")
        h1, h2 = compute_phash(img), compute_phash(img_reloaded)
        assert h1 is not None and h2 is not None
        assert phash_hamming_distance(h1, h2) <= 10


# ── SimHash ───────────────────────────────────────────────────────────────────

class TestSimHash:
    def test_simhash_identical_text(self):
        from app.modules.file_hash import compute_text_simhash
        text = "Invoice from Acme Corp dated January 2024 total amount due five thousand dollars"
        assert compute_text_simhash(text) == compute_text_simhash(text)

    def test_simhash_near_duplicate_text(self):
        from app.modules.file_hash import compute_text_simhash, simhash_hamming_distance
        base = "Official invoice from Acme Corporation total due five hundred dollars"
        modified = "Official invoice from Acme Corporation total due five hundred fifty dollars"
        h1, h2 = compute_text_simhash(base), compute_text_simhash(modified)
        assert h1 is not None and h2 is not None
        assert simhash_hamming_distance(h1, h2) <= 20

    def test_simhash_short_text_returns_none(self):
        from app.modules.file_hash import compute_text_simhash
        assert compute_text_simhash("hi") is None


# ── DCT Copy-Move Detection ───────────────────────────────────────────────────

class TestDCTCopyMove:
    def test_no_copy_move_on_plain_image(self):
        from app.modules.visual_forensics import detect_visual_copy_paste_clones
        img_cv = np.array(_make_plain_image(color=(180, 180, 180)))[:, :, ::-1]
        findings, boxes = detect_visual_copy_paste_clones(img_cv)
        assert isinstance(findings, list)
        assert isinstance(boxes, list)

    def test_copy_move_detected_in_synthetic_image(self):
        from app.modules.visual_forensics import detect_visual_copy_paste_clones
        img_cv = _make_copy_move_image(width=400, height=400)
        findings, boxes = detect_visual_copy_paste_clones(img_cv)
        assert len(findings) > 0, "DCT should detect explicit copy-move"
        assert len(boxes) == 2, "Should produce source + destination boxes"
        assert findings[0].layer_type == "copy_paste"
        assert "DCT" in findings[0].title

    def test_bounding_boxes_in_range(self):
        from app.modules.visual_forensics import detect_visual_copy_paste_clones
        img_cv = _make_copy_move_image(width=400, height=400)
        _, boxes = detect_visual_copy_paste_clones(img_cv)
        for box in boxes:
            assert 0 <= box.x <= 100
            assert 0 <= box.y <= 100
            assert 0 < box.width <= 100
            assert 0 < box.height <= 100

    def test_findings_have_required_fields(self):
        from app.modules.visual_forensics import detect_visual_copy_paste_clones
        img_cv = _make_copy_move_image(width=400, height=400)
        findings, _ = detect_visual_copy_paste_clones(img_cv)
        for f in findings:
            assert f.id
            assert f.title
            assert f.description
            assert f.severity in {"Critical", "High", "Medium", "Low"}
            assert 0.0 <= f.confidence <= 1.0


# ── Applicable Layers ─────────────────────────────────────────────────────────

class TestApplicableLayers:
    def setup_method(self):
        from app.orchestrator import compute_applicable_layers
        self.compute = compute_applicable_layers

    def test_image_no_financial(self):
        layers = self.compute(False, False, False, False)
        assert "math" not in layers
        assert "font" not in layers
        assert "splicing" in layers

    def test_image_with_financial_content(self):
        layers = self.compute(False, False, True, True)
        assert "math" in layers
        assert "font" not in layers

    def test_digital_pdf_all_layers(self):
        layers = self.compute(True, True, True, True)
        for expected in ["math", "font", "splicing", "copy_paste", "metadata", "cross_reference"]:
            assert expected in layers

    def test_scanned_pdf_no_font(self):
        layers = self.compute(True, False, False, False)
        assert "font" not in layers

    def test_returns_list_of_strings(self):
        layers = self.compute(True, True, True, True)
        assert isinstance(layers, list)
        assert all(isinstance(item, str) for item in layers)


# ── LLM Agent ─────────────────────────────────────────────────────────────────

class TestLLMAgent:
    def test_classify_document_returns_valid_type(self):
        from app.modules.llm_agent import classify_document
        result = classify_document("Invoice No: 12345 Total: $500 Due Date: 2024-01-15")
        valid_types = {"invoice", "bank_statement", "receipt", "contract", "id_document",
                       "certificate", "form", "report", "image_scan", "other"}
        assert result in valid_types

    def test_summarize_findings_empty(self):
        from app.modules.llm_agent import summarize_findings
        summary, confidence = summarize_findings([])
        assert isinstance(summary, str) and len(summary) > 5
        assert 0.0 <= confidence <= 1.0

    def test_fetch_url_content_invalid_url(self):
        from app.modules.llm_agent import fetch_url_content
        result = fetch_url_content("http://localhost:99999/does-not-exist")
        assert result is None


# ── ELA Module ────────────────────────────────────────────────────────────────

class TestELA:
    def test_ela_returns_correct_types(self):
        from app.modules.visual_forensics import perform_ela
        gray_diff, heatmap_b64, boxes, anomaly_ratio = perform_ela(_make_plain_image())
        assert hasattr(gray_diff, "shape")
        assert heatmap_b64.startswith("data:image/png;base64,")
        assert isinstance(boxes, list)
        assert 0.0 <= anomaly_ratio <= 100.0

    def test_ela_boxes_in_range(self):
        from app.modules.visual_forensics import perform_ela
        _, _, boxes, _ = perform_ela(_make_plain_image(color=(128, 128, 128)))
        for box in boxes:
            assert 0 <= box.x <= 100
            assert 0 <= box.y <= 100


# ── OCR Module ────────────────────────────────────────────────────────────────

class TestOCRModule:
    def test_ocr_returns_layers_and_findings(self):
        from app.modules.ocr_semantic import analyze_ocr_and_semantics
        img_bytes = _pil_to_bytes(_make_plain_image(color=(255, 255, 255)), "PNG")
        layers, findings, ocr_data = analyze_ocr_and_semantics(img_bytes, "test_plain.png")
        assert isinstance(layers, dict)
        assert isinstance(findings, list)
        assert ocr_data is not None

    def test_ocr_findings_severity_valid(self):
        from app.modules.ocr_semantic import analyze_ocr_and_semantics
        img_bytes = _pil_to_bytes(_make_plain_image(color=(255, 255, 255)), "PNG")
        _, findings, _ = analyze_ocr_and_semantics(img_bytes, "test_plain.png")
        for f in findings:
            assert f.severity in {"Critical", "High", "Medium", "Low", "Info"}


# ── AI Generation Module ──────────────────────────────────────────────────────

class TestAIGenerationModule:
    def test_ai_generation_clean_document(self):
        from app.modules.ai_generator_detector import analyze_ai_generation
        img_bytes = _pil_to_bytes(_make_plain_image(color=(255, 255, 255)), "PNG")
        img_cv = np.ones((512, 512, 3), dtype=np.uint8) * 255
        layer, findings = analyze_ai_generation(img_bytes, "authentic.png", {}, img_cv, "Standard invoice text")
        assert layer.layer_id == "ai_generation"
        assert layer.score == 100
        assert len(findings) == 0

    def test_ai_generation_detected_signature(self):
        from app.modules.ai_generator_detector import analyze_ai_generation
        img_bytes = b"Sample byte stream with midjourney metadata"
        img_cv = np.ones((512, 512, 3), dtype=np.uint8) * 255
        meta = {"Software": "Midjourney v6.0", "Producer": "DALL-E 3 API"}
        layer, findings = analyze_ai_generation(img_bytes, "fake_ai.png", meta, img_cv, "Generated by OpenAI")
        assert layer.layer_id == "ai_generation"
        assert layer.flagged is True
        assert len(findings) >= 1
        assert "Synthetic AI Document Generation Detected" in findings[0].title

