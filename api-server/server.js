require("dotenv").config();
const express = require("express");
const cors = require("cors");

const analyzeRouter = require("./routes/analyze");

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use("/api", analyzeRouter);

// ── Health check ───────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── 404 fallback ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Ajo API server running on http://localhost:${PORT}`);
});
