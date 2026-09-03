# Algorithm: Semantic Arithmetic & Ledger Reconciliation

## Overview

Financial document manipulation frequently involves modifying line-item amounts, totals, subtotals, or ending account balances without recalculating dependent figures throughout the document. Veridoc's arithmetic verification module applies deterministic accounting rules and ledger balance consistency checks to detect numerical fraud.

## Theoretical Basis & Accounting Standards

- **Generally Accepted Accounting Principles (GAAP)** — Double-entry bookkeeping and ledger balance reconciliation rules.
- **Benford's Law & Digit Analysis** — First and second digit distribution checks across transaction records (Nigrini, 2012).
- **Verhoeff & Luhn Checksum Algorithms** — Check digit verification for account, routing, and invoice serial IDs.

## Verification Pipeline

### 1. Token & Currency Normalization
All monetary and numerical patterns are extracted across document text lines:
$$\text{Currency regex: } \$\s*([\d,]+\.\d{2}) \quad \text{or} \quad ([\d,]+\.\d{2})$$
Thousands commas are stripped, and tokens are converted to 64-bit floating point / decimal representations.

### 2. Ending Balance Ledger Reconciliation
For bank statements and financial statements:
1. Locate starting / opening balance ($B_{open}$).
2. Accumulate all credits ($C_i$) and debits ($D_j$) across transaction lines:
$$B_{calc} = B_{open} + \sum C_i - \sum D_j$$
3. Locate stated ending / closing balance ($B_{stated}$).
4. Compute delta:
$$\Delta = |B_{calc} - B_{stated}|$$
5. If $\Delta > 0.01$ (allowing for 1-cent rounding variance), flag as a **Critical Math Error** and locate the exact bounding box of the stated figure for canvas overlay.

### 3. Subtotal / Total Column Summation
For invoice documents:
$$\text{Expected Total} = \sum_{i=1}^n \text{LineItem}_i + \text{Tax} + \text{Shipping} - \text{Discount}$$
If the printed total differs from the sum of line items by more than the tax variance tolerance, a bounding box highlight is placed over the incorrect total.

### 4. Supplemental LLM Verification (Qwen3:8b)
When complex freeform tables or unconventional layouts are detected, extracted text is analyzed by the local LLM agent with low temperature ($T = 0.1$) to cross-verify arithmetic consistency without hallucination.
