import os
import io
import base64
import cv2
import numpy as np
from PIL import Image
import pymupdf as fitz
from typing import Tuple, List, Dict, Any, Optional
from ..schemas import Finding, LayerOutput, BoundingBox

def render_all_document_pages(file_bytes: bytes, filename: str) -> List[Image.Image]:
    """Converts ALL pages of a PDF, image, or office document (.docx, .xlsx, .txt) into PIL RGB Images."""
    images = []
    ext = os.path.splitext(filename)[1].lower() if "." in filename else ""
    
    if ext == ".pdf":
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        for i in range(len(doc)):
            page = doc[i]
            pix = page.get_pixmap(dpi=160)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            images.append(img)
        doc.close()
        if images:
            return images

    if ext in [".docx", ".xlsx", ".xls", ".txt"]:
        from .threat_memory_bank import extract_any_document_text
        doc_text = extract_any_document_text(file_bytes, filename)
        # Render clean document preview page
        from PIL import ImageDraw
        width, height = 850, 1100
        img = Image.new("RGB", (width, height), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        # Top header accent banner
        draw.rectangle([0, 0, width, 56], fill=(241, 245, 249))
        draw.line([0, 56, width, 56], fill=(203, 213, 225), width=2)
        draw.text((32, 18), f"DOCUMENT PREVIEW: {filename}", fill=(30, 41, 59))
        
        # Draw text lines
        lines = doc_text.splitlines() if doc_text else ["[Empty Document]"]
        y = 80
        max_lines = 44
        for line in lines[:max_lines]:
            trimmed = line[:88] + ("..." if len(line) > 88 else "")
            draw.text((32, y), trimmed, fill=(51, 65, 85))
            y += 22
            if y > height - 40:
                break
        if len(lines) > max_lines:
            draw.text((32, height - 32), f"[+ {len(lines) - max_lines} more lines in document stream]", fill=(148, 163, 184))
        return [img]

    try:
        raw_img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        return [raw_img]
    except Exception:
        # Fallback text rendering if image open fails
        from .threat_memory_bank import extract_any_document_text
        doc_text = extract_any_document_text(file_bytes, filename)
        from PIL import ImageDraw
        img = Image.new("RGB", (850, 1100), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        draw.text((32, 32), f"FILE: {filename}\n\n{doc_text[:1200]}", fill=(30, 41, 59))
        return [img]

def analyze_noise_consistency(image_bgr: np.ndarray) -> Dict[str, Any]:
    """Measures high-frequency noise variance to detect synthetic or artificially smoothed regions."""
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    noise_residual = cv2.absdiff(gray, blurred)

    mean_noise = float(np.mean(noise_residual))
    std_noise = float(np.std(noise_residual))
    return {
        "noise_mean": round(mean_noise, 2),
        "noise_std_dev": round(std_noise, 2),
        "is_artificially_smooth": std_noise < 1.5
    }

def perform_ela(
    pil_img: Image.Image, 
    quality: int = 90, 
    multiplier: float = 20.0
) -> Tuple[np.ndarray, str, List[BoundingBox], float]:
    """
    Algorithmic Error Level Analysis (ELA).
    Measures local JPEG compression difference distribution against the global image mean.
    """
    orig_cv = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    h, w, _ = orig_cv.shape

    # Re-compress in memory
    _, encoded_jpg = cv2.imencode('.jpg', orig_cv, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    resaved_cv = cv2.imdecode(encoded_jpg, cv2.IMREAD_COLOR)

    # Calculate absolute difference
    diff_cv = cv2.absdiff(orig_cv, resaved_cv).astype(np.float32)
    amplified = np.clip(diff_cv * multiplier, 0, 255).astype(np.uint8)
    gray_diff = cv2.cvtColor(amplified, cv2.COLOR_BGR2GRAY)
    
    # Statistical thresholding based on global distribution: Mean + 2.5 * StdDev
    mean_val = np.mean(gray_diff)
    std_val = np.std(gray_diff)
    dynamic_threshold = max(30.0, min(140.0, mean_val + 2.5 * std_val))

    # Generate Heatmap with alpha glow
    heatmap_colored = cv2.applyColorMap(gray_diff, cv2.COLORMAP_HOT)
    alpha_mask = cv2.threshold(gray_diff, int(dynamic_threshold * 0.7), 255, cv2.THRESH_BINARY)[1]
    b, g, r = cv2.split(heatmap_colored)
    rgba_heatmap = cv2.merge([r, g, b, alpha_mask])
    
    heatmap_pil = Image.fromarray(rgba_heatmap)
    buf = io.BytesIO()
    heatmap_pil.save(buf, format="PNG")
    heatmap_b64 = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

    boxes: List[BoundingBox] = []
    _, binary_mask = cv2.threshold(gray_diff, int(dynamic_threshold), 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    cleaned_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel)
    
    contours, _ = cv2.findContours(cleaned_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    total_tampered_pixels = 0

    for i, cnt in enumerate(contours):
        area = cv2.contourArea(cnt)
        if area > (w * h * 0.0015):
            bx, by, bw, bh = cv2.boundingRect(cnt)
            total_tampered_pixels += area
            margin = 6
            bx_p = max(0, bx - margin)
            by_p = max(0, by - margin)
            bw_p = min(w - bx_p, bw + margin * 2)
            bh_p = min(h - by_p, bh + margin * 2)
            
            boxes.append(BoundingBox(
                id=f"box-splicing-ela-{i}",
                x=round((bx_p / w) * 100, 2),
                y=round((by_p / h) * 100, 2),
                width=round((bw_p / w) * 100, 2),
                height=round((bh_p / h) * 100, 2),
                label="ELA Splicing Anomaly",
                layer_type="splicing",
                tag="SPLICED",
                color="#F97316",
                target_finding_id="finding-splicing-ela"
            ))

    total_pixels = max(1, w * h)
    anomaly_ratio = round(float((total_tampered_pixels / total_pixels) * 100.0), 2)
    return gray_diff, heatmap_b64, boxes, anomaly_ratio

def detect_visual_copy_paste_clones(img_cv: np.ndarray) -> Tuple[List[Finding], List[BoundingBox]]:
    """
    DCT Block-Matching Copy-Move Forgery Detection.

    Algorithm (based on Christlein et al., CVPR 2012 / Popescu & Farid 2004):
      1. Convert image to grayscale, resize to manageable size
      2. Slide overlapping 16x16 blocks across the image (stride=8)
      3. For each block: compute 2D DCT, extract 25 low-frequency coefficients as feature vector
      4. Lexicographically sort all (feature_vector, block_origin) pairs
      5. Compare adjacent pairs in sorted list using L2 distance threshold
      6. Accumulate shift vectors (dx, dy) for matching block pairs
      7. If any shift vector is shared by >= MIN_CLUSTER blocks, it is a confirmed copy-move region
      8. Reconstruct source and destination bounding boxes from clustered block origins

    Advantages over ORB:
      - More robust to JPEG re-compression noise (DCT works in frequency domain)
      - Canonical forensic standard for document copy-move detection
      - Detects exact copies even with mild JPEG quantization differences
    """
    h, w, _ = img_cv.shape
    findings: List[Finding] = []
    boxes: List[BoundingBox] = []

    # --- Tunable parameters ---
    BLOCK_SIZE = 16
    STRIDE = 8
    DCT_COEFFS = 25      # Low-frequency DCT coefficients to keep
    L2_THRESHOLD = 80.0  # Max L2 distance for a match (lower = more strict)
    MIN_CLUSTER = 5      # Minimum matching blocks to confirm a copy-move region
    MIN_SPATIAL_DIST = max(BLOCK_SIZE * 2, 32)  # Source and dest must be spatially separated
    MAX_IMG_DIM = 600    # Resize for performance while preserving relative positions

    # Resize for performance
    scale = min(1.0, MAX_IMG_DIM / max(h, w))
    rw, rh = max(1, int(w * scale)), max(1, int(h * scale))
    small = cv2.resize(img_cv, (rw, rh))
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY).astype(np.float32)

    sh, sw = gray.shape
    if sh < BLOCK_SIZE * 2 or sw < BLOCK_SIZE * 2:
        return findings, boxes

    # Build feature vectors for all blocks
    feature_list = []  # List of (feature_vector, (origin_y, origin_x))
    for y in range(0, sh - BLOCK_SIZE + 1, STRIDE):
        for x in range(0, sw - BLOCK_SIZE + 1, STRIDE):
            block = gray[y:y+BLOCK_SIZE, x:x+BLOCK_SIZE]
            from scipy.fft import dctn
            dct_block = dctn(block, norm='ortho')
            # Extract DCT_COEFFS low-frequency zigzag coefficients
            coeffs = []
            for i in range(BLOCK_SIZE):
                for j in range(BLOCK_SIZE - i):
                    coeffs.append(dct_block[i, j])
                    if len(coeffs) >= DCT_COEFFS:
                        break
                if len(coeffs) >= DCT_COEFFS:
                    break
            feature_list.append((np.array(coeffs[:DCT_COEFFS], dtype=np.float32), (y, x)))

    if len(feature_list) < 4:
        return findings, boxes

    # Lexicographic sort
    feature_list.sort(key=lambda item: item[0].tolist())

    # Find candidate matching pairs (adjacent in sorted list)
    shift_map: Dict[Tuple[int, int], List[Tuple[Tuple[int,int], Tuple[int,int]]]] = {}
    for idx in range(len(feature_list) - 1):
        fv1, pos1 = feature_list[idx]
        fv2, pos2 = feature_list[idx + 1]

        l2 = float(np.linalg.norm(fv1 - fv2))
        if l2 > L2_THRESHOLD:
            continue

        y1, x1 = pos1
        y2, x2 = pos2
        spatial_dist = np.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
        if spatial_dist < MIN_SPATIAL_DIST:
            continue

        # Round shift vector to nearest stride step for clustering
        shift = (round((y2 - y1) / STRIDE) * STRIDE, round((x2 - x1) / STRIDE) * STRIDE)
        if shift not in shift_map:
            shift_map[shift] = []
        shift_map[shift].append((pos1, pos2))

    # Find the dominant shift vector with enough matches
    best_shift = None
    best_pairs = []
    for shift, pairs in shift_map.items():
        if len(pairs) >= MIN_CLUSTER and len(pairs) > len(best_pairs):
            best_shift = shift
            best_pairs = pairs

    if not best_pairs:
        return findings, boxes

    # Reconstruct bounding boxes from clustered origins
    src_ys = [p[0][0] for p in best_pairs]
    src_xs = [p[0][1] for p in best_pairs]
    dst_ys = [p[1][0] for p in best_pairs]
    dst_xs = [p[1][1] for p in best_pairs]

    # Scale coords back to original image dimensions
    inv_scale = 1.0 / scale if scale > 0 else 1.0

    def make_box(ys, xs, box_id, label, tag, finding_id):
        oy = int(min(ys) * inv_scale)
        ox = int(min(xs) * inv_scale)
        ey = int((max(ys) + BLOCK_SIZE) * inv_scale)
        ex = int((max(xs) + BLOCK_SIZE) * inv_scale)
        bw = max(1, ex - ox)
        bh = max(1, ey - oy)
        return BoundingBox(
            id=box_id,
            x=round((ox / w) * 100, 2),
            y=round((oy / h) * 100, 2),
            width=round((bw / w) * 100, 2),
            height=round((bh / h) * 100, 2),
            label=label,
            layer_type="copy_paste",
            tag=tag,
            color="#06B6D4",
            target_finding_id=finding_id
        )

    b1 = make_box(src_ys, src_xs, "box-cp-dct-src", "Copy-Move Source", "COPY-PASTED", "finding-cp-dct")
    b2 = make_box(dst_ys, dst_xs, "box-cp-dct-dst", "Copy-Move Destination", "COPY-PASTED", "finding-cp-dct")
    boxes = [b1, b2]

    findings.append(Finding(
        id="finding-cp-dct",
        layer_type="copy_paste",
        severity="High",
        title="Copy-Move Forgery Detected (DCT Block Matching)",
        description=(
            f"DCT frequency-domain block matching identified {len(best_pairs)} matching "
            f"block pairs with a consistent shift vector ({best_shift}), confirming a "
            f"copy-move operation within this document."
        ),
        confidence=0.95,
        bounding_boxes=boxes,
        details={
            "algorithm": "DCT block-match (Christlein 2012)",
            "matched_blocks": len(best_pairs),
            "shift_vector": list(best_shift) if best_shift else None,
            "l2_threshold": L2_THRESHOLD
        }
    ))

    return findings, boxes

def detect_splicing_and_markups(img_cv: np.ndarray) -> Tuple[List[Finding], List[BoundingBox]]:
    """
    Algorithmic Splicing & Artificial Markup Detection:
    - High-luminance or sharp rectangular boundary inserts (spliced logos/patches).
    - High-contrast synthetic dark strokes / digital pen doodles.
    """
    h, w, _ = img_cv.shape
    findings: List[Finding] = []
    boxes: List[BoundingBox] = []

    # 1. Spliced High-Contrast Box / Logo Insert (e.g. white sticker or logo box inserted on clothing/background)
    spliced_mask = (img_cv[:, :, 0] > 230) & (img_cv[:, :, 1] > 230) & (img_cv[:, :, 2] > 230)
    kernel_s = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    closed_splice = cv2.morphologyEx(spliced_mask.astype(np.uint8) * 255, cv2.MORPH_CLOSE, kernel_s)
    s_contours, _ = cv2.findContours(closed_splice, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for i, c in enumerate(s_contours):
        area = cv2.contourArea(c)
        if (w * h * 0.0015) < area < (w * h * 0.08):
            bx, by, bw, bh = cv2.boundingRect(c)
            aspect = bw / float(bh) if bh > 0 else 0
            if 0.6 < aspect < 1.8:
                bx_pad = max(0, bx - 3)
                by_pad = max(0, by - 3)
                bw_pad = min(w - bx_pad, bw + 6)
                bh_pad = min(h - by_pad, bh + 6)

                patch = img_cv[by_pad:by_pad+bh_pad, bx_pad:bx_pad+bw_pad]
                lap = cv2.Laplacian(cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
                if lap > 80:
                    b = BoundingBox(
                        id=f"box-splicing-patch-{i}",
                        x=round((bx_pad / w) * 100, 2),
                        y=round((by_pad / h) * 100, 2),
                        width=round((bw_pad / w) * 100, 2),
                        height=round((bh_pad / h) * 100, 2),
                        label="Spliced Graphic / Logo Insert",
                        layer_type="splicing",
                        tag="SPLICED",
                        color="#F97316",
                        target_finding_id=f"finding-splice-patch-{i}"
                    )
                    boxes.append(b)
                    findings.append(Finding(
                        id=f"finding-splice-patch-{i}",
                        layer_type="splicing",
                        severity="Critical",
                        title="Spliced Graphic Insert Detected",
                        description=f"Inserted/spliced graphic patch detected at ({b.x}%, {b.y}%) with sharp boundary discontinuities against the base background.",
                        confidence=0.97,
                        bounding_boxes=[b],
                        details={"area_px": area, "gradient_laplacian": round(lap, 1)}
                    ))

    # 2. Doodled / Scribbled Marking Detection (pure dark strokes in outer margins)
    dark_mask = (img_cv[:, :, 0] < 35) & (img_cv[:, :, 1] < 35) & (img_cv[:, :, 2] < 35)
    kernel_d = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closed_dark = cv2.morphologyEx(dark_mask.astype(np.uint8) * 255, cv2.MORPH_CLOSE, kernel_d)
    d_contours, _ = cv2.findContours(closed_dark, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for i, c in enumerate(d_contours):
        area = cv2.contourArea(c)
        if (w * h * 0.0003) < area < (w * h * 0.02):
            bx, by, bw, bh = cv2.boundingRect(c)
            patch = img_cv[by:by+bh, bx:bx+bw]
            patch_gray = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY)
            lap = cv2.Laplacian(patch_gray, cv2.CV_64F).var()
            dark_ratio = float(np.mean(patch_gray < 30))

            if lap > 120 and dark_ratio > 0.15 and (by < h * 0.28):
                bx_pad = max(0, bx - 4)
                by_pad = max(0, by - 4)
                bw_pad = min(w - bx_pad, bw + 8)
                bh_pad = min(h - by_pad, bh + 8)

                d_box = BoundingBox(
                    id=f"box-splicing-doodle-{i}",
                    x=round((bx_pad / w) * 100, 2),
                    y=round((by_pad / h) * 100, 2),
                    width=round((bw_pad / w) * 100, 2),
                    height=round((bh_pad / h) * 100, 2),
                    label="Doodled / Scribbled Markup",
                    layer_type="splicing",
                    tag="DOODLE",
                    color="#EF4444",
                    target_finding_id=f"finding-doodle-{i}"
                )
                boxes.append(d_box)
                findings.append(Finding(
                    id=f"finding-doodle-{i}",
                    layer_type="splicing",
                    severity="High",
                    title="Doodled / Artificial Pen Markup Detected",
                    description=f"Digital scribbled stroke detected with unnatural sharp dark lines at ({d_box.x}%, {d_box.y}%).",
                    confidence=0.95,
                    bounding_boxes=[d_box],
                    details={"stroke_area_px": area}
                ))

    return findings, boxes

def compare_with_reference_image(
    current_cv: np.ndarray, 
    ref_cv: np.ndarray, 
    ref_filename: str
) -> Tuple[List[Finding], List[BoundingBox]]:
    """
    Algorithmic Differential Pixel Comparison against a companion image in the same case.
    """
    findings: List[Finding] = []
    diff_boxes: List[BoundingBox] = []

    h, w, _ = current_cv.shape
    ref_resized = cv2.resize(ref_cv, (w, h))

    diff = cv2.absdiff(current_cv, ref_resized)
    gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray_diff, 20, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    cleaned = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    
    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for i, c in enumerate(contours):
        area = cv2.contourArea(c)
        if area > 80:
            bx, by, bw, bh = cv2.boundingRect(c)
            bx_p = max(0, bx - 6)
            by_p = max(0, by - 6)
            bw_p = min(w - bx_p, bw + 12)
            bh_p = min(h - by_p, bh + 12)

            box = BoundingBox(
                id=f"box-cross-diff-{i}",
                x=round((bx_p / w) * 100, 2),
                y=round((by_p / h) * 100, 2),
                width=round((bw_p / w) * 100, 2),
                height=round((bh_p / h) * 100, 2),
                label="Differential Alteration",
                layer_type="cross_reference",
                tag="ALTERATION",
                color="#3B82F6",
                target_finding_id=f"finding-diff-{i}"
            )
            diff_boxes.append(box)

            findings.append(Finding(
                id=f"finding-diff-{i}",
                layer_type="cross_reference",
                severity="Critical",
                title=f"Cross-Reference: Altered Area ({box.x}%, {box.y}%)",
                description=f"Differential pixel comparison against reference file '{ref_filename}' identified {round(area)} altered pixels.",
                confidence=0.99,
                source_doc=ref_filename,
                match_percentage=98,
                bounding_boxes=[box]
            ))

    return findings, diff_boxes

def analyze_visual_forensics(
    pil_img: Image.Image,
    reference_img: Optional[Image.Image] = None,
    ref_filename: Optional[str] = None
) -> Tuple[Dict[str, LayerOutput], List[Finding]]:
    """
    Main Visual Forensics Engine:
    - Error Level Analysis (Splicing Check)
    - Patch & Doodle Boundary Analysis (Splicing Check)
    - Intra-document Keypoint Clustering (Copy-Paste Check)
    - Inter-document Differential Analysis (Cross-Reference Check)
    """
    layers: Dict[str, LayerOutput] = {}
    findings: List[Finding] = []

    img_cv = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    # 1. Noise profile check
    noise_stats = analyze_noise_consistency(img_cv)
    if noise_stats["is_artificially_smooth"]:
        findings.append(Finding(
            id="finding-noise-synthetic",
            layer_type="splicing",
            severity="Low",
            title="Synthetic Flat Noise Profile",
            description=f"Standard camera/scanner noise variance is suppressed (std: {noise_stats['noise_std_dev']}), indicating artificial vector regeneration or aggressive smoothing.",
            confidence=0.85,
            details=noise_stats
        ))

    # 2. ELA (Splicing Check)
    _, heatmap_b64, ela_boxes, anomaly_ratio = perform_ela(pil_img)

    # 3. Patch & Doodle Boundaries (Splicing Check)
    splice_findings, patch_boxes = detect_splicing_and_markups(img_cv)
    findings.extend(splice_findings)

    all_splicing_boxes = []
    all_splicing_boxes.extend(patch_boxes)
    if not patch_boxes:
        all_splicing_boxes.extend(ela_boxes)

    # 4. Intra-Document Copy-Paste Clones (Copy-Paste Check)
    cp_findings, cp_boxes = detect_visual_copy_paste_clones(img_cv)
    findings.extend(cp_findings)

    # 5. Cross-Reference Delta Comparison
    cross_boxes = []
    if reference_img and ref_filename:
        ref_cv = cv2.cvtColor(np.array(reference_img), cv2.COLOR_RGB2BGR)
        ref_findings, cross_boxes = compare_with_reference_image(img_cv, ref_cv, ref_filename)
        findings.extend(ref_findings)

    is_splicing_flagged = len(all_splicing_boxes) > 0
    layers["splicing"] = LayerOutput(
        layer_id="splicing",
        name="Splicing Check",
        description="Compression error level analysis, spliced patches & doodled markups",
        score=22 if is_splicing_flagged else 98,
        flagged=is_splicing_flagged,
        findings_count=len([f for f in findings if f.layer_type == "splicing"]),
        heatmap_data_url=heatmap_b64,
        overlay_items=all_splicing_boxes
    )

    layers["copy_paste"] = LayerOutput(
        layer_id="copy_paste",
        name="Copy-Paste Check",
        description="Detects repeated content, duplicated patches, and cloned regions within the document",
        score=25 if cp_boxes else 98,
        flagged=bool(cp_boxes),
        findings_count=len(cp_boxes),
        overlay_items=cp_boxes
    )

    layers["cross_reference"] = LayerOutput(
        layer_id="cross_reference",
        name="Cross-Reference Check",
        description="Cross-document source matching and differential comparison",
        score=20 if cross_boxes else 100,
        flagged=bool(cross_boxes),
        findings_count=len(cross_boxes),
        overlay_items=cross_boxes
    )

    return layers, findings
