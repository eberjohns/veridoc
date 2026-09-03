# Algorithm: Metadata & Structural Container Forensics

## Overview

Metadata forensics examines container-level properties, timestamps, software signatures, revision histories, and compression dictionary structures to detect post-creation alterations.

## Academic & Forensic Standards

- **ISO 32000-1 (2008)** — Document Management: Portable Document Format (PDF 1.7 specifications for Info dict, XMP metadata streams, and Cross-Reference tables).
- **SWGDE (Scientific Working Group on Digital Evidence)** — Standards and Best Practices for Forensic Analysis of Digital Documents.
- **Castiglione, A. et al. (2010)** — "Forensic analysis of PDF documents", IEEE International Conference on Complex, Intelligent and Software Intensive Systems.

## Anomaly Detection Heuristics

### 1. Chronological Timeline Inversion
The modification timestamp ($T_{mod}$) is parsed and compared against the creation timestamp ($T_{create}$):
$$T_{mod} < T_{create}$$
If a document's modification timestamp precedes its creation timestamp, the container has experienced clock tampering or manual timestamp forging.

### 2. Editing Tool / Producer Signature Discrepancies
Desktop PDF generators (e.g. Acrobat Distiller, Microsoft Word, LaTeX) produce characteristic producer and creator strings. Veridoc checks for:
- Spliced producer strings (e.g., modern software string inside an older PDF version header).
- Image editor signatures (Photoshop, GIMP, Canva) in business or bank statement documents where standard ERP/banking software is expected.

### 3. Incremental Update & Revision Counting
PDF files support incremental updates (`/Prev` pointer in trailer dictionaries). 
- Multiple revisions without corresponding digital signatures often indicate post-hoc visual adjustments or text replacements.
- Veridoc counts trailer revisions and scans cross-reference tables (`xref`) to detect appended streams that override prior visual objects.

### 4. Embedded Font Subset Integrity
Digital PDF documents produced from true vector sources contain subset embedded font descriptors (e.g., `ABCDEE+Helvetica`). If numeric amounts or isolated table lines use un-embedded system fonts or disparate font subsets while the remainder of the document is embedded, this indicates external editing.
