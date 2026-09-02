import io
import fitz  # PyMuPDF
from PIL import Image, ExifTags
from datetime import datetime
from typing import Tuple, List, Dict, Any
from ..schemas import Finding, LayerOutput, DocumentMetadata, BoundingBox

SUSPICIOUS_SOFTWARE_KEYWORDS = [
    "photoshop", "gimp", "canva", "illustrator", "inkscape", 
    "coreldraw", "paint.net", "sejda", "ilovepdf", "pdfescape", 
    "smallpdf", "pdf-xchange", "master pdf editor"
]

def parse_pdf_date(date_str: str) -> datetime | None:
    if not date_str:
        return None
    try:
        # Standard PDF date format: D:YYYYMMDDHHmmSSOHH'mm'
        clean = date_str.replace("D:", "").replace("'", "")
        clean = clean[:14]
        if len(clean) >= 8:
            return datetime.strptime(clean[:8], "%Y%m%d")
    except Exception:
        pass
    return None

def analyze_metadata(file_bytes: bytes, filename: str) -> Tuple[DocumentMetadata, List[Finding], LayerOutput]:
    findings: List[Finding] = []
    anomalies: List[str] = []
    raw_meta: Dict[str, Any] = {}
    page_count = 1
    producer = None
    creator = None
    c_date_str = None
    m_date_str = None
    is_pdf = filename.lower().endswith(".pdf")

    if is_pdf:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            page_count = len(doc)
            raw_meta = doc.metadata or {}
            producer = raw_meta.get("producer") or ""
            creator = raw_meta.get("creator") or ""
            c_date_str = raw_meta.get("creationDate") or ""
            m_date_str = raw_meta.get("modDate") or ""
            
            # 1. Check software tags
            combined_soft = f"{producer} {creator}".lower()
            for kw in SUSPICIOUS_SOFTWARE_KEYWORDS:
                if kw in combined_soft:
                    anom = f"Document modified using graphic editing software: '{kw.title()}'"
                    anomalies.append(anom)
                    findings.append(Finding(
                        id="finding-meta-soft",
                        layer_type="metadata",
                        severity="Medium",
                        title="Editing Software Signature Detected",
                        description=f"Metadata header contains references to manipulation software ({kw.title()}). Original bank/institution generated PDFs typically use specialized banking print spoolers.",
                        confidence=0.92,
                        details={"software": kw, "producer": producer, "creator": creator}
                    ))
                    break

            # 2. Check creation vs modification dates
            c_date = parse_pdf_date(c_date_str)
            m_date = parse_pdf_date(m_date_str)
            if c_date and m_date:
                if m_date < c_date:
                    anom = f"Temporal contradiction: Modification date ({m_date.strftime('%Y-%m-%d')}) precedes Creation date ({c_date.strftime('%Y-%m-%d')})"
                    anomalies.append(anom)
                    findings.append(Finding(
                        id="finding-meta-date",
                        layer_type="metadata",
                        severity="Low",
                        title="Metadata Timestamp Inconsistency",
                        description=anom,
                        confidence=0.88,
                        details={"creation_date": c_date_str, "mod_date": m_date_str}
                    ))

            # 3. Check for incremental updates / revision count
            if doc.is_repaired or doc.page_count < 1:
                anomalies.append("PDF structure contains repaired catalog or missing trailer dictionary")

            # Check font consistency in PDF metadata
            try:
                embedded_fonts = set()
                for p in doc:
                    for f in p.get_fonts():
                        embedded_fonts.add(f[3]) # font name
                raw_meta["embedded_fonts_count"] = len(embedded_fonts)
            except Exception:
                pass

            doc.close()
        except Exception as e:
            anomalies.append(f"PDF parsing warning: {str(e)}")
    else:
        # Image EXIF
        try:
            img = Image.open(io.BytesIO(file_bytes))
            exif = img.getexif()
            if exif:
                for k, v in exif.items():
                    tag = ExifTags.TAGS.get(k, str(k))
                    raw_meta[tag] = str(v)
            software = raw_meta.get("Software", "")
            if any(kw in software.lower() for kw in SUSPICIOUS_SOFTWARE_KEYWORDS):
                anom = f"Image metadata mentions image editor: '{software}'"
                anomalies.append(anom)
                findings.append(Finding(
                    id="finding-img-meta",
                    layer_type="metadata",
                    severity="Low",
                    title="Metadata Inconsistency",
                    description=anom,
                    confidence=0.85,
                    details={"software": software}
                ))
        except Exception as e:
            anomalies.append(f"Image EXIF reading failed: {str(e)}")

    has_anomalies = len(anomalies) > 0
    score = 100 - (len(findings) * 25)
    score = max(0, min(100, score))

    meta_obj = DocumentMetadata(
        filename=filename,
        filesize_bytes=len(file_bytes),
        mime_type="application/pdf" if is_pdf else "image/jpeg",
        page_count=page_count,
        creation_date=c_date_str,
        modification_date=m_date_str,
        producer=producer,
        creator=creator,
        has_anomalies=has_anomalies,
        anomalies=anomalies,
        raw_metadata=raw_meta
    )

    layer_output = LayerOutput(
        layer_id="metadata",
        name="Metadata Analysis",
        description="File & author metadata signatures and revision histories",
        score=score,
        flagged=has_anomalies,
        findings_count=len(findings),
        overlay_items=[]
    )

    return meta_obj, findings, layer_output
