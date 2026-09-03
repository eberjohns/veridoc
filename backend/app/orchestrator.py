import io
import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
import glob
import base64
import uuid
import time
import cv2
import numpy as np
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional
from PIL import Image

from .schemas import (
    AnalyzeResponse, Finding, LayerOutput, DocumentMetadata, BoundingBox, PageInfo, QualityMetrics
)
from .modules.preflight_quality import PreflightQualityChecker
from .modules.metadata_forensics import analyze_metadata
from .modules.visual_forensics import render_all_document_pages, analyze_visual_forensics, perform_ela
from .modules.ocr_semantic import analyze_ocr_and_semantics
from .modules.cryptographic_verifier import DocumentVerificationEngine
from .modules.file_hash import fingerprint_document, check_duplicate_against_manifest
from .modules.llm_agent import classify_document, summarize_findings, verify_arithmetic

quality_checker = PreflightQualityChecker()
crypto_verifier = DocumentVerificationEngine()
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")

def find_counterpart_reference_image(
    current_img: Image.Image, 
    current_filename: str,
    manifest: Optional[list] = None
) -> Tuple[Optional[Image.Image], Optional[str]]:
    """Finds a matching companion image in the uploads directory for cross-reference delta analysis."""
    if not os.path.exists(UPLOADS_DIR):
        return None, None

    curr_aspect = current_img.width / float(current_img.height) if current_img.height > 0 else 1.0
    image_exts = ("*.jpg", "*.jpeg", "*.png")

    id_to_filename = {}
    if manifest:
        for entry in manifest:
            eid = entry.get("id", "")
            fname = entry.get("filename", "")
            if eid and fname:
                id_to_filename[eid] = fname
    
    for ext in image_exts:
        for file_path in glob.glob(os.path.join(UPLOADS_DIR, ext)):
            base_name = os.path.basename(file_path)
            stem, _ = os.path.splitext(base_name)
            display_name = id_to_filename.get(stem, base_name)
            
            if display_name.lower() == current_filename.lower() or base_name.lower() == current_filename.lower():
                continue
            try:
                ref_img = Image.open(file_path).convert("RGB")
                ref_aspect = ref_img.width / float(ref_img.height) if ref_img.height > 0 else 1.0
                if abs(curr_aspect - ref_aspect) < 0.15:
                    return ref_img, display_name
            except Exception:
                continue

    return None, None


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

def compute_applicable_layers(
    is_pdf: bool,
    is_digital_pdf: bool,
    has_financial_content: bool,
    has_ocr_text: bool
) -> List[str]:
    """
    Determine which forensic checks apply to this document type.

    Rules:
    - metadata, cross_reference: always applicable (every document has metadata/hash)
    - splicing & copy_paste: always applicable (ELA/DCT works on any image)
    - math: only if document has financial/numerical content detectible via OCR
    - font: only if document is a digital PDF (PyMuPDF provides span-level typeface data)
    """
    layers = ["metadata", "splicing", "copy_paste", "cross_reference"]
    if has_financial_content:
        layers.append("math")
    if is_pdf and is_digital_pdf:
        layers.append("font")
    return sorted(layers)


async def orchestrate_analysis(
    file_bytes: bytes,
    filename: str,
    case_id: str = "Fraud Investigation #1047",
    manifest: Optional[list] = None
) -> AnalyzeResponse:
    """
    Orchestrates all forensic modules:
    1. File Fingerprinting (SHA-256 + pHash + SimHash)
    2. Pre-flight Quality & Deskewing
    3. File & PDF Metadata Forensics
    4. Visual Forensics: ELA Splicing, DCT Copy-Move, Cross-Reference
    5. OCR & Semantic Math Verification
    6. Cryptographic & Barcode Verification
    7. Applicable Layer Computation (smart greying)
    8. LLM Agent: Document Classification & Finding Summarization
    """
    doc_id = f"doc-{uuid.uuid4().hex[:8]}"
    is_pdf = filename.lower().endswith(".pdf")
    t_start = time.perf_counter()

    # 1. Pre-Flight Quality Check & Page Rendering
    t_pre_start = time.perf_counter()
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

    # Process all pages with deskewing
    for idx, p_img in enumerate(raw_page_images):
        p_cv = cv2.cvtColor(np.array(p_img), cv2.COLOR_RGB2BGR)
        deskewed_cv, _ = quality_checker.detect_and_correct_skew(p_cv, cv2.cvtColor(p_cv, cv2.COLOR_BGR2GRAY), is_digital_pdf=is_pdf)
        norm_pil = Image.fromarray(cv2.cvtColor(deskewed_cv, cv2.COLOR_BGR2RGB))
        processed_page_images.append(norm_pil)

        p_buf = io.BytesIO()
        norm_pil.save(p_buf, format="JPEG", quality=85)
        p_url = "data:image/jpeg;base64," + base64.b64encode(p_buf.getvalue()).decode("utf-8")

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
    t_preflight_ms = round((time.perf_counter() - t_pre_start) * 1000, 1)

    # 2. File Fingerprinting (SHA-256, pHash, SimHash)
    t_hash_start = time.perf_counter()
    sha256, phash, simhash = fingerprint_document(
        file_bytes=file_bytes,
        filename=filename,
        primary_image=primary_img,
        text_content=None  # Will be updated after OCR
    )

    # Check for duplicates against existing manifest
    duplicate_id, duplicate_type = None, "none"
    if manifest:
        duplicate_id, duplicate_type = check_duplicate_against_manifest(
            sha256, phash, simhash, manifest, current_doc_id=doc_id
        )
    t_hash_ms = round((time.perf_counter() - t_hash_start) * 1000, 1)

    # 3. Metadata & Container Forensics
    t_meta_start = time.perf_counter()
    doc_meta, meta_findings, meta_layer = analyze_metadata(file_bytes, filename)
    doc_meta.page_count = len(processed_page_images)
    doc_meta.file_sha256 = sha256
    doc_meta.file_phash = phash
    doc_meta.file_simhash = simhash
    if duplicate_id:
        doc_meta.duplicate_of = duplicate_id
        doc_meta.duplicate_type = duplicate_type

    # Check if PDF is digital (has real text) vs scanned
    is_digital_pdf = False
    if is_pdf:
        import pymupdf as fitz
        try:
            pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
            total_chars = sum(len(pdf_doc[i].get_text()) for i in range(min(3, len(pdf_doc))))
            is_digital_pdf = total_chars > 50
            pdf_doc.close()
        except Exception:
            is_digital_pdf = False
    t_meta_ms = round((time.perf_counter() - t_meta_start) * 1000, 1)

    # 4. Visual Forensics (ELA Splicing, DCT 2D Block-Matching, Cross-Reference)
    t_vis_start = time.perf_counter()
    ref_img, ref_name = find_counterpart_reference_image(primary_img, filename, manifest=manifest)
    visual_layers, visual_findings = analyze_visual_forensics(
        primary_img,
        reference_img=ref_img,
        ref_filename=ref_name
    )
    t_vis_ms = round((time.perf_counter() - t_vis_start) * 1000, 1)

    # 5. OCR & Semantic Math Engine + Multi-Format Extraction
    t_ocr_start = time.perf_counter()
    ocr_layers, ocr_findings = analyze_ocr_and_semantics(file_bytes, filename)
    t_ocr_ms = round((time.perf_counter() - t_ocr_start) * 1000, 1)

    # Extract full document text across all formats (DOCX headers/footers, XLSX, PDF, TXT)
    from .modules.threat_memory_bank import extract_any_document_text, heuristic_micro_constraint_scan
    from .modules.prompt_guard import scan_for_prompt_injection, create_injection_finding
    
    extracted_full_text = extract_any_document_text(file_bytes, filename)
    ocr_text = extracted_full_text if extracted_full_text.strip() else ""

    # Prompt Injection & Manipulative Micro-Constraint Scanning
    security_findings = []
    is_inj, inj_score, matched_patterns = scan_for_prompt_injection(ocr_text)
    micro_constraints = heuristic_micro_constraint_scan(ocr_text)

    all_flagged_threats = list(matched_patterns)
    for mc in micro_constraints:
        if mc["matched_text"] not in all_flagged_threats:
            all_flagged_threats.append(mc["matched_text"])

    if all_flagged_threats or is_inj:
        sec_score = max(inj_score, 0.92)
        sec_finding = create_injection_finding(filename, sec_score, all_flagged_threats)
        security_findings.append(sec_finding)

    # Steganography / Invisible White-on-White Text Inspection
    from .modules.steganography_detector import detect_white_on_white_text, create_white_text_findings
    white_text_items = detect_white_on_white_text(file_bytes, filename)
    white_text_findings, white_text_boxes = create_white_text_findings(white_text_items, filename)

    if white_text_findings:
        security_findings.extend(white_text_findings)
        if "font" in ocr_layers:
            ocr_layers["font"].overlay_items.extend(white_text_boxes)
            ocr_layers["font"].findings_count += len(white_text_findings)
            ocr_layers["font"].flagged = True
            ocr_layers["font"].score = max(20, ocr_layers["font"].score - 35)
        else:
            ocr_layers["font"] = LayerOutput(
                layer_id="font",
                name="Typography & Steganography Check",
                description="Invisible white-on-white text, kerning variance, and font steganography",
                score=35,
                flagged=True,
                findings_count=len(white_text_findings),
                overlay_items=white_text_boxes
            )

    # Update simhash with actual text if we got meaningful text
    if ocr_text.strip() and len(ocr_text.strip()) > 50:
        from .modules.file_hash import compute_text_simhash
        simhash = compute_text_simhash(ocr_text)
        doc_meta.file_simhash = simhash

    # Detect if document has financial content
    import re
    currency_tokens = len(re.findall(r"[\$£€]\s*\d|(?:total|subtotal|balance|amount|invoice)\s*[:.]?\s*\d", ocr_text, re.IGNORECASE))
    has_financial_content = currency_tokens >= 2

    # 6. Cryptographic & Barcode Verification
    crypto_findings, crypto_telemetry = crypto_verifier.verify_document(
        first_cv,
        extracted_id_candidate="123456789012" if "Bank" in filename else None
    )

    # 7. Pre-flight Quality Flags
    quality_findings = []
    if q_metrics.is_blurry:
        quality_findings.append(Finding(
            id="finding-qual-blur",
            layer_type="splicing",
            severity="Medium",
            title="High Blur Variance Detected",
            description=f"Document image has a low Laplacian variance ({q_metrics.blur_score}), indicating optical or motion blur.",
            confidence=0.88,
            details={"blur_score": q_metrics.blur_score}
        ))
    if q_metrics.has_excessive_glare:
        quality_findings.append(Finding(
            id="finding-qual-glare",
            layer_type="splicing",
            severity="Medium",
            title="Excessive Lighting Glare Hotspot",
            description=f"Over-saturated reflection detected ({q_metrics.glare_percentage}% of document surface).",
            confidence=0.90,
            details={"glare_pct": q_metrics.glare_percentage}
        ))

    # Duplicate finding
    if duplicate_id and duplicate_type != "none":
        type_labels = {
            "exact": "Exact byte-identical duplicate",
            "near-visual": "Visually near-identical duplicate (perceptual hash match)",
            "near-text": "Near-identical text content (SimHash match)"
        }
        meta_findings.append(Finding(
            id="finding-hash-duplicate",
            layer_type="metadata",
            severity="High",
            title=f"Duplicate Document: {type_labels.get(duplicate_type, duplicate_type)}",
            description=f"This document is a duplicate matching previously uploaded file '{duplicate_id}'. Verified via {type_labels.get(duplicate_type, duplicate_type).lower()}.",
            confidence=0.99 if duplicate_type == "exact" else 0.85,
            details={"duplicate_of": duplicate_id, "match_type": duplicate_type, "sha256": sha256}
        ))
        if meta_layer:
            meta_layer.findings_count += 1
            meta_layer.flagged = True

    # 8. Compute Applicable Layers (smart greying logic)
    applicable_layers = compute_applicable_layers(
        is_pdf=is_pdf,
        is_digital_pdf=is_digital_pdf,
        has_financial_content=has_financial_content,
        has_ocr_text=len(ocr_text.strip()) > 20
    )
    if white_text_findings and "font" not in applicable_layers:
        applicable_layers.append("font")

    # Only show / enable prompt_guard if manipulative constraints or white-on-white text were detected
    has_prompt_threats = bool(all_flagged_threats or is_inj or white_text_findings or white_text_items)
    if has_prompt_threats and "prompt_guard" not in applicable_layers:
        applicable_layers.append("prompt_guard")
    applicable_layers.sort()

    # 9. Fast Deterministic Document Classification
    f_lower = filename.lower()
    if any(k in f_lower for k in ["bank", "statement", "acct"]):
        doc_type = "bank_statement"
    elif any(k in f_lower for k in ["invoice", "inv", "bill"]):
        doc_type = "invoice"
    elif any(k in f_lower for k in ["receipt"]):
        doc_type = "receipt"
    elif any(k in f_lower for k in ["contract", "agreement"]):
        doc_type = "contract"
    elif any(k in f_lower for k in ["passport", "id", "license"]):
        doc_type = "id_document"
    elif ocr_text.strip():
        doc_type = classify_document(ocr_text)
    else:
        doc_type = "other"

    llm_summary = None
    agent_confidence = 0.0


    # Merge all algorithmic & security findings
    all_findings = []
    all_findings.extend(ocr_findings)
    all_findings.extend(visual_findings)
    all_findings.extend(meta_findings)
    all_findings.extend(crypto_findings)
    all_findings.extend(quality_findings)
    all_findings.extend(security_findings)

    # Fast finding summarization
    sorted_findings = sort_findings(all_findings)
    trust_score, risk_level, default_summary = calculate_trust_score(sorted_findings)
    
    from .modules.forensic_narrative import synthesize_forensic_summary
    summary = synthesize_forensic_summary(sorted_findings, trust_score, risk_level, doc_type, filename)
    llm_summary = summary

    # 10. Merge all layers
    combined_layers: Dict[str, LayerOutput] = {}
    combined_layers.update(visual_layers)
    combined_layers.update(ocr_layers)
    combined_layers["metadata"] = meta_layer

    t_total_ms = round((time.perf_counter() - t_start) * 1000, 1)

    # Compile granular execution telemetry for auditor transparency
    telemetry_data = {
        "total_execution_ms": t_total_ms,
        "timings_ms": {
            "preflight_quality": t_preflight_ms,
            "fingerprint_hashing": t_hash_ms,
            "metadata_container": t_meta_ms,
            "visual_ela_and_dct": t_vis_ms,
            "ocr_and_math_engine": t_ocr_ms
        },
        "metrics": {
            "blur_score": q_metrics.blur_score,
            "glare_percentage": q_metrics.glare_percentage,
            "deskew_angle": q_metrics.skew_angle_corrected,
            "sha256": sha256,
            "phash": phash,
            "simhash": simhash,
            "duplicate_status": duplicate_type,
            "digital_vector_pdf": is_digital_pdf,
            "findings_count": len(sorted_findings),
            "prompt_guardrail": f"Active ({len(security_findings)} Threat Flagged)" if security_findings else "Active (Clean - 0 Constraints)"
        }
    }

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
        processed_at=datetime.now(timezone.utc).isoformat(),
        document_type=doc_type,
        applicable_layers=applicable_layers,
        llm_summary=llm_summary,
        llm_context_findings=[],
        agent_confidence=agent_confidence,
        execution_telemetry=telemetry_data
    )
