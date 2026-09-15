import { useLocation, Link } from 'react-router-dom'

// ── Types ──────────────────────────────────────────────────────────────────────
interface AnalysisResult {
  summary: {
    openingBalance: number
    closingBalance: number
    totalDebit: number
    totalCredit: number
  }
  categoryBreakdown: {
    personTransfers: number
    posPayments: number
    airtimeData: number
    other: number
  }
  sampleTransactions: { date: string; description: string; amount: number }[]
  analysis: {
    monthlyNetIncome: number
    requiredMonthlySaving: number
    feasible: boolean
    verdict: string
    insights: string[]
    recommendations: string[]
  }
  goal: { amount: number; months: number; label: string }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return '₦' + Math.abs(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const CATEGORY_LABELS: Record<string, string> = {
  personTransfers: 'Person Transfers',
  posPayments:     'POS Payments',
  airtimeData:     'Airtime & Data',
  other:           'Other',
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="text-4xl mb-4">📂</div>
      <p className="text-slate-600 mb-5 text-sm">
        No data to display — please upload a statement first.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium
          text-indigo-600 hover:text-indigo-800 underline underline-offset-2 transition-colors"
      >
        ← Upload a statement
      </Link>
    </main>
  )
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function InsightsScreen() {
  const { state } = useLocation()

  if (!state) return <EmptyState />

  const data = state as AnalysisResult
  const { summary, categoryBreakdown, sampleTransactions, analysis, goal } = data

  // Guard: analysis field is absent when the API returned old-format data.
  // Tell the user to re-submit rather than crashing.
  if (!analysis) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="text-4xl mb-4">🔄</div>
        <p className="text-slate-700 font-medium mb-2">Results need a refresh</p>
        <p className="text-slate-500 text-sm mb-5">
          The response from the API is missing the analysis. Please upload your statement again.
        </p>
        <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-800
          underline underline-offset-2 transition-colors">
          ← Upload again
        </Link>
      </main>
    )
  }

  const totalSpend = Object.values(categoryBreakdown).reduce((a, b) => a + b, 0)

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Your Savings Analysis
            </h1>
            {goal.label && (
              <p className="mt-0.5 text-sm text-slate-500">
                Goal: <span className="font-medium text-slate-700">{goal.label}</span>
              </p>
            )}
          </div>
          <Link
            to="/"
            id="upload-another-link"
            className="shrink-0 text-sm font-medium text-indigo-600
              hover:text-indigo-800 transition-colors"
          >
            ← Upload another
          </Link>
        </div>

        {/* ── Verdict banner ── */}
        <div
          id="verdict-banner"
          className={`rounded-2xl px-5 py-4 border
            ${analysis.feasible
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
            }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{analysis.feasible ? '✅' : '⚠️'}</span>
            <span className={`text-xs font-semibold uppercase tracking-wider
              ${analysis.feasible ? 'text-emerald-700' : 'text-amber-700'}`}>
              {analysis.feasible ? 'Goal is reachable' : 'Goal needs adjustment'}
            </span>
          </div>
          <p className="text-slate-800 font-medium text-sm leading-snug">
            {analysis.verdict}
          </p>
        </div>

        {/* ── Goal progress ── */}
        <section
          id="goal-section"
          className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            Goal Breakdown
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Save target" value={fmt(goal.amount)} />
            <Stat label="Timeframe" value={`${goal.months} month${goal.months !== 1 ? 's' : ''}`} />
            <Stat label="Needed per month" value={fmt(analysis.requiredMonthlySaving)} highlight />
            <Stat label="Est. monthly net" value={fmt(analysis.monthlyNetIncome)}
              sub={analysis.monthlyNetIncome < analysis.requiredMonthlySaving ? 'Below target' : 'Above target'}
              subColor={analysis.monthlyNetIncome < analysis.requiredMonthlySaving ? 'text-red-500' : 'text-emerald-600'}
            />
          </div>
        </section>

        {/* ── Account summary ── */}
        <section
          id="summary-section"
          className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
        >
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            Account Summary
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Opening balance" value={fmt(summary.openingBalance)} />
            <Stat label="Closing balance" value={fmt(summary.closingBalance)} />
            <Stat label="Total money in" value={fmt(summary.totalCredit)} subColor="text-emerald-600" sub="credit" />
            <Stat label="Total money out" value={fmt(summary.totalDebit)} subColor="text-red-500" sub="debit" />
          </div>
        </section>

        {/* ── Spending breakdown ── */}
        <section
          id="breakdown-section"
          className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3"
        >
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            Where Your Money Went
          </h2>
          {Object.entries(categoryBreakdown).map(([key, amount]) => {
            const pct = totalSpend > 0 ? (amount / totalSpend) * 100 : 0
            return (
              <div key={key} id={`cat-${key}`}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{CATEGORY_LABELS[key]}</span>
                  <span className="font-medium text-slate-800">{fmt(amount)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{pct.toFixed(1)}% of spend</p>
              </div>
            )
          })}
        </section>

        {/* ── Insights ── */}
        <section
          id="insights-section"
          className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3"
        >
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            Spending Insights
          </h2>
          {analysis.insights.map((text, i) => (
            <div key={i} className="flex gap-3">
              <span className="mt-0.5 shrink-0 h-5 w-5 rounded-full bg-indigo-100
                text-indigo-600 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
            </div>
          ))}
        </section>

        {/* ── Recommendations ── */}
        <section
          id="recommendations-section"
          className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3"
        >
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            What To Do Next
          </h2>
          {analysis.recommendations.map((text, i) => (
            <div key={i} className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-emerald-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
            </div>
          ))}
        </section>

        {/* ── Sample transactions ── */}
        <section
          id="transactions-section"
          className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1"
        >
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
            Sample Transactions
          </h2>
          <div className="divide-y divide-slate-100">
            {sampleTransactions.map((tx, i) => (
              <div key={i} className="flex items-start justify-between gap-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{tx.date}</p>
                  <p className="text-sm text-slate-700 truncate">{tx.description}</p>
                </div>
                <span className={`shrink-0 text-sm font-semibold tabular-nums
                  ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {tx.amount >= 0 ? '+' : ''}{fmt(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function Stat({
  label, value, highlight = false, sub, subColor,
}: {
  label: string
  value: string
  highlight?: boolean
  sub?: string
  subColor?: string
}) {
  return (
    <div className={`rounded-xl p-3.5
      ${highlight ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50 border border-slate-100'}`}>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className={`text-base font-bold ${highlight ? 'text-indigo-700' : 'text-slate-800'}`}>
        {value}
      </p>
      {sub && <p className={`text-xs mt-0.5 ${subColor ?? 'text-slate-400'}`}>{sub}</p>}
    </div>
  )
}
