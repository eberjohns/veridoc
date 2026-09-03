import re
import io
import cv2
import numpy as np
from PIL import Image
from typing import List, Dict, Tuple, Any, Optional
try:
    import pymupdf as fitz
except ImportError:
    import fitz  # PyMuPDF fallback

import pytesseract
from ..schemas import Finding, LayerOutput, BoundingBox, OcrAnalysis

_TESSERACT_AVAILABLE: Optional[bool] = None

def int_to_hex(color_int: int) -> str:
    """Converts PyMuPDF integer color to hex string like #000000 or #FFFFFF."""
    if color_int is None or color_int < 0:
        return "#000000"
    r = (color_int >> 16) & 255
    g = (color_int >> 8) & 255
    b = color_int & 255
    return f"#{r:02X}{g:02X}{b:02X}"

def is_tesseract_available() -> bool:
    """Checks whether the Tesseract OCR binary is accessible on the system."""
    global _TESSERACT_AVAILABLE
    if _TESSERACT_AVAILABLE is not None:
        return _TESSERACT_AVAILABLE
    try:
        ver = pytesseract.get_tesseract_version()
        _TESSERACT_AVAILABLE = bool(ver)
    except Exception:
        _TESSERACT_AVAILABLE = False
    return _TESSERACT_AVAILABLE


def parse_currency(text: str) -> Optional[float]:
    """Parses a currency string like '$ 5,164.39' or '12,430.00' into a float."""
    clean = re.sub(r"[^\d.]", "", text)
    try:
        return float(clean)
    except ValueError:
        return None


def find_exact_text_boxes(
    doc: fitz.Document, 
    phrase: str, 
    label: str, 
    layer_type: str, 
    target_finding_id: str,
    tag: Optional[str] = None,
    color: Optional[str] = None,
    pad_pct_x: float = 0.5,
    pad_pct_y: float = 0.5
) -> List[BoundingBox]:
    """Finds exact pixel-perfect bounding boxes for any phrase across all pages of a PDF."""
    boxes: List[BoundingBox] = []
    
    for page_idx, page in enumerate(doc):
        rx0 = page.rect.x0
        ry0 = page.rect.y0
        w = max(1.0, page.rect.width)
        h = max(1.0, page.rect.height)
        rects = page.search_for(phrase)
        
        for i, r in enumerate(rects):
            bx = max(0.0, (((r.x0 - rx0) / w) * 100.0) - pad_pct_x)
            by = max(0.0, (((r.y0 - ry0) / h) * 100.0) - pad_pct_y)
            bw = min(100.0 - bx, (((r.x1 - r.x0) / w) * 100.0) + (pad_pct_x * 2))
            bh = min(100.0 - by, (((r.y1 - r.y0) / h) * 100.0) + (pad_pct_y * 2))

            boxes.append(BoundingBox(
                id=f"box-{layer_type}-{page_idx + 1}-{i}",
                page=page_idx + 1,
                x=round(bx, 2),
                y=round(by, 2),
                width=round(bw, 2),
                height=round(bh, 2),
                label=label,
                layer_type=layer_type,
                tag=tag,
                color=color,
                target_finding_id=target_finding_id
            ))
            
    return boxes


def extract_ocr_from_image(img_cv: np.ndarray) -> Tuple[str, List[Tuple[str, float, float, float, float]]]:
    """
    Extracts text and word-level bounding boxes from an image using Tesseract OCR.
    Preprocesses with grayscale conversion, CLAHE contrast enhancement, and bilateral filtering.
    Returns:
        (full_text, list of (word, x_pct, y_pct, w_pct, h_pct))
    """
    if not is_tesseract_available():
        return "", []

    try:
        h, w = img_cv.shape[:2]
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY) if len(img_cv.shape) == 3 else img_cv
        
        # Preprocessing: CLAHE + gentle blur
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        filtered = cv2.bilateralFilter(enhanced, 5, 50, 50)

        # Extract data with bounding boxes
        data = pytesseract.image_to_data(filtered, output_type=pytesseract.Output.DICT)
        full_text = pytesseract.image_to_string(filtered).strip()

        words: List[Tuple[str, float, float, float, float]] = []
        n_boxes = len(data.get("text", []))

        for i in range(n_boxes):
            word_str = data["text"][i].strip()
            conf = int(data["conf"][i])
            if word_str and conf > 30:
                bx = (data["left"][i] / w) * 100.0
                by = (data["top"][i] / h) * 100.0
                bw = (data["width"][i] / w) * 100.0
                bh = (data["height"][i] / h) * 100.0
                words.append((word_str, bx, by, bw, bh))

        return full_text, words
    except Exception as e:
        print("Tesseract OCR extraction failed:", e)
        return "", []


def analyze_ocr_and_semantics(
    file_bytes: bytes,
    filename: str
) -> Tuple[Dict[str, LayerOutput], List[Finding], OcrAnalysis]:
    """
    Comprehensive OCR, Semantic Arithmetic, Typography, and Font Forensic Analyzer.
    Extracts text, builds font distribution maps, flags typeface splices, and checks ledger balance mathematics.
    """
    layers: Dict[str, LayerOutput] = {}
    findings: List[Finding] = []
    is_pdf = filename.lower().endswith(".pdf")

    math_boxes: List[BoundingBox] = []
    copy_paste_boxes: List[BoundingBox] = []
    font_boxes: List[BoundingBox] = []

    full_text = ""
    all_lines: List[Tuple[str, int]] = []
    engine_used = "PyMuPDF Vector Span Parser" if is_pdf else "Tesseract OCR 5.0"
    
    font_stats: Dict[str, Dict[str, Any]] = {}
    font_anomalies: List[str] = []

    if is_pdf:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page_idx, page in enumerate(doc):
                text = page.get_text("text")
                for line in text.split("\n"):
                    clean_line = line.strip()
                    if clean_line:
                        all_lines.append((clean_line, page_idx + 1))

            full_text = "\n".join([l[0] for l in all_lines])

            # If PDF has no digital text (scanned PDF), try Tesseract if available
            if not full_text.strip() and is_tesseract_available():
                engine_used = "Tesseract OCR 5.0 (Optical Scan)"
                for page_idx, page in enumerate(doc):
                    pix = page.get_pixmap(dpi=150)
                    img_np = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
                    if pix.n == 4:
                        img_np = cv2.cvtColor(img_np, cv2.COLOR_RGBA2BGR)
                    elif pix.n == 3:
                        img_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
                    ocr_page_text, _ = extract_ocr_from_image(img_np)
                    for line in ocr_page_text.split("\n"):
                        clean_line = line.strip()
                        if clean_line:
                            all_lines.append((clean_line, page_idx + 1))
                full_text = "\n".join([l[0] for l in all_lines])

            # --- 1. Dynamic Financial Arithmetic & Ledger Reconciliation Engine ---
            currencies = re.findall(r"\$\s*([\d,]+\.\d{2})", full_text)
            curr_match = re.search(r"(?:current|ending|closing)\s+balance[^\d\n]*\n?[^\d\n]*([\d,]+\.\d{2})", full_text, re.IGNORECASE)

            if len(currencies) >= 4 and curr_match:
                stated_ending = parse_currency(curr_match.group(1)) or 0.0
                last_running_balance = parse_currency(currencies[-2]) or 0.0

                if abs(last_running_balance - stated_ending) > 0.01:
                    raw_curr_str = curr_match.group(1)
                    found_boxes = find_exact_text_boxes(
                        doc, 
                        raw_curr_str, 
                        label="Ending Balance Math Error", 
                        layer_type="math",
                        target_finding_id="finding-math-calc",
                        tag="MATH-ERROR",
                        color="#EF4444",
                        pad_pct_x=0.8,
                        pad_pct_y=0.6
                    )
                    if found_boxes:
                        math_boxes.extend(found_boxes)
                        delta = round(stated_ending - last_running_balance, 2)
                        delta_str = f"+${delta:.2f}" if delta > 0 else f"-${abs(delta):.2f}"
                        findings.append(Finding(
                            id="finding-math-calc",
                            layer_type="math",
                            severity="High",
                            title="Math Error: Ending Balance Discrepancy",
                            description=f"Printed ending balance (${stated_ending:,.2f}) does not match cumulative transaction ledger balance (${last_running_balance:,.2f}). Discrepancy: {delta_str}.",
                            expected_value=f"${last_running_balance:,.2f}",
                            found_value=f"${stated_ending:,.2f}",
                            confidence=0.99,
                            bounding_boxes=found_boxes,
                            details={
                                "ledger_closing_balance": f"${last_running_balance:,.2f}",
                                "stated_ending_balance": f"${stated_ending:,.2f}",
                                "discrepancy": delta_str
                            }
                        ))

            # --- 2. Dynamic Text Repetition & Copy-Paste Detection ---
            line_counts: Dict[str, List[int]] = {}
            for line_str, p_num in all_lines:
                words = line_str.split()
                if len(words) >= 4 and not line_str.lower().startswith("page "):
                    line_counts.setdefault(line_str, []).append(p_num)

            for dup_text, p_list in line_counts.items():
                if len(p_list) >= 2:
                    dup_boxes = find_exact_text_boxes(
                        doc,
                        dup_text,
                        label="Duplicated Text Block",
                        layer_type="copy_paste",
                        target_finding_id=f"finding-cp-{abs(hash(dup_text)) % 10000}",
                        tag="COPY-PASTED",
                        color="#06B6D4",
                        pad_pct_x=1.0,
                        pad_pct_y=0.4
                    )
                    if len(dup_boxes) >= 2:
                        copy_paste_boxes.extend(dup_boxes)
                        findings.append(Finding(
                            id=f"finding-cp-{abs(hash(dup_text)) % 10000}",
                            layer_type="copy_paste",
                            severity="High",
                            title="Copy-Paste Check: Repeated Table Row / Text Block",
                            description=f"Duplicate content block repeated {len(dup_boxes)} times: '{dup_text[:60]}...'.",
                            confidence=0.95,
                            bounding_boxes=dup_boxes,
                            details={"repetition_count": len(dup_boxes), "content": dup_text}
                        ))

            # --- 3. Dynamic Font & Typography Extraction & Anomaly Detection ---
            for page_idx, page in enumerate(doc):
                try:
                    font_spans = []
                    page_dict = page.get_text("dict")
                    for b in page_dict.get("blocks", []):
                        for l in b.get("lines", []):
                            for s in l.get("spans", []):
                                font_spans.append(s)

                    if font_spans:
                        for s in font_spans:
                            fname = s.get("font", "Standard-Font")
                            fsize = round(float(s.get("size", 10.0)), 1)
                            fcolor = int_to_hex(s.get("color", 0))
                            stext = s.get("text", "")
                            
                            key = f"{fname}_{fsize}_{fcolor}"
                            if key not in font_stats:
                                font_stats[key] = {
                                    "name": fname,
                                    "size": fsize,
                                    "color_hex": fcolor,
                                    "char_count": 0
                                }
                            font_stats[key]["char_count"] += len(stext)

                        # Check for isolated numeric font mismatches
                        font_names = [s.get("font", "") for s in font_spans]
                        most_common_font = max(set(font_names), key=font_names.count)
                        
                        for s in font_spans:
                            stext = s.get("text", "").strip()
                            sfont = s.get("font", "")
                            if re.search(r"\d{1,3}(,\d{3})*\.\d{2}", stext) and sfont != most_common_font and len(font_spans) > 20:
                                sx0, sy0, sx1, sy1 = s.get("bbox")
                                rx0 = page.rect.x0
                                ry0 = page.rect.y0
                                w, h = max(1.0, page.rect.width), max(1.0, page.rect.height)
                                
                                bx = max(0.0, ((sx0 - rx0 - 2) / w) * 100.0)
                                by = max(0.0, ((sy0 - ry0 - 2) / h) * 100.0)
                                bw = min(100.0 - bx, ((sx1 - sx0 + 4) / w) * 100.0)
                                bh = min(100.0 - by, ((sy1 - sy0 + 4) / h) * 100.0)

                                f_box = BoundingBox(
                                    id=f"box-font-{len(font_boxes)}",
                                    page=page_idx + 1,
                                    x=round(bx, 2),
                                    y=round(by, 2),
                                    width=round(bw, 2),
                                    height=round(bh, 2),
                                    label="Typography / Font Outlier",
                                    layer_type="font",
                                    tag="FONT-MISMATCH",
                                    color="#EC4899",
                                    target_finding_id=f"finding-font-{len(font_boxes)}"
                                )
                                font_boxes.append(f_box)
                                font_anomaly_msg = f"Isolated number '{stext}' formatted in '{sfont}' differing from primary document font '{most_common_font}'."
                                font_anomalies.append(font_anomaly_msg)
                                findings.append(Finding(
                                    id=f"finding-font-{len(font_boxes)}",
                                    layer_type="font",
                                    severity="Low",
                                    title="Font Mismatch: Typeface Discrepancy",
                                    description=font_anomaly_msg,
                                    confidence=0.88,
                                    bounding_boxes=[f_box],
                                    details={"detected_font": sfont, "base_font": most_common_font}
                                ))
                                break
                except Exception as e:
                    print("Font parsing warning on page:", e)

            doc.close()
        except Exception as e:
            print("Dynamic OCR parsing warning:", e)
    else:
        # Non-PDF Image file OCR via Tesseract
        engine_used = "Tesseract OCR 5.0 (Optical Scan)"
        if is_tesseract_available():
            try:
                pil_img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
                img_cv = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
                ocr_text, words = extract_ocr_from_image(img_cv)
                full_text = ocr_text
                all_lines = [(l.strip(), 1) for l in full_text.split("\n") if l.strip()]

                # Image arithmetic check
                currencies = re.findall(r"\$\s*([\d,]+\.\d{2})", full_text)
                curr_match = re.search(r"(?:current|ending|closing|total)\s+balance[^\d\n]*\n?[^\d\n]*([\d,]+\.\d{2})", full_text, re.IGNORECASE)
                if len(currencies) >= 4 and curr_match:
                    stated_ending = parse_currency(curr_match.group(1)) or 0.0
                    last_running_balance = parse_currency(currencies[-2]) or 0.0
                    if abs(last_running_balance - stated_ending) > 0.01:
                        target_word = curr_match.group(1)
                        for word, wx, wy, ww, wh in words:
                            if target_word in word:
                                m_box = BoundingBox(
                                    id="box-math-img-0",
                                    x=wx,
                                    y=wy,
                                    width=ww,
                                    height=wh,
                                    label="Ending Balance Math Error",
                                    layer_type="math",
                                    tag="MATH-ERROR",
                                    color="#EF4444",
                                    target_finding_id="finding-math-calc-img"
                                )
                                math_boxes.append(m_box)
                                break
                        delta = round(stated_ending - last_running_balance, 2)
                        delta_str = f"+${delta:.2f}" if delta > 0 else f"-${abs(delta):.2f}"
                        findings.append(Finding(
                            id="finding-math-calc-img",
                            layer_type="math",
                            severity="High",
                            title="Math Error: Balance Discrepancy",
                            description=f"Printed balance (${stated_ending:,.2f}) does not match ledger balance (${last_running_balance:,.2f}). Discrepancy: {delta_str}.",
                            expected_value=f"${last_running_balance:,.2f}",
                            found_value=f"${stated_ending:,.2f}",
                            confidence=0.92,
                            bounding_boxes=math_boxes,
                            details={"discrepancy": delta_str}
                        ))
            except Exception as e:
                print("Image OCR warning:", e)

    # Format detected fonts list and find dominant typeface
    detected_fonts_list = list(font_stats.values())
    detected_fonts_list.sort(key=lambda x: x["char_count"], reverse=True)
    
    total_chars = sum(f["char_count"] for f in detected_fonts_list) or len(full_text)
    dominant_font = detected_fonts_list[0]["name"] if detected_fonts_list else "Standard OCR Font"
    
    for idx, f in enumerate(detected_fonts_list):
        f["is_dominant"] = (idx == 0)
        pct = (f["char_count"] / max(1, total_chars)) * 100.0
        f["usage_percentage"] = round(pct, 1)
        f["is_outlier"] = (pct < 4.0 and not f["is_dominant"])

    ocr_analysis_obj = OcrAnalysis(
        engine_used=engine_used,
        total_characters=len(full_text),
        total_words=len(full_text.split()),
        total_lines=len(all_lines),
        dominant_font=dominant_font,
        detected_fonts=detected_fonts_list,
        font_anomalies=font_anomalies,
        full_text=full_text,
        lines_preview=[l[0] for l in all_lines[:100]]
    )

    layers["math"] = LayerOutput(
        layer_id="math",
        name="Math Check",
        description="Calculations & arithmetic consistency in financial tables",
        score=15 if math_boxes else 100,
        flagged=bool(math_boxes),
        findings_count=len(math_boxes),
        overlay_items=math_boxes
    )

    layers["copy_paste"] = LayerOutput(
        layer_id="copy_paste",
        name="Copy-Paste Check",
        description="Detects repeated content, duplicated rows, and cloned blocks",
        score=25 if copy_paste_boxes else 100,
        flagged=bool(copy_paste_boxes),
        findings_count=len(copy_paste_boxes),
        overlay_items=copy_paste_boxes
    )

    layers["font"] = LayerOutput(
        layer_id="font",
        name="Font Mismatch Check",
        description="Inconsistent fonts, kerning, weight, and baseline styling",
        score=70 if font_boxes else 100,
        flagged=bool(font_boxes),
        findings_count=len(font_boxes),
        overlay_items=font_boxes
    )

    return layers, findings, ocr_analysis_obj
