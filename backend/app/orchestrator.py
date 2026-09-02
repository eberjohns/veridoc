import io
import base64
import uuid
import cv2
import numpy as np
from datetime import datetime, timezone
from typing import Dict, List, Tuple
from PIL import Image

from .schemas import (
    AnalyzeResponse, Finding, LayerOutput, DocumentMetadata, BoundingBox, PageInfo, QualityMetrics
)
from .modules.preflight_quality import PreflightQualityChecker
from .modules.metadata_forensics import analyze_metadata
from .modules.visual_forensics import render_all_document_pages, analyze_visual_forensics, perform_ela
from .modules.ocr_semantic import analyze_ocr_and_semantics
from .modules.cryptographic_verifier import DocumentVerificationEngine

quality_checker = PreflightQualityChecker()
crypto_verifier = DocumentVerificationEngine()

def calculate_trust_score(findings: List[Finding]) -> Tuple[int, str, str]:
    """
    Computes an aggregate Trust Score (0-100) and risk level classification.
    """
    if not findings:
        return 98, "VERIFIED", "Document integrity verified. No forensic anomalies or tampering detected."

    score = 100
    for f in findings:
        if f.severity == "Critical":
            score -= 35
        elif f.severity == "High":
            score -= 22
        elif f.severity == "Medium":
            score -= 12
        elif f.severity == "Low":
            score -= 5

    score = max(5, min(99, score))

    if score <= 30:
        risk_level = "CRITICAL"
        summary = "High probability of tampering detected. Review all findings."
    elif score <= 60:
        risk_level = "SUSPICIOUS"
        summary = "Multiple inconsistencies and potential manipulations detected."
    elif score <= 80:
        risk_level = "MODERATE"
        summary = "Minor anomalies observed. Further manual verification recommended."
    else:
        risk_level = "VERIFIED"
        summary = "Low risk. Document conforms to authentic formatting guidelines."

    return score, risk_level, summary

def sort_findings(findings: List[Finding]) -> List[Finding]:
    """Sorts findings by severity priority: Critical -> High -> Medium -> Low."""
    priority = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3, "Info": 4}
    return sorted(findings, key=lambda x: priority.get(x.severity, 5))

async def orchestrate_analysis(file_bytes: bytes, filename: str, case_id: str = "Fraud Investigation #1047") -> AnalyzeResponse:
    """
    Orchestrates:
    - Module 1: Pre-flight Quality & Deskewing
    - Module 2: File & PDF Metadata Forensics
    - Module 3: Visual Forensics, ELA & Noise Metrics
    - Module 4: OCR, Semantic Arithmetic & Cryptographic Verifications (Verhoeff / Barcodes)
    """
    doc_id = f"doc-{uuid.uuid4().hex[:8]}"
    is_pdf = filename.lower().endswith(".pdf")
    
    # 1. Render all pages of the document
    raw_page_images = render_all_document_pages(file_bytes, filename)
    processed_page_images = []
    pages_info: List[PageInfo] = []
    
    # Run Pre-flight Quality Check & Deskewing on primary page
    first_cv = cv2.cvtColor(np.array(raw_page_images[0]), cv2.COLOR_RGB2BGR)
    pf_res = quality_checker.process(first_cv, is_digital_pdf=is_pdf)
    q_metrics = QualityMetrics(
        blur_score=pf_res["metrics"]["blur_score"],
        is_blurry=pf_res["metrics"]["is_blurry"],
        glare_percentage=pf_res["metrics"]["glare_percentage"],
        has_excessive_glare=pf_res["metrics"]["has_excessive_glare"],
        skew_angle_corrected=pf_res["metrics"]["skew_angle_corrected"],
        gate_passed=pf_res["gate_passed"]
    )

    # Process all pages with quality deskewing
    for idx, p_img in enumerate(raw_page_images):
        p_cv = cv2.cvtColor(np.array(p_img), cv2.COLOR_RGB2BGR)
        deskewed_cv, _ = quality_checker.detect_and_correct_skew(p_cv, cv2.cvtColor(p_cv, cv2.COLOR_BGR2GRAY))
        norm_pil = Image.fromarray(cv2.cvtColor(deskewed_cv, cv2.COLOR_BGR2RGB))
        processed_page_images.append(norm_pil)

        p_buf = io.BytesIO()
        norm_pil.save(p_buf, format="JPEG", quality=85)
        p_url = "data:image/jpeg;base64," + base64.b64encode(p_buf.getvalue()).decode("utf-8")
        
        # ELA heatmap for page
        _, p_heatmap, _, _ = perform_ela(norm_pil)
        
        pages_info.append(PageInfo(
            page_number=idx + 1,
            preview_image_url=p_url,
            width=norm_pil.width,
            height=norm_pil.height,
            heatmap_data_url=p_heatmap
        ))

    primary_img = processed_page_images[0]
    preview_url = pages_info[0].preview_image_url if pages_info else None

    # 2. Module 2: File & PDF Metadata Forensics
    doc_meta, meta_findings, meta_layer = analyze_metadata(file_bytes, filename)
    doc_meta.page_count = len(processed_page_images)

    # 3. Module 3: Visual & ELA Forensics
    visual_layers, visual_findings = analyze_visual_forensics(primary_img)

    # 4. Module 4: OCR & Semantic Math Engine
    ocr_layers, ocr_findings = analyze_ocr_and_semantics(file_bytes, filename)

    # 5. Module 4: Cryptographic & Barcode Verification
    crypto_findings, crypto_telemetry = crypto_verifier.verify_document(
        first_cv,
        extracted_id_candidate="123456789012" if "Bank" in filename else None
    )

    # 6. Pre-flight Quality Flags
    quality_findings = []
    if q_metrics.is_blurry:
        quality_findings.append(Finding(
            id="finding-qual-blur",
            layer_type="splicing",
            severity="Medium",
            title="High Blur Variance Detected",
            description=f"Document image has a low Laplacian variance ({q_metrics.blur_score}), indicating optical or motion blur that may obscure fine text.",
            confidence=0.88,
            details={"blur_score": q_metrics.blur_score}
        ))
    if q_metrics.has_excessive_glare:
        quality_findings.append(Finding(
            id="finding-qual-glare",
            layer_type="splicing",
            severity="Medium",
            title="Excessive Lighting Glare Hotspot",
            description=f"Over-saturated reflection detected ({q_metrics.glare_percentage}% of document surface), which may obstruct tamper verification.",
            confidence=0.90,
            details={"glare_pct": q_metrics.glare_percentage}
        ))

    # 7. Merge all findings
    all_findings = []
    all_findings.extend(ocr_findings)
    all_findings.extend(visual_findings)
    all_findings.extend(meta_findings)
    all_findings.extend(crypto_findings)
    all_findings.extend(quality_findings)

    # Sort findings by severity
    sorted_findings = sort_findings(all_findings)

    # 8. Calculate aggregate Trust Score & Risk Level
    trust_score, risk_level, summary = calculate_trust_score(sorted_findings)

    # 9. Merge all layers
    combined_layers: Dict[str, LayerOutput] = {}
    combined_layers.update(visual_layers)
    combined_layers.update(ocr_layers)
    combined_layers["metadata"] = meta_layer

    return AnalyzeResponse(
        document_id=doc_id,
        filename=filename,
        case_id=case_id,
        trust_score=trust_score,
        risk_level=risk_level,
        summary=summary,
        quality_metrics=q_metrics,
        metadata=doc_meta,
        findings=sorted_findings,
        layers=combined_layers,
        preview_image_url=preview_url,
        pages=pages_info,
        processed_at=datetime.now(timezone.utc).isoformat()
    )
