import io
import re
import fitz  # PyMuPDF
from PIL import Image, ExifTags
from datetime import datetime
from typing import Tuple, List, Dict, Any
from ..schemas import Finding, LayerOutput, DocumentMetadata, BoundingBox

FLAGGED_SOFTWARE_PATTERNS = [
    r"photoshop", r"gimp", r"canva", r"illustrator", r"paint\.net",
    r"coreldraw", r"inkscape", r"acrobat\s+distiller", r"ilovepdf",
    r"smallpdf", r"sejda", r"pdfescape", r"pdf-xchange", r"master\s+pdf\s+editor",
    r"snapseed", r"lightroom", r"picsart", r"pixlr", r"vsco", r"meitu"
]

SOFTWARE_REGEXES = [re.compile(p, re.IGNORECASE) for p in FLAGGED_SOFTWARE_PATTERNS]

def parse_pdf_date(date_str: str) -> datetime | None:
    if not date_str:
        return None
    try:
        clean = date_str.replace("D:", "").replace("'", "").replace("+", "").replace("-", "")
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
    revision_count = 1
    has_incremental_updates = False

    if is_pdf:
        try:
            eof_count = len(re.findall(b"%%EOF", file_bytes))
            revision_count = max(1, eof_count)
            if revision_count > 1:
                has_incremental_updates = True
                anom = f"Incremental revisions present: PDF was saved/appended {revision_count} times after initial creation."
                anomalies.append(anom)
                findings.append(Finding(
                    id="finding-meta-eof",
                    layer_type="metadata",
                    severity="Medium",
                    title="Unflattened Incremental Saves Detected",
                    description=anom,
                    confidence=0.94,
                    details={"revision_count": revision_count}
                ))

            doc = fitz.open(stream=file_bytes, filetype="pdf")
            page_count = len(doc)
            raw_meta = doc.metadata or {}
            producer = raw_meta.get("producer") or ""
            creator = raw_meta.get("creator") or ""
            c_date_str = raw_meta.get("creationDate") or ""
            m_date_str = raw_meta.get("modDate") or ""
            
            combined_soft = f"{producer} {creator}".lower()
            for r in SOFTWARE_REGEXES:
                match = r.search(combined_soft)
                if match:
                    soft_name = match.group(0).title()
                    anom = f"Document modified using graphic editing software: '{soft_name}'"
                    anomalies.append(anom)
                    findings.append(Finding(
                        id="finding-meta-soft",
                        layer_type="metadata",
                        severity="Medium",
                        title="Editing Software Signature Detected",
                        description=f"Metadata header contains references to manipulation software ({soft_name}). Standard financial and institution documents use automated backend print spoolers.",
                        confidence=0.95,
                        details={"software": soft_name, "producer": producer, "creator": creator}
                    ))
                    break

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
                        confidence=0.90,
                        details={"creation_date": c_date_str, "mod_date": m_date_str}
                    ))

            try:
                embedded_fonts = set()
                for p in doc:
                    for f in p.get_fonts():
                        embedded_fonts.add(f[3])
                raw_meta["embedded_fonts_count"] = len(embedded_fonts)
                
                if page_count == 1 and len(embedded_fonts) > 6:
                    anom = f"High font diversity on standardized document ({len(embedded_fonts)} distinct font typefaces embedded)."
                    anomalies.append(anom)
                    findings.append(Finding(
                        id="finding-meta-font-diversity",
                        layer_type="font",
                        severity="Low",
                        title="Unusual Font Density / Layering",
                        description=anom,
                        confidence=0.82,
                        details={"embedded_fonts_count": len(embedded_fonts)}
                    ))
            except Exception:
                pass

            doc.close()
        except Exception as e:
            anomalies.append(f"PDF parsing warning: {str(e)}")
    else:
        # Comprehensive Image EXIF & Sub-IFD Parsing
        try:
            img = Image.open(io.BytesIO(file_bytes))
            raw_meta["dimensions"] = f"{img.width}x{img.height}"
            raw_meta["format"] = img.format
            raw_meta["mode"] = img.mode

            exif = img.getexif()
            if exif:
                for k, v in exif.items():
                    tag = ExifTags.TAGS.get(k, str(k))
                    raw_meta[tag] = str(v)
                
                # Check EXIF IFD sub-dictionaries
                try:
                    exif_ifd = exif.get_ifd(ExifTags.IFD.Exif)
                    if exif_ifd:
                        for k, v in exif_ifd.items():
                            tag = ExifTags.TAGS.get(k, str(k))
                            raw_meta[f"EXIF_{tag}"] = str(v)
                except Exception:
                    pass

            software = raw_meta.get("Software") or raw_meta.get("EXIF_Software") or ""
            producer = raw_meta.get("Make", "")
            creator = raw_meta.get("Model", "")
            c_date_str = raw_meta.get("DateTimeOriginal") or raw_meta.get("EXIF_DateTimeOriginal") or raw_meta.get("DateTime") or ""
            m_date_str = raw_meta.get("DateTimeDigitized") or raw_meta.get("EXIF_DateTimeDigitized") or ""

            # Check software editor signatures
            if software:
                for r in SOFTWARE_REGEXES:
                    if r.search(software.lower()):
                        anom = f"Image edited using software: '{software}'"
                        anomalies.append(anom)
                        findings.append(Finding(
                            id="finding-img-meta",
                            layer_type="metadata",
                            severity="Medium",
                            title="Editing Software Signature Detected",
                            description=f"EXIF metadata indicates image was processed by graphic editing software: '{software}'.",
                            confidence=0.92,
                            details={"software": software}
                        ))
                        break

            # If an image has no EXIF or stripped EXIF tags while being edited
            if not exif and (len(file_bytes) > 50000):
                raw_meta["exif_status"] = "Stripped / None"
                
        except Exception as e:
            anomalies.append(f"Image metadata reading failed: {str(e)}")

    has_anomalies = len(anomalies) > 0
    score = 100 - (len(findings) * 22)
    score = max(5, min(99, score))

    raw_meta["revision_count"] = revision_count
    raw_meta["has_incremental_updates"] = has_incremental_updates

    meta_obj = DocumentMetadata(
        filename=filename,
        filesize_bytes=len(file_bytes),
        mime_type="application/pdf" if is_pdf else "image/jpeg",
        page_count=page_count,
        creation_date=c_date_str,
        modification_date=m_date_str,
        producer=producer or raw_meta.get("Make"),
        creator=creator or raw_meta.get("Model"),
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
