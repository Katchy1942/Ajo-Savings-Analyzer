import { Router, type IRouter, type RequestHandler } from "express";
import multer from "multer";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type CellValue = unknown;
type Row = CellValue[];

export type FormattedTransaction = {
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
};

export type AnalyzeSummary = {
  summary: {
    openingBalance: number;
    closingBalance: number;
    totalDebit: number;
    totalCredit: number;
  };
  categoryBreakdown: {
    personTransfers: number;
    posPayments: number;
    airtimeData: number;
    other: number;
  };
  sampleTransactions: Array<{
    date: string;
    description: string;
    amount: number;
  }>;
};

type ColumnMap = {
  headerRowIndex: number;
  dateIndex: number;
  descriptionIndices: number[];
  amountIndex: number;
  debitIndex: number;
  creditIndex: number;
  typeIndex: number;
};

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (/\.(csv|xlsx)$/i.test(file.originalname)) {
      callback(null, true);
      return;
    }

    callback(new Error("Only .csv and .xlsx files are supported."));
  },
});

// The key is intentionally only checked for availability. LLM analysis is deferred
// until a later step, and the secret value is never returned or logged.
const llmApiKeyConfigured = Boolean(process.env.LLM_API_KEY);

const receiveStatementUpload: RequestHandler = (request, response, next) => {
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "statement-file", maxCount: 1 },
  ])(request, response, (error) => {
    if (error) {
      response.status(400).json({
        error: error instanceof Error ? error.message : "Could not read the uploaded file.",
      });
      return;
    }

    next();
  });
};

function getUploadedFile(request: Parameters<RequestHandler>[0]): Express.Multer.File | undefined {
  const files = request.files;
  if (!files) return undefined;
  if (Array.isArray(files)) return files[0];

  return files.file?.[0] ?? files["statement-file"]?.[0];
}

function cellText(value: CellValue): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function rawCellText(value: CellValue): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
}

function normalizeHeader(value: CellValue): string {
  return cellText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hasHeaderPart(header: string, parts: string[]): boolean {
  return parts.some((part) => header === part || header.includes(part));
}

function findColumn(headers: string[], parts: string[], excluded: number[] = []): number {
  return headers.findIndex(
    (header, index) => !excluded.includes(index) && hasHeaderPart(header, parts),
  );
}

function findColumns(headers: string[], parts: string[]): number[] {
  return headers.reduce<number[]>((matches, header, index) => {
    if (hasHeaderPart(header, parts)) matches.push(index);
    return matches;
  }, []);
}

function findStatementColumns(rows: Row[]): ColumnMap {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const headers = rows[rowIndex].map(normalizeHeader);
    const valueDateIndex = findColumn(headers, ["valuedate"]);
    const dateIndex =
      valueDateIndex >= 0
        ? valueDateIndex
        : findColumn(headers, [
      "transactiondate",
      "transdate",
      "postingdate",
      "date",
          ]);
    const descriptionIndices = findColumns(headers, [
      "description",
      "narration",
      "particular",
      "transactiondetails",
      "details",
      "reference",
      "remarks",
      "memo",
    ]);
    const debitIndex = findColumn(headers, ["debit", "withdrawal", "paidout"]);
    const creditIndex = findColumn(headers, ["credit", "deposit", "paidin"]);
    const amountIndex = findColumn(
      headers,
      ["transactionamount", "signedamount", "amount", "value"],
      [debitIndex, creditIndex].filter((index) => index >= 0),
    );
    const typeIndex = findColumn(headers, ["type", "transactiontype", "category"]);

    const hasAmountColumns = amountIndex >= 0 || debitIndex >= 0 || creditIndex >= 0;
    if (dateIndex >= 0 && descriptionIndices.length > 0 && hasAmountColumns) {
      return {
        headerRowIndex: rowIndex,
        dateIndex,
        descriptionIndices,
        amountIndex,
        debitIndex,
        creditIndex,
        typeIndex,
      };
    }
  }

  throw new Error(
    "Could not find the transaction table. Expected date, description/narration, and amount columns.",
  );
}

function parseAmount(value: CellValue): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const source = cellText(value);
  if (!source) return null;

  const isParenthesized = /^\(.*\)$/.test(source);
  const hasDebitMarker = /\b(?:dr|debit|withdrawal|withdraw)\b/i.test(source);
  const hasCreditMarker = /\b(?:cr|credit|deposit|income)\b/i.test(source);
  const numericText = source.replace(/,/g, "").match(/[-+]?\d+(?:\.\d+)?/)?.[0];
  const parsed = numericText === undefined ? Number.NaN : Number(numericText);

  if (!Number.isFinite(parsed)) return null;
  if (hasDebitMarker || isParenthesized) return -Math.abs(parsed);
  if (hasCreditMarker) return Math.abs(parsed);
  return parsed;
}

function formatDate(value: CellValue): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const month = String(parsed.m).padStart(2, "0");
      const day = String(parsed.d).padStart(2, "0");
      return `${parsed.y}-${month}-${day}`;
    }
  }

  return cellText(value);
}

function amountFromRow(row: Row, columns: ColumnMap): number | null {
  const hasSeparateAmountColumns = columns.debitIndex >= 0 || columns.creditIndex >= 0;

  if (hasSeparateAmountColumns) {
    const debit = columns.debitIndex >= 0 ? parseAmount(row[columns.debitIndex]) : null;
    const credit = columns.creditIndex >= 0 ? parseAmount(row[columns.creditIndex]) : null;

    if (debit === null && credit === null) return null;

    return (debit === null ? 0 : -Math.abs(debit)) + (credit === null ? 0 : Math.abs(credit));
  }

  if (columns.amountIndex < 0) return null;

  const amount = parseAmount(row[columns.amountIndex]);
  if (amount === null) return null;

  const type = columns.typeIndex >= 0 ? cellText(row[columns.typeIndex]).toLowerCase() : "";
  if (/\b(?:debit|withdrawal|withdraw|paidout)\b/.test(type)) return -Math.abs(amount);
  if (/\b(?:credit|deposit|income|paidin)\b/.test(type)) return Math.abs(amount);
  return amount;
}

function summaryValue(
  rows: Row[],
  headerRowIndex: number,
  label: string,
  fallbackRowIndex: number,
  fallbackColumnIndex: number,
): number {
  const candidateRows = [
    rows[fallbackRowIndex],
    ...rows.slice(0, headerRowIndex),
  ].filter((row): row is Row => row !== undefined);

  for (const row of candidateRows) {
    const labelIndex = row.findIndex((value) => normalizeHeader(value).includes(label));
    if (labelIndex < 0) continue;

    for (const value of row.slice(labelIndex + 1)) {
      const parsed = parseAmount(value);
      if (parsed !== null) return Math.abs(parsed);
    }
  }

  const fallback = parseAmount(rows[fallbackRowIndex]?.[fallbackColumnIndex]);
  return fallback === null ? 0 : Math.abs(fallback);
}

function categoryForDescription(
  description: string,
): keyof AnalyzeSummary["categoryBreakdown"] {
  const normalized = description.toLowerCase();

  if (
    /\b(?:transfer|p2p|send money|received from|bank transfer|money transfer)\b/.test(
      normalized,
    )
  ) {
    return "personTransfers";
  }

  if (/\b(?:pos|point of sale|merchant)\b/.test(normalized)) {
    return "posPayments";
  }

  if (
    /\b(?:airtime|data|recharge|bundle|top[\s-]?up|mtn|glo|airtel|9mobile)\b/.test(
      normalized,
    )
  ) {
    return "airtimeData";
  }

  return "other";
}

function evenlySampleTransactions(
  transactions: FormattedTransaction[],
): AnalyzeSummary["sampleTransactions"] {
  const chronological = [...transactions].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  const sampleSize = Math.min(15, chronological.length);

  if (sampleSize === 0) return [];
  if (sampleSize === chronological.length) {
    return chronological.map(({ date, description, amount }) => ({
      date,
      description,
      amount,
    }));
  }

  return Array.from({ length: sampleSize }, (_, index) => {
    const sourceIndex = Math.round((index * (chronological.length - 1)) / (sampleSize - 1));
    const { date, description, amount } = chronological[sourceIndex];
    return { date, description, amount };
  });
}

export function formatOpayStatementSummary(rows: Row[]): AnalyzeSummary {
  const columns = findStatementColumns(rows);
  const transactions = formatOpayStatement(rows);
  const categoryBreakdown: AnalyzeSummary["categoryBreakdown"] = {
    personTransfers: 0,
    posPayments: 0,
    airtimeData: 0,
    other: 0,
  };

  for (const transaction of transactions) {
    if (transaction.type !== "debit") continue;
    const category = categoryForDescription(transaction.description);
    categoryBreakdown[category] += Math.abs(transaction.amount);
  }

  return {
    summary: {
      openingBalance: summaryValue(rows, columns.headerRowIndex, "openingbalance", 3, 1),
      closingBalance: summaryValue(rows, columns.headerRowIndex, "closingbalance", 4, 1),
      totalDebit: summaryValue(rows, columns.headerRowIndex, "totaldebit", 3, 3),
      totalCredit: summaryValue(rows, columns.headerRowIndex, "totalcredit", 4, 3),
    },
    categoryBreakdown,
    sampleTransactions: evenlySampleTransactions(transactions),
  };
}

export function formatOpayStatement(rows: Row[]): FormattedTransaction[] {
  const columns = findStatementColumns(rows);
  const transactions: FormattedTransaction[] = [];

  for (const row of rows.slice(columns.headerRowIndex + 1)) {
    if (!row.some((value) => cellText(value))) continue;

    const date = formatDate(row[columns.dateIndex]);
    const description = columns.descriptionIndices
      .map((index) => rawCellText(row[index]))
      .find((value) => value !== "") ?? "";
    const amount = amountFromRow(row, columns);

    // Footer and summary rows generally have no date or description. Requiring both
    // keeps metadata, blank lines, and trailing totals out of the transaction list.
    if (!date || !description || amount === null) continue;

    transactions.push({
      date,
      description,
      amount,
      type: amount < 0 ? "debit" : "credit",
    });
  }

  return transactions;
}

function parseStatement(file: Express.Multer.File): Row[] {
  const isCsv = /\.csv$/i.test(file.originalname);

  if (isCsv) {
    const parsed = Papa.parse<Row>(file.buffer.toString("utf8"), {
      header: false,
      skipEmptyLines: false,
    });

    if (parsed.errors.length > 0) {
      throw new Error(`Could not parse CSV: ${parsed.errors[0].message}`);
    }

    return parsed.data;
  }

  const workbook = XLSX.read(file.buffer, {
    type: "buffer",
    cellDates: true,
    raw: true,
  });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("The uploaded workbook has no sheets.");

  const firstSheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<Row>(firstSheet, {
    header: 1,
    defval: "",
    blankrows: true,
    raw: true,
  });
}

router.post("/analyze", receiveStatementUpload, (request, response) => {
  const file = getUploadedFile(request);
  if (!file) {
    response.status(400).json({ error: "Upload a CSV or XLSX statement in the file field." });
    return;
  }

  const goalAmount = Number(request.body.goalAmount);
  const months = Number(request.body.months);
  if (!Number.isFinite(goalAmount) || goalAmount <= 0) {
    response.status(400).json({ error: "goalAmount must be a positive number." });
    return;
  }
  if (!Number.isFinite(months) || months <= 0) {
    response.status(400).json({ error: "months must be a positive number." });
    return;
  }

  try {
    const formatted = formatOpayStatementSummary(parseStatement(file));
    request.log.debug(
      {
        goalAmount,
        months,
        sampleTransactionCount: formatted.sampleTransactions.length,
        llmApiKeyConfigured,
      },
      "Statement parsed; LLM analysis deferred",
    );
    response.json(formatted);
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Could not parse the statement.",
    });
  }
});

export default router;