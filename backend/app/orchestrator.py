import io
import base64
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Tuple
from PIL import Image

from .schemas import (
    AnalyzeResponse, Finding, LayerOutput, DocumentMetadata, BoundingBox, PageInfo
)
from .modules.metadata_forensics import analyze_metadata
from .modules.visual_forensics import render_all_document_pages, analyze_visual_forensics, perform_ela
from .modules.ocr_semantic import analyze_ocr_and_semantics

def calculate_trust_score(findings: List[Finding]) -> Tuple[int, str, str]:
    """
    Computes an aggregate Trust Score (0-100) and risk level classification.
    """
    if not findings:
        return 98, "VERIFIED", "Document integrity verified. No forensic anomalies or tampering detected."

    score = 100
    for f in findings:
        if f.severity == "Critical":
            score -= 45
        elif f.severity == "High":
            score -= 32
        elif f.severity == "Medium":
            score -= 18
        elif f.severity == "Low":
            score -= 8

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
    Orchestrates Module 1 (Metadata), Module 2 (Visual/ELA across all pages), and Module 3 (OCR/Math),
    aggregating findings and bounding box coordinates into standardized API response.
    """
    doc_id = f"doc-{uuid.uuid4().hex[:8]}"
    
    # 1. Render all pages of the document
    page_images = render_all_document_pages(file_bytes, filename)
    pages_info: List[PageInfo] = []
    
    primary_img = page_images[0]
    
    # Generate page data for each page
    for idx, p_img in enumerate(page_images):
        p_buf = io.BytesIO()
        p_img.save(p_buf, format="JPEG", quality=85)
        p_url = "data:image/jpeg;base64," + base64.b64encode(p_buf.getvalue()).decode("utf-8")
        
        # Also generate ELA heatmap for page
        _, p_heatmap, _ = perform_ela(p_img)
        
        pages_info.append(PageInfo(
            page_number=idx + 1,
            preview_image_url=p_url,
            width=p_img.width,
            height=p_img.height,
            heatmap_data_url=p_heatmap
        ))

    # Preview image is page 1 image
    preview_url = pages_info[0].preview_image_url if pages_info else None

    # 2. Execute Module 1: Metadata Check
    doc_meta, meta_findings, meta_layer = analyze_metadata(file_bytes, filename)
    doc_meta.page_count = len(page_images)

    # 3. Execute Module 2: Visual & ELA Forensics (on primary page)
    visual_layers, visual_findings = analyze_visual_forensics(primary_img)

    # 4. Execute Module 3: OCR & Semantic Math Engine
    ocr_layers, ocr_findings = analyze_ocr_and_semantics(file_bytes, filename)

    # 5. Merge all findings
    all_findings = []
    all_findings.extend(ocr_findings)
    all_findings.extend(visual_findings)
    all_findings.extend(meta_findings)

    # Sort findings by severity
    sorted_findings = sort_findings(all_findings)

    # 6. Calculate aggregate Trust Score & Risk Level
    trust_score, risk_level, summary = calculate_trust_score(sorted_findings)

    # 7. Merge all layers
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
        metadata=doc_meta,
        findings=sorted_findings,
        layers=combined_layers,
        preview_image_url=preview_url,
        pages=pages_info,
        processed_at=datetime.now(timezone.utc).isoformat()
    )
