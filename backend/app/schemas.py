from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    id: Optional[str] = None
    page: Optional[int] = 1
    x: float = Field(..., description="X coordinate as a percentage (0-100) of document width")
    y: float = Field(..., description="Y coordinate as a percentage (0-100) of document height")
    width: float = Field(..., description="Width as a percentage (0-100) of document width")
    height: float = Field(..., description="Height as a percentage (0-100) of document height")
    label: Optional[str] = None
    layer_type: Optional[str] = None
    tag: Optional[str] = None
    color: Optional[str] = None
    target_finding_id: Optional[str] = None

class Finding(BaseModel):
    id: str
    layer_type: str  # 'math', 'copy_paste', 'splicing', 'metadata', 'font', 'cross_reference'
    severity: str    # 'High', 'Medium', 'Low', 'Critical'
    title: str
    description: str
    page: Optional[int] = 1
    expected_value: Optional[str] = None
    found_value: Optional[str] = None
    confidence: float = 0.95
    bounding_boxes: List[BoundingBox] = []
    source_doc: Optional[str] = None
    source_page: Optional[int] = None
    match_percentage: Optional[int] = None
    details: Optional[Dict[str, Any]] = None

class LayerOutput(BaseModel):
    layer_id: str
    name: str
    description: str
    score: int = 100  # 0 to 100
    flagged: bool = False
    findings_count: int = 0
    heatmap_data_url: Optional[str] = None
    overlay_items: List[BoundingBox] = []

class PageInfo(BaseModel):
    page_number: int
    preview_image_url: str
    width: int
    height: int
    heatmap_data_url: Optional[str] = None

class QualityMetrics(BaseModel):
    blur_score: float = 0.0
    is_blurry: bool = False
    glare_percentage: float = 0.0
    has_excessive_glare: bool = False
    skew_angle_corrected: float = 0.0
    gate_passed: bool = True

class DocumentMetadata(BaseModel):
    filename: str
    filesize_bytes: int
    mime_type: str
    page_count: int
    creation_date: Optional[str] = None
    modification_date: Optional[str] = None
    producer: Optional[str] = None
    creator: Optional[str] = None
    has_anomalies: bool = False
    anomalies: List[str] = []
    raw_metadata: Dict[str, Any] = {}
    # File fingerprints
    file_sha256: Optional[str] = None
    file_phash: Optional[str] = None
    file_simhash: Optional[str] = None
    duplicate_of: Optional[str] = None
    duplicate_type: Optional[str] = None  # 'exact' | 'near-visual' | 'near-text'

class AnalyzeResponse(BaseModel):
    document_id: str
    filename: str
    case_id: str = "Fraud Investigation #1047"
    trust_score: int  # 0 - 100
    risk_level: str   # 'CRITICAL', 'SUSPICIOUS', 'MODERATE', 'VERIFIED'
    summary: str
    quality_metrics: Optional[QualityMetrics] = None
    metadata: DocumentMetadata
    findings: List[Finding] = []
    layers: Dict[str, LayerOutput] = {}
    preview_image_url: Optional[str] = None
    pages: List[PageInfo] = []
    processed_at: str
    # Document type classification
    document_type: Optional[str] = None  # invoice, bank_statement, receipt, etc.
    # Which forensic checks apply to this document type
    applicable_layers: List[str] = ["metadata", "copy_paste", "splicing", "math", "font", "cross_reference"]
    # LLM agent outputs
    llm_summary: Optional[str] = None
    llm_context_findings: List[Finding] = []
    agent_confidence: float = 0.0
    # Granular forensic execution trace & timing telemetry
    execution_telemetry: Optional[Dict[str, Any]] = None

