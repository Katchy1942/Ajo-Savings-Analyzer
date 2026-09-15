---
name: Opay spreadsheet row offsets
description: The row-index behavior to account for when parsing Opay Excel exports.
---

When converting an Opay workbook to row arrays, do not rely on visible Excel row numbers surviving unchanged. Resolve summary values such as opening balance, closing balance, total debit, and total credit by their labels within the metadata rows before the transaction header, with fixed positions only as fallbacks.

**Why:** `xlsx` sheet-to-array conversion can omit leading blank rows, shifting the numeric indexes for Excel while CSV preserves those blank rows.

**How to apply:** Keep the transaction header detection separate from summary extraction, and test both a quoted CSV export and an XLSX export of the same statement shape.