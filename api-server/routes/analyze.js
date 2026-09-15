const express = require("express");
const multer  = require("multer");

const openai = require("../lib/openaiClient");

const router = express.Router();

// ── Multer — memory storage only, never writes to disk ────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB cap
  fileFilter(_req, file, cb) {
    const ext = file.originalname.split(".").pop().toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      return cb(new Error("Only .xlsx / .xls files are accepted"));
    }
    cb(null, true);
  },
});

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Ajo, a sharp and empathetic personal finance assistant for Nigerian users on Opay.
The user has uploaded their Opay wallet statement and set a savings goal. Your job is to read the statement and produce a complete financial analysis.

SPREADSHEET LAYOUT ("Wallet Account Transactions" sheet)
Row 2  — Account Name (col A), Account Number (col B)
Row 4  — "Opening Balance" label (col A), Opening Balance value (col B), "Total Debit" label (col C), Total Debit value (col D)
Row 5  — "Closing Balance" label (col A), Closing Balance value (col B), "Total Credit" label (col C), Total Credit value (col D)
Row 7  — Headers: Trans. Date | Value Date | Description | Debit(N) | Credit(N) | Balance After(N) | Channel | Transaction Reference
Row 8+ — Transaction rows. Empty debit/credit cells contain "--" (not blank).

STEP 1 — EXTRACT SUMMARY
From rows 4-5 extract four numbers (strip currency symbols and commas before parsing):
  openingBalance  -> row 4, col B
  closingBalance  -> row 5, col B
  totalDebit      -> row 4, col D  (NOT col F which is count)
  totalCredit     -> row 5, col D  (NOT col F which is count)

STEP 2 — PARSE ALL TRANSACTIONS
From row 8 onward, for each non-empty row:
  date        -> Value Date column (col B, index 1)
  description -> full original text, keep names and amounts intact, do NOT anonymize
  amount      -> credit minus debit (treat "--" as 0; strip commas before parsing)
  type        -> "credit" if credit > 0, else "debit"

STEP 3 — CATEGORIZE (DEBIT transactions only)
Check this order (first match wins):
  posPayments     -> description contains "pos transfer"  (check BEFORE "transfer to")
  personTransfers -> description contains "transfer to"
  airtimeData     -> description contains "airtime" OR "data"
  other           -> everything else
Sum the absolute amount per category. Credits are excluded from all spend categories.

STEP 4 — SAMPLE TRANSACTIONS
Pick up to 15 transactions spread evenly across the full list (not just the first 15).
Use step = floor(total / 15) and pick indices 0, step, 2*step etc.
Return { date, description, amount } for each.

STEP 5 — SAVINGS ANALYSIS (the core output)
The user's goal will be in their message as: "Goal: save N<amount> in <months> month(s) [for: <label>]"

Compute:
a) monthlyNetIncome: average monthly net (totalCredit - totalDebit) across the statement period.
   Estimate the period from the transaction date range if not explicit.

b) requiredMonthlySaving: goalAmount / months.

c) feasible: true if (monthlyNetIncome - requiredMonthlySaving) >= 0, else false.

d) verdict: one punchy sentence (max 20 words) that honestly assesses the goal.
   Example: "Doable — but you'll need to cut person transfers by roughly N15,000/month."

e) insights: exactly 3 short, specific observations about this user's real spending behaviour.
   Each must reference real amounts or patterns from the data. Warm, direct tone.
   No generic advice. Format as plain strings (no bullet prefix).

f) recommendations: exactly 3 concrete actions the user can take right now to hit their goal.
   Each must reference a real pattern you saw in their transactions.
   Format as plain strings.

OUTPUT FORMAT
Return ONLY valid JSON — no markdown, no code fences, no text before or after the JSON.

{
  "summary": {
    "openingBalance": 0,
    "closingBalance": 0,
    "totalDebit": 0,
    "totalCredit": 0
  },
  "categoryBreakdown": {
    "personTransfers": 0,
    "posPayments": 0,
    "airtimeData": 0,
    "other": 0
  },
  "sampleTransactions": [
    { "date": "", "description": "", "amount": 0 }
  ],
  "analysis": {
    "monthlyNetIncome": 0,
    "requiredMonthlySaving": 0,
    "feasible": true,
    "verdict": "",
    "insights": ["", "", ""],
    "recommendations": ["", "", ""]
  },
  "goal": { "amount": 0, "months": 0, "label": "" }
}

The "goal" field will be overwritten by the server — leave it as zeroes/empty strings.`;

// ── POST /api/analyze ─────────────────────────────────────────────────────────
router.post(
  "/analyze",
  upload.single("statement"),
  async (req, res) => {
    // ── Validate file ────────────────────────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded. Include the spreadsheet as the 'statement' field.",
      });
    }

    // ── Validate goal inputs ─────────────────────────────────────────────────
    const goalAmount = parseFloat(req.body.goalAmount);
    const months     = parseInt(req.body.months, 10);
    const label      = (req.body.label || "").trim();

    if (isNaN(goalAmount) || goalAmount <= 0) {
      return res.status(400).json({ error: "'goalAmount' must be a positive number." });
    }
    if (isNaN(months) || months <= 0) {
      return res.status(400).json({ error: "'months' must be a positive integer." });
    }

    // ── Encode file as base64 ────────────────────────────────────────────────
    const fileBase64 = req.file.buffer.toString("base64");
    const mimeType   = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    // ── Build user message — include goal context for the analysis step ───────
    const goalContext = label
      ? `Goal: save N${goalAmount.toLocaleString()} in ${months} month(s) for: ${label}`
      : `Goal: save N${goalAmount.toLocaleString()} in ${months} month(s)`;

    // ── Call OpenAI Responses API ─────────────────────────────────────────────
    let responseText;
    try {
      const response = await openai.responses.create({
        model: "gpt-4o",
        instructions: SYSTEM_PROMPT,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_file",
                filename: req.file.originalname,
                file_data: `data:${mimeType};base64,${fileBase64}`,
              },
              {
                type: "input_text",
                text: `Analyse the statement in this file and return the JSON as instructed.\n\n${goalContext}`,
              },
            ],
          },
        ],
      });

      responseText = response.output_text;
    } catch (err) {
      console.error("OpenAI API error:", err.message);
      return res.status(502).json({
        error: `OpenAI API call failed: ${err.message}`,
      });
    }

    // ── Parse LLM JSON output ────────────────────────────────────────────────
    let parsed;
    try {
      // Strip markdown code fences in case the model wraps anyway
      const cleaned = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error("Failed to parse LLM output:", responseText);
      return res.status(502).json({
        error: "The AI returned an unexpected response format. Please try again.",
      });
    }

    // ── Inject the goal (server owns this, not the LLM) ──────────────────────
    parsed.goal = { amount: goalAmount, months, label };

    return res.json(parsed);
  }
);

// ── Multer error handler (file size / type rejections) ────────────────────────
router.use((err, _req, res, _next) => {
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: "Unexpected server error" });
});

module.exports = router;
