const express = require("express");
const multer  = require("multer");

const { parseOpayStatement } = require("../lib/opayParser");

const router = express.Router();

// ── Multer — memory storage only, never writes to disk ────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB cap
  fileFilter(_req, file, cb) {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/octet-stream", // some browsers send this for .xlsx
    ];
    const ext = file.originalname.split(".").pop().toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      return cb(new Error("Only .xlsx / .xls files are accepted"));
    }
    cb(null, true);
  },
});

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
      return res.status(400).json({
        error: "'goalAmount' must be a positive number.",
      });
    }
    if (isNaN(months) || months <= 0) {
      return res.status(400).json({
        error: "'months' must be a positive integer.",
      });
    }

    // ── Parse spreadsheet ────────────────────────────────────────────────────
    let parsed;
    try {
      parsed = parseOpayStatement(req.file.buffer);
    } catch (err) {
      console.error("Parse error:", err.message);
      return res.status(400).json({
        error: `Could not parse the spreadsheet: ${err.message}`,
      });
    }

    // ── Build response ───────────────────────────────────────────────────────
    return res.json({
      summary:            parsed.summary,
      categoryBreakdown:  parsed.categoryBreakdown,
      sampleTransactions: parsed.sampleTransactions,
      goal: {
        amount: goalAmount,
        months,
        label,
      },
    });
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
