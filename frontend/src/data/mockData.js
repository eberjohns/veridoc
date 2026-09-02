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
    page_count: 1,
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
      title: "Math Error: Balance Calculation Mismatch",
      description: "Current Balance ($5,164.39) does not match account arithmetic. Formula: Previous Balance ($6,591.12) + Deposits ($12,430.00) - Withdrawals ($13,856.73) = Expected $5,364.39 (Discrepancy: -$200.00).",
      expected_value: "$5,364.39",
      found_value: "$5,164.39",
      confidence: 0.99,
      bounding_boxes: [
        {
          id: "box-math-1-0",
          page: 1,
          x: 33.78,
          y: 27.22,
          width: 7.44,
          height: 2.77,
          label: "Current Balance Math Error",
          layer_type: "math",
          tag: "MATH-ERROR",
          color: "#EF4444",
          target_finding_id: "finding-math-1"
        },
        {
          id: "box-math-1-1",
          page: 1,
          x: 80.45,
          y: 68.17,
          width: 7.44,
          height: 2.77,
          label: "Ending Balance Math Error",
          layer_type: "math",
          tag: "MATH-ERROR",
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
      title: "Copy-Paste Check: Duplicated Transaction Rows",
      description: "2 duplicate transaction rows detected with identical vendor ('ABC Supply Co.'), reference invoice number ('INV-0021'), and withdrawal amount ($2,450.00).",
      source_doc: "invoice_3.pdf",
      source_page: 1,
      match_percentage: 87,
      confidence: 0.94,
      bounding_boxes: [
        {
          id: "box-copy_paste-1-0",
          page: 1,
          x: 15.05,
          y: 49.24,
          width: 23.73,
          height: 2.11,
          label: "Duplicated Transaction Block #1",
          layer_type: "copy_paste",
          tag: "COPY-PASTED",
          color: "#06B6D4",
          target_finding_id: "finding-cp-1"
        },
        {
          id: "box-copy_paste-1-1",
          page: 1,
          x: 15.05,
          y: 51.91,
          width: 23.73,
          height: 2.11,
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
      layer_type: "splicing",
      severity: "Critical",
      title: "Compression & Pixel Anomaly Hotspot (Splicing Check)",
      description: "High ELA compression variance detected on modified numeric entries in the account balance summary.",
      confidence: 0.96,
      bounding_boxes: [
        {
          id: "box-ela-default-1",
          page: 1,
          x: 33.5,
          y: 27.0,
          width: 8.5,
          height: 3.2,
          label: "Altered Numeric Balance",
          layer_type: "splicing",
          color: "#F97316",
          target_finding_id: "finding-ela-1"
        }
      ]
    },
    {
      id: "finding-font-1",
      layer_type: "font",
      severity: "Low",
      title: "Font Mismatch: Inconsistent Glyph Kerning",
      description: "Glyph metrics and font rendering on balance digits exhibit 14.2% kerning deviation compared to base statement typefaces.",
      confidence: 0.88,
      bounding_boxes: [
        {
          id: "box-font-1",
          page: 1,
          x: 33.78,
          y: 27.22,
          width: 7.44,
          height: 2.77,
          label: "Font Kerning & Weight Anomaly",
          layer_type: "font",
          tag: "FONT-MISMATCH",
          color: "#EC4899",
          target_finding_id: "finding-font-1"
        }
      ]
    },
    {
      id: "finding-meta-1",
      layer_type: "metadata",
      severity: "Medium",
      title: "Editing Software Signature Detected",
      description: "PDF Producer header identifies Adobe Photoshop 2024 instead of standard core banking batch statement generators.",
      confidence: 0.95,
      bounding_boxes: []
    }
  ]
};
