const XLSX = require("xlsx");

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Strip the ₦ symbol, commas, and surrounding whitespace, then parse to float.
 * Returns 0 if the value is "--", null, undefined, or un-parseable.
 */
function parseMoney(raw) {
  if (raw === null || raw === undefined) return 0;
  const str = String(raw).trim();
  if (str === "--" || str === "") return 0;
  const cleaned = str.replace(/[₦,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Categorize a transaction description into one of four buckets.
 */
function categorize(description) {
  const lower = description.toLowerCase();
  if (lower.includes("transfer to")) return "personTransfers";
  if (lower.includes("pos")) return "posPayments";
  if (lower.includes("airtime") || lower.includes("data")) return "airtimeData";
  return "other";
}

/**
 * Pick up to `max` items spread evenly across an array.
 * e.g. for 100 items and max=15, returns every ~7th item.
 */
function sampleEvenly(arr, max = 15) {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const result = [];
  for (let i = 0; i < max; i++) {
    result.push(arr[Math.floor(i * step)]);
  }
  return result;
}

// ── Main parser ────────────────────────────────────────────────────────────────

/**
 * Parse an Opay "Wallet Account Transactions" xlsx export from a Buffer.
 *
 * @param {Buffer} buffer  Raw file buffer from multer memory storage
 * @returns {{
 *   summary: { openingBalance: number, closingBalance: number, totalDebit: number, totalCredit: number },
 *   transactions: Array<{ date: string, description: string, amount: number, type: string }>,
 *   categoryBreakdown: { personTransfers: number, posPayments: number, airtimeData: number, other: number },
 *   sampleTransactions: Array<{ date: string, description: string, amount: number }>
 * }}
 */
function parseOpayStatement(buffer) {
  // Read workbook from memory buffer
  const workbook = XLSX.read(buffer, { type: "buffer", cellText: true, raw: false });

  // Target sheet
  const sheetName = "Wallet Account Transactions";
  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(
      `Sheet "${sheetName}" not found. Available sheets: ${workbook.SheetNames.join(", ")}`
    );
  }

  const sheet = workbook.Sheets[sheetName];

  // Convert to a 2-D array for positional access (header: 1 = raw rows, no auto-headers)
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });

  // ── Row indices (0-based; spec uses 1-based row numbers) ──────────────────
  // Row 2  → index 1: Account Name (col A), Account Number (col B)
  // Row 4  → index 3: Opening Balance (col B), Total Debit (col D)
  // Row 5  → index 4: Closing Balance (col B), Total Credit (col D)
  // Row 7  → index 6: header row
  // Row 8+ → index 7+: transaction data

  const row4 = rows[3] || [];
  const row5 = rows[4] || [];

  const summary = {
    openingBalance: parseMoney(row4[1]), // col B
    closingBalance: parseMoney(row5[1]), // col B
    totalDebit:     parseMoney(row4[3]), // col D
    totalCredit:    parseMoney(row5[3]), // col D
  };

  // ── Transactions (row 8 onward = index 7+) ───────────────────────────────
  // Header (row 7 / index 6):
  //   0: Trans. Date | 1: Value Date | 2: Description | 3: Debit(₦) | 4: Credit(₦) | 5: Balance After(₦) | 6: Channel | 7: Transaction Reference

  const transactionRows = rows.slice(7);

  const transactions = [];
  const categoryBreakdown = {
    personTransfers: 0,
    posPayments:     0,
    airtimeData:     0,
    other:           0,
  };

  for (const row of transactionRows) {
    // Skip completely empty rows (can appear at the bottom of exports)
    if (!row || row.every((cell) => String(cell).trim() === "")) continue;

    const date        = String(row[1] || "").trim(); // Value Date
    const description = String(row[2] || "").trim(); // Description
    const debit       = parseMoney(row[3]);           // Debit(₦)
    const credit      = parseMoney(row[4]);           // Credit(₦)

    const amount = credit - debit;
    const type   = credit > 0 ? "credit" : "debit";

    transactions.push({ date, description, amount, type });

    // Accumulate category breakdown (absolute amounts)
    const cat = categorize(description);
    categoryBreakdown[cat] += Math.abs(amount);
  }

  // Round breakdown values to 2 dp
  for (const key of Object.keys(categoryBreakdown)) {
    categoryBreakdown[key] = Math.round(categoryBreakdown[key] * 100) / 100;
  }

  // ── Sample transactions ──────────────────────────────────────────────────
  const sampleTransactions = sampleEvenly(transactions, 15).map(({ date, description, amount }) => ({
    date,
    description,
    amount,
  }));

  return { summary, transactions, categoryBreakdown, sampleTransactions };
}

module.exports = { parseOpayStatement };
