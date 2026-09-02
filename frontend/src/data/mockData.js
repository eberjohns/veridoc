export const DEFAULT_CASE_DOCS = [
  {
    id: "doc-bank-001",
    filename: "US_Bank_Statement_Mar2024.pdf",
    title: "US Bank Statement - March 2024",
    status: "flagged",
    risk_level: "CRITICAL",
    trust_score: 24,
    findings_count: 5,
    type: "bank_statement"
  },
  {
    id: "doc-paystub-002",
    filename: "Paystub_Mar2024.pdf",
    title: "Monthly Paystub - March 2024",
    status: "verified",
    risk_level: "VERIFIED",
    trust_score: 96,
    findings_count: 0,
    type: "paystub"
  },
  {
    id: "doc-inv-001",
    filename: "invoice_1.pdf",
    title: "Vendor Invoice #001",
    status: "verified",
    risk_level: "VERIFIED",
    trust_score: 94,
    findings_count: 0,
    type: "invoice"
  },
  {
    id: "doc-inv-002",
    filename: "invoice_2.pdf",
    title: "Vendor Invoice #002",
    status: "verified",
    risk_level: "VERIFIED",
    trust_score: 98,
    findings_count: 0,
    type: "invoice"
  },
  {
    id: "doc-inv-003",
    filename: "invoice_3.pdf",
    title: "Vendor Invoice #003 (Fabricated)",
    status: "flagged",
    risk_level: "CRITICAL",
    trust_score: 31,
    findings_count: 3,
    type: "invoice"
  },
  {
    id: "doc-tax-004",
    filename: "Tax_Return_2023.pdf",
    title: "IRS Form 1040 (Tax Return)",
    status: "verified",
    risk_level: "VERIFIED",
    trust_score: 92,
    findings_count: 0,
    type: "tax_return"
  },
  {
    id: "doc-id-005",
    filename: "ID_Proof.pdf",
    title: "Driver's License / ID",
    status: "verified",
    risk_level: "VERIFIED",
    trust_score: 97,
    findings_count: 0,
    type: "id_card"
  }
];

export const DEFAULT_BANK_STATEMENT_ANALYSIS = {
  document_id: "doc-bank-001",
  filename: "US_Bank_Statement_Mar2024.pdf",
  case_id: "Fraud Investigation #1047",
  trust_score: 24,
  risk_level: "CRITICAL",
  summary: "High probability of tampering detected. Review all findings.",
  metadata: {
    filename: "US_Bank_Statement_Mar2024.pdf",
    filesize_bytes: 482910,
    mime_type: "application/pdf",
    page_count: 3,
    creation_date: "2024-03-31 18:20:00",
    modification_date: "2024-03-30 10:15:00",
    producer: "Adobe PDF Library 16.0 / Adobe Photoshop 2024",
    creator: "Adobe Photoshop 25.4 (Windows)",
    has_anomalies: true,
    anomalies: [
      "Document modified using graphic editing software: 'Photoshop'",
      "Temporal contradiction: Modification date precedes Creation date"
    ]
  },
  findings: [
    {
      id: "finding-math-1",
      layer_type: "math",
      severity: "High",
      title: "Math Error",
      description: "Current Balance mismatch detected in Account Summary.",
      expected_value: "$5,364.39",
      found_value: "$5,164.39",
      confidence: 0.99,
      bounding_boxes: [
        {
          id: "box-math-1",
          x: 37.0,
          y: 35.8,
          width: 8.5,
          height: 3.2,
          label: "Current Balance Mismatch",
          layer_type: "math",
          color: "#EF4444",
          target_finding_id: "finding-math-1"
        }
      ],
      details: {
        formula: "Previous Balance ($6,591.12) + Total Deposits ($12,430.00) - Total Withdrawals ($13,856.73) = $5,364.39",
        delta: "-$200.00"
      }
    },
    {
      id: "finding-cp-1",
      layer_type: "copy_paste",
      severity: "High",
      title: "Copy-Paste Detection",
      description: "2 duplicated content block(s) found.",
      source_doc: "invoice_3.pdf",
      source_page: 1,
      match_percentage: 87,
      confidence: 0.94,
      bounding_boxes: [
        {
          id: "box-cp-1",
          x: 20.8,
          y: 56.4,
          width: 41.5,
          height: 2.2,
          label: "Duplicated Transaction Block #1",
          layer_type: "copy_paste",
          tag: "COPY-PASTED",
          color: "#06B6D4",
          target_finding_id: "finding-cp-1"
        },
        {
          id: "box-cp-2",
          x: 20.8,
          y: 58.8,
          width: 41.5,
          height: 2.2,
          label: "Duplicated Transaction Block #2",
          layer_type: "copy_paste",
          tag: "COPY-PASTED",
          color: "#06B6D4",
          target_finding_id: "finding-cp-1"
        }
      ],
      details: {
        duplicate_count: 2,
        matched_text: "Payment to ABC Supply Co. INV-0021 $ 2,450.00"
      }
    },
    {
      id: "finding-ela-1",
      layer_type: "ela",
      severity: "Medium",
      title: "ELA Anomaly",
      description: "High compression error variance detected around the Current Balance figure, indicating post-rasterization graphic modification.",
      confidence: 0.89,
      bounding_boxes: [
        {
          id: "box-ela-1",
          x: 34.0,
          y: 33.5,
          width: 14.0,
          height: 7.5,
          label: "Compression Inconsistency",
          layer_type: "ela",
          color: "#F97316",
          target_finding_id: "finding-ela-1"
        }
      ]
    },
    {
      id: "finding-meta-1",
      layer_type: "metadata",
      severity: "Low",
      title: "Metadata Inconsistency",
      description: "PDF Producer header identifies Adobe Photoshop 2024 instead of standard core banking batch statement generators.",
      confidence: 0.92,
      bounding_boxes: []
    },
    {
      id: "finding-font-1",
      layer_type: "font",
      severity: "Low",
      title: "Font Anomaly",
      description: "Glyph metrics and font rendering on balance digits exhibit 14.2% kerning deviation compared to base statement typefaces.",
      confidence: 0.82,
      bounding_boxes: [
        {
          id: "box-font-1",
          x: 38.0,
          y: 35.8,
          width: 6.5,
          height: 3.0,
          label: "Glyph Baseline Deviation",
          layer_type: "font",
          color: "#EC4899",
          target_finding_id: "finding-font-1"
        }
      ]
    }
  ],
  layers: {
    noise: {
      layer_id: "noise",
      name: "Noise Analysis",
      description: "Sensor pattern inconsistencies",
      score: 85,
      flagged: false,
      findings_count: 0,
      overlay_items: []
    },
    ela: {
      layer_id: "ela",
      name: "ELA",
      description: "Error Level Analysis",
      score: 24,
      flagged: true,
      findings_count: 1,
      overlay_items: []
    },
    cloning: {
      layer_id: "cloning",
      name: "Cloning Detection",
      description: "Detects cloned regions",
      score: 92,
      flagged: false,
      findings_count: 0,
      overlay_items: []
    },
    copy_paste: {
      layer_id: "copy_paste",
      name: "Copy-Paste",
      description: "Detects repeated content",
      score: 20,
      flagged: true,
      findings_count: 2,
      overlay_items: []
    },
    splicing: {
      layer_id: "splicing",
      name: "Splicing Detection",
      description: "Detects spliced regions",
      score: 88,
      flagged: false,
      findings_count: 0,
      overlay_items: []
    },
    metadata: {
      layer_id: "metadata",
      name: "Metadata Analysis",
      description: "File & author metadata",
      score: 75,
      flagged: true,
      findings_count: 1,
      overlay_items: []
    },
    font: {
      layer_id: "font",
      name: "Font & Style Anomalies",
      description: "Inconsistent fonts & styling",
      score: 70,
      flagged: true,
      findings_count: 1,
      overlay_items: []
    },
    math: {
      layer_id: "math",
      name: "Math Verification",
      description: "Calculations & consistency",
      score: 15,
      flagged: true,
      findings_count: 1,
      overlay_items: []
    }
  }
};
