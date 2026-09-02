from typing import List, Dict, Any

SAMPLE_DOCUMENTS_INFO = [
    {
        "id": "doc-bank-001",
        "filename": "US_Bank_Statement_Mar2024.pdf",
        "title": "US Bank Statement - March 2024",
        "status": "flagged", # 'verified', 'flagged', 'warning'
        "risk_level": "CRITICAL",
        "trust_score": 24,
        "findings_count": 5,
        "thumbnail_icon": "file-text",
        "is_active": True
    },
    {
        "id": "doc-paystub-002",
        "filename": "Paystub_Mar2024.pdf",
        "title": "Monthly Paystub - March 2024",
        "status": "verified",
        "risk_level": "VERIFIED",
        "trust_score": 96,
        "findings_count": 0,
        "thumbnail_icon": "file-check",
        "is_active": False
    },
    {
        "id": "doc-inv-001",
        "filename": "invoice_1.pdf",
        "title": "Vendor Invoice #001",
        "status": "verified",
        "risk_level": "VERIFIED",
        "trust_score": 94,
        "findings_count": 0,
        "thumbnail_icon": "file-check",
        "is_active": False
    },
    {
        "id": "doc-inv-002",
        "filename": "invoice_2.pdf",
        "title": "Vendor Invoice #002",
        "status": "verified",
        "risk_level": "VERIFIED",
        "trust_score": 98,
        "findings_count": 0,
        "thumbnail_icon": "file-check",
        "is_active": False
    },
    {
        "id": "doc-inv-003",
        "filename": "invoice_3.pdf",
        "title": "Vendor Invoice #003 (Fabricated)",
        "status": "flagged",
        "risk_level": "CRITICAL",
        "trust_score": 31,
        "findings_count": 3,
        "thumbnail_icon": "file-warning",
        "is_active": False
    },
    {
        "id": "doc-tax-004",
        "filename": "Tax_Return_2023.pdf",
        "title": "IRS Form 1040 (Tax Return)",
        "status": "verified",
        "risk_level": "VERIFIED",
        "trust_score": 92,
        "findings_count": 0,
        "thumbnail_icon": "file-check",
        "is_active": False
    },
    {
        "id": "doc-id-005",
        "filename": "ID_Proof.pdf",
        "title": "Driver's License / National ID",
        "status": "verified",
        "risk_level": "VERIFIED",
        "trust_score": 97,
        "findings_count": 0,
        "thumbnail_icon": "id-card",
        "is_active": False
    }
]

CASE_DETAILS = {
    "case_id": "Fraud Investigation #1047",
    "case_title": "Commercial Loan Application - Suspicious Account Statement",
    "created_at": "2024-03-25T14:32:00Z",
    "lead_investigator": "Forensic Auditor Sarah Jenkins",
    "documents": SAMPLE_DOCUMENTS_INFO
}
