"""
Forensic Narrative Translation Module for Veridoc.

Translates raw mathematical, cryptographic, and computer-vision statistics
extracted by the forensic modules into human-readable, courtroom-admissible
forensic audit conclusions and executive summaries.
"""

import os
import json
from typing import List, Dict, Any, Tuple
from ..schemas import Finding

def synthesize_forensic_summary(
    findings: List[Finding],
    trust_score: int,
    risk_level: str,
    doc_type: str,
    filename: str
) -> str:
    """
    Translates raw algorithmic metrics into a fluent executive forensic summary.
    """
    if not findings:
        return f"Document verification complete for '{filename}'. All forensic integrity checks passed with zero anomalies, confirming an authentic {doc_type.replace('_', ' ')}."

    critical_count = sum(1 for f in findings if f.severity == "Critical")
    high_count = sum(1 for f in findings if f.severity == "High")
    med_count = sum(1 for f in findings if f.severity == "Medium")

    # Collect key forensic pillars
    has_meta = any(f.layer_type == "metadata" for f in findings)
    has_math = any(f.layer_type == "math" for f in findings)
    has_splicing = any(f.layer_type in ["splicing", "ela"] for f in findings)
    has_cloning = any(f.layer_type == "copy_paste" for f in findings)
    has_stego = any("white-on-white" in f.title.lower() or "injection" in f.title.lower() for f in findings)
    has_duplicate = any("duplicate" in f.title.lower() for f in findings)

    threat_points = []
    if has_stego:
        threat_points.append("adversarial steganographic text concealing hidden prompt injection")
    if has_math:
        threat_points.append("mathematical reconciliation discrepancies in declared balances")
    if has_splicing:
        threat_points.append("compression-level splicing indicating spliced graphic elements")
    if has_cloning:
        threat_points.append("duplicated pixel block clusters from internal copy-move cloning")
    if has_meta:
        threat_points.append("post-production metadata alterations or editing software signatures")
    if has_duplicate:
        threat_points.append("cryptographic duplicate hash match with existing case records")

    threat_clause = ", ".join(threat_points) if threat_points else "multiple forensic integrity violations"

    if risk_level == "CRITICAL" or trust_score <= 35:
        return (
            f"CRITICAL TAMPERING DETECTED: Forensic evaluation of '{filename}' uncovered severe integrity anomalies, "
            f"specifically {threat_clause}. Document trust score is degraded to {trust_score}%."
        )
    elif risk_level == "HIGH" or trust_score <= 65:
        return (
            f"HIGH SUSPICION: Multi-layer analysis identified {len(findings)} forensic anomalies in '{filename}', "
            f"notably {threat_clause}. Recommend secondary audit verification."
        )
    else:
        return (
            f"LOW-LEVEL WARNING: Analysis flagged {len(findings)} minor formatting or metadata inconsistencies in '{filename}' "
            f"({threat_clause}), while core structure remains intact (Trust Score: {trust_score}%)."
        )


def translate_metadata_finding(
    raw_anomaly_type: str,
    details: Dict[str, Any]
) -> Tuple[str, str]:
    """
    Translates raw metadata statistics into human-readable forensic conclusions.
    """
    if "software" in details:
        soft = details.get("software", "Graphic Editor")
        title = f"Unauthorized Editing Software Signature ({soft})"
        desc = (
            f"Forensic header analysis discovered metadata signatures left by desktop graphic manipulation software '{soft}'. "
            f"Legitimate institutional documents are compiled automatically by backend enterprise print spoolers, not consumer photo editors."
        )
        return title, desc

    if "revision_count" in details:
        rev = details.get("revision_count", 2)
        title = f"Unflattened Post-Generation Incremental Saves ({rev} Revisions)"
        desc = (
            f"Binary PDF trailer analysis identified {rev} separate appended revision blocks (%%EOF markers). "
            f"This confirms the document was modified and re-saved multiple times after its original generation date."
        )
        return title, desc

    if "creation_date" in details and "mod_date" in details:
        c_d = details.get("creation_date")
        m_d = details.get("mod_date")
        title = "Chronological Metadata Inversion"
        desc = (
            f"Temporal metadata analysis revealed an impossible chronological contradiction: the file modification date "
            f"({m_d}) precedes the recorded creation date ({c_d}), a hallmark of manual system clock tampering or metadata spoofing."
        )
        return title, desc

    if "duplicate_of" in details:
        dup = details.get("duplicate_of")
        mtype = details.get("match_type", "exact")
        title = f"Duplicate Document Collision ({dup})"
        desc = (
            f"Three-layer fingerprint matching determined that this document is a {mtype} duplicate of previously uploaded document '{dup}'."
        )
        return title, desc

    return "Metadata Anomaly Detected", "Forensic header analysis identified structural metadata irregularities."
