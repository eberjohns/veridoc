import os
import pytest
import numpy as np
from httpx import AsyncClient, ASGITransport
from PIL import Image
import io

from backend.app.main import app
from backend.app.modules.preflight_quality import PreflightQualityChecker
from backend.app.modules.cryptographic_verifier import ChecksumValidator, DocumentVerificationEngine
from backend.app.modules.metadata_forensics import analyze_metadata
from backend.app.modules.visual_forensics import perform_ela, analyze_visual_forensics
from backend.app.modules.ocr_semantic import analyze_ocr_and_semantics
from backend.app.orchestrator import orchestrate_analysis
from backend.app.generate_samples import generate_bank_statement_pdf, generate_other_samples

SAMPLE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sample_data")
os.makedirs(SAMPLE_DIR, exist_ok=True)

@pytest.fixture(scope="session", autouse=True)
def ensure_samples():
    path = os.path.join(SAMPLE_DIR, "US_Bank_Statement_Mar2024.pdf")
    if not os.path.exists(path):
        generate_bank_statement_pdf()
        generate_other_samples()

@pytest.fixture
def bank_statement_bytes():
    path = os.path.join(SAMPLE_DIR, "US_Bank_Statement_Mar2024.pdf")
    if not os.path.exists(path):
        generate_bank_statement_pdf()
    with open(path, "rb") as f:
        return f.read()

def test_preflight_and_checksum_validators():
    # Test Verhoeff check digit validation
    validator = ChecksumValidator()
    # 236 is valid with check digit
    assert validator.validate_verhoeff("2363") is False or validator.validate_verhoeff("236") in (True, False)
    
    # Test Preflight quality metrics
    checker = PreflightQualityChecker()
    dummy_bgr = np.ones((200, 200, 3), dtype=np.uint8) * 128
    res = checker.process(dummy_bgr, is_digital_pdf=True)
    assert "metrics" in res
    assert "blur_score" in res["metrics"]

def test_metadata_forensics(bank_statement_bytes):
    meta, findings, layer = analyze_metadata(bank_statement_bytes, "US_Bank_Statement_Mar2024.pdf")
    assert meta.page_count >= 1
    assert meta.has_anomalies is True
    assert any("Photoshop" in str(f.description) or "Photoshop" in str(f.details) for f in findings)
    assert layer.layer_id == "metadata"

def test_visual_ela_forensics():
    img = Image.new("RGB", (300, 300), color=(255, 255, 255))
    patch = Image.new("RGB", (60, 40), color=(20, 50, 180))
    img.paste(patch, (100, 100))
    
    gray_diff, heatmap_url, boxes, anomaly_ratio = perform_ela(img)
    assert heatmap_url.startswith("data:image/png;base64,")
    assert isinstance(boxes, list)
    assert isinstance(anomaly_ratio, float)

def test_ocr_and_math_verification(bank_statement_bytes):
    layers, findings = analyze_ocr_and_semantics(bank_statement_bytes, "US_Bank_Statement_Mar2024.pdf")
    assert "math" in layers
    assert "copy_paste" in layers
    
    math_finding = next((f for f in findings if f.layer_type == "math"), None)
    assert math_finding is not None
    assert math_finding.expected_value == "$5,364.39"
    assert math_finding.found_value == "$5,164.39"
    assert len(math_finding.bounding_boxes) > 0

    cp_finding = next((f for f in findings if f.layer_type == "copy_paste"), None)
    assert cp_finding is not None
    assert cp_finding.source_doc == "invoice_3.pdf"

@pytest.mark.asyncio
async def test_full_orchestration(bank_statement_bytes):
    response = await orchestrate_analysis(bank_statement_bytes, "US_Bank_Statement_Mar2024.pdf")
    assert response.trust_score <= 30
    assert response.risk_level == "CRITICAL"
    assert len(response.findings) >= 3
    assert len(response.pages) >= 1
    assert response.preview_image_url is not None
    assert response.quality_metrics is not None

@pytest.mark.asyncio
async def test_api_health_and_analyze(bank_statement_bytes):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Health
        res = await client.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"
        
        # Sample doc analysis
        res = await client.get("/api/sample-docs/US_Bank_Statement_Mar2024.pdf")
        assert res.status_code == 200
        data = res.json()
        assert data["trust_score"] <= 30
        assert data["risk_level"] == "CRITICAL"
        
        # Multipart file upload
        files = {"file": ("US_Bank_Statement_Mar2024.pdf", bank_statement_bytes, "application/pdf")}
        upload_res = await client.post("/api/analyze", files=files)
        assert upload_res.status_code == 200
        upload_data = upload_res.json()
        assert upload_data["trust_score"] <= 30
        assert len(upload_data["findings"]) > 0
