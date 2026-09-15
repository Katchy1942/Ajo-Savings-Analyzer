import { useLocation, Link } from 'react-router-dom'
import { type AnalysisResult, createMockAnalysis } from '../utils/mockData'

function fmt(n: number) {
	return '₦' + Math.abs(n).toLocaleString('en-NG', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})
}

const CATEGORY_LABELS: Record<string, string> = {
	personTransfers: 'Person Transfers (P2P)',
	posPayments: 'POS & Card Checkouts',
	airtimeData: 'Airtime & Mobile Data',
	other: 'Other Expenditures',
}

const CATEGORY_BAR_COLORS: Record<string, string> = {
	personTransfers: 'bg-black',
	posPayments: 'bg-zinc-700',
	airtimeData: 'bg-zinc-400',
	other: 'bg-zinc-300',
}

export default function InsightsScreen() {
	const { state } = useLocation()

	// Robust fallback: if state is absent or missing analysis, populate with complete test data
	const data: AnalysisResult = state?.analysis
		? (state as AnalysisResult)
		: createMockAnalysis({
				label: 'Demo Savings Goal',
				errorNotice: !state ? 'No statement was provided in navigation state.' : undefined,
			})

	const { summary, categoryBreakdown, sampleTransactions, analysis, goal, errorNotice } = data
	const totalSpend = Object.values(categoryBreakdown).reduce((a, b) => a + b, 0)
	const isFeasible = analysis.feasible

	return (
		<main
			className="min-h-screen bg-zinc-50
				text-black font-sans px-4
				py-8 sm:px-8 sm:py-12"
		>
			<div
				className="max-w-4xl mx-auto
					space-y-6 sm:space-y-8"
			>
				{/* ── Top Apple-style Navigation Header ── */}
				<header
					className="flex flex-col sm:flex-row
						sm:items-center justify-between gap-4
						pb-6 border-b border-zinc-200"
				>
					<div>
						<div
							className="flex items-center gap-2
								mb-1 text-xs font-semibold
								tracking-[0.18em] uppercase text-zinc-400"
						>
							<span>Ajo Intelligence</span>
							<span>•</span>
							<span>Statement Insights</span>
						</div>
						<h1
							className="text-2xl sm:text-3xl font-bold
								tracking-tight text-black"
						>
							Financial Analysis
						</h1>
						{goal?.label && (
							<p className="text-sm text-zinc-500 mt-0.5">
								Target Objective:{' '}
								<span className="font-semibold text-black">
									{goal.label}
								</span>
							</p>
						)}
					</div>

					<div className="flex items-center gap-3">
						<Link
							to="/"
							id="upload-another-link"
							className="inline-flex items-center gap-2
								px-4 py-2 rounded-full
								border border-zinc-300 hover:border-black
								bg-white text-xs font-semibold
								text-black transition-colors"
						>
							<span>←</span>
							<span>New Analysis</span>
						</Link>
					</div>
				</header>

				{/* ── Error / Hackathon Fallback Notice Banner ── */}
				{errorNotice && (
					<div
						id="fallback-notice-banner"
						className="p-5 rounded-2xl border
							border-zinc-900 bg-black text-white
							space-y-2"
					>
						<div
							className="flex items-center gap-2
								text-xs font-semibold uppercase
								tracking-wider text-zinc-400"
						>
							<span
								className="h-2 w-2 rounded-full
									bg-amber-400 animate-pulse"
							/>
							<span>Live AI Status Notice • Hackathon Simulation Mode</span>
						</div>
						<div className="space-y-1">
							<p className="text-sm font-semibold text-white">
								AI Request Details: <span className="text-zinc-300 font-normal">{errorNotice}</span>
							</p>
							<p className="text-xs text-zinc-400 leading-relaxed">
								The insights are still displyed below using test data.
							</p>
						</div>
					</div>
				)}

				{/* ── Primary Feasibility Banner (Apple Wallet / Health style) ── */}
				<section
					id="verdict-card"
					className="p-6 sm:p-8 rounded-3xl
						border border-zinc-200 bg-white
						space-y-4"
				>
					<div
						className="flex flex-wrap items-center
							justify-between gap-3"
					>
						<span
							className="text-xs font-semibold tracking-widest
								uppercase text-zinc-400"
						>
							Feasibility Assessment
						</span>
						<span
							className={`inline-flex items-center gap-1.5
								px-3 py-1 rounded-full text-xs font-semibold
								${
									isFeasible
										? 'bg-black text-white'
										: 'bg-zinc-200 text-zinc-800'
								}`}
						>
							<span
								className={`h-1.5 w-1.5 rounded-full
									${isFeasible ? 'bg-emerald-400' : 'bg-amber-500'}`}
							/>
							{isFeasible ? 'Target Feasible' : 'Adjustment Recommended'}
						</span>
					</div>

					<p
						className="text-xl sm:text-2xl font-bold
							tracking-tight text-black leading-snug"
					>
						{analysis.verdict}
					</p>

					<div
						className="grid grid-cols-2 sm:grid-cols-4
							gap-3 pt-4 border-t
							border-zinc-100"
					>
						<div
							className="p-4 rounded-2xl bg-zinc-50
								border border-zinc-100"
						>
							<p className="text-xs font-medium text-zinc-400 mb-1">
								Target Goal
							</p>
							<p className="text-lg font-bold text-black tabular-nums">
								{fmt(goal.amount)}
							</p>
							<p className="text-[11px] text-zinc-500 mt-0.5">
								Over {goal.months} {goal.months === 1 ? 'month' : 'months'}
							</p>
						</div>

						<div
							className="p-4 rounded-2xl bg-zinc-50
								border border-zinc-100"
						>
							<p className="text-xs font-medium text-zinc-400 mb-1">
								Monthly Target
							</p>
							<p className="text-lg font-bold text-black tabular-nums">
								{fmt(analysis.requiredMonthlySaving)}
							</p>
							<p className="text-[11px] text-zinc-500 mt-0.5">
								Required per month
							</p>
						</div>

						<div
							className="p-4 rounded-2xl bg-zinc-50
								border border-zinc-100"
						>
							<p className="text-xs font-medium text-zinc-400 mb-1">
								Est. Monthly Net
							</p>
							<p className="text-lg font-bold text-black tabular-nums">
								{fmt(analysis.monthlyNetIncome)}
							</p>
							<p className="text-[11px] text-zinc-500 mt-0.5">
								Inflow minus expenses
							</p>
						</div>

						<div
							className="p-4 rounded-2xl bg-zinc-50
								border border-zinc-100"
						>
							<p className="text-xs font-medium text-zinc-400 mb-1">
								Net Surplus Buffer
							</p>
							<p
								className={`text-lg font-bold tabular-nums
									${
										analysis.monthlyNetIncome >= analysis.requiredMonthlySaving
											? 'text-black'
											: 'text-zinc-600'
									}`}
							>
								{fmt(analysis.monthlyNetIncome - analysis.requiredMonthlySaving)}
							</p>
							<p className="text-[11px] text-zinc-500 mt-0.5">
								{analysis.monthlyNetIncome >= analysis.requiredMonthlySaving
									? 'Discretionary buffer'
									: 'Monthly deficit'}
							</p>
						</div>
					</div>
				</section>

				{/* ── Cash Flow Summary & Category Breakdown Bento ── */}
				<div
					className="grid grid-cols-1 lg:grid-cols-2
						gap-6"
				>
					{/* Account Cash Flow */}
					<section
						id="summary-section"
						className="p-6 rounded-3xl border
							border-zinc-200 bg-white space-y-5"
					>
						<h2
							className="text-xs font-semibold uppercase
								tracking-widest text-zinc-400"
						>
							Statement Cash Flow
						</h2>

						<div className="space-y-3">
							<div
								className="flex items-center justify-between
									p-3.5 rounded-2xl bg-zinc-50
									border border-zinc-100"
							>
								<span className="text-xs font-medium text-zinc-600">
									Opening Balance
								</span>
								<span className="text-sm font-bold text-black tabular-nums">
									{fmt(summary.openingBalance)}
								</span>
							</div>

							<div
								className="flex items-center justify-between
									p-3.5 rounded-2xl bg-zinc-50
									border border-zinc-100"
							>
								<span className="text-xs font-medium text-zinc-600">
									Total Credits (Money In)
								</span>
								<span className="text-sm font-bold text-black tabular-nums">
									+{fmt(summary.totalCredit)}
								</span>
							</div>

							<div
								className="flex items-center justify-between
									p-3.5 rounded-2xl bg-zinc-50
									border border-zinc-100"
							>
								<span className="text-xs font-medium text-zinc-600">
									Total Debits (Money Out)
								</span>
								<span className="text-sm font-bold text-black tabular-nums">
									-{fmt(summary.totalDebit)}
								</span>
							</div>

							<div
								className="flex items-center justify-between
									p-3.5 rounded-2xl bg-black
									text-white"
							>
								<span className="text-xs font-medium text-zinc-300">
									Closing Balance
								</span>
								<span className="text-sm font-bold text-white tabular-nums">
									{fmt(summary.closingBalance)}
								</span>
							</div>
						</div>
					</section>

					{/* Category Spend Breakdown */}
					<section
						id="breakdown-section"
						className="p-6 rounded-3xl border
							border-zinc-200 bg-white space-y-5"
					>
						<div
							className="flex items-center justify-between
								gap-2"
						>
							<h2
								className="text-xs font-semibold uppercase
									tracking-widest text-zinc-400"
							>
								Expenditure Breakdown
							</h2>
							<span className="text-xs font-semibold text-zinc-500">
								Total: {fmt(totalSpend)}
							</span>
						</div>

						{/* Apple-style Multi-segment Progress Bar */}
						<div
							className="h-3 w-full rounded-full
								bg-zinc-100 overflow-hidden flex"
						>
							{Object.entries(categoryBreakdown).map(([key, amount]) => {
								const pct = totalSpend > 0 ? (amount / totalSpend) * 100 : 0
								if (pct <= 0) return null
								return (
									<div
										key={key}
										style={{ width: `${pct}%` }}
										className={`h-full ${CATEGORY_BAR_COLORS[key] ?? 'bg-zinc-400'} transition-all`}
										title={`${CATEGORY_LABELS[key]}: ${pct.toFixed(1)}%`}
									/>
								)
							})}
						</div>

						{/* Category Legend & List */}
						<div className="space-y-3 pt-1">
							{Object.entries(categoryBreakdown).map(([key, amount]) => {
								const pct = totalSpend > 0 ? (amount / totalSpend) * 100 : 0
								return (
									<div
										key={key}
										id={`cat-${key}`}
										className="flex items-center justify-between
											text-xs"
									>
										<div className="flex items-center gap-2.5">
											<span
												className={`h-2.5 w-2.5 rounded-full
													${CATEGORY_BAR_COLORS[key] ?? 'bg-zinc-400'} shrink-0`}
											/>
											<span className="font-medium text-zinc-700">
												{CATEGORY_LABELS[key] ?? key}
											</span>
										</div>
										<div className="flex items-center gap-3">
											<span className="text-zinc-400 tabular-nums">
												{pct.toFixed(1)}%
											</span>
											<span className="font-semibold text-black tabular-nums">
												{fmt(amount)}
											</span>
										</div>
									</div>
								)
							})}
						</div>
					</section>
				</div>

				{/* ── Analytical Insights (Apple Notes style) ── */}
				<section
					id="insights-section"
					className="p-6 sm:p-8 rounded-3xl
						border border-zinc-200 bg-white
						space-y-4"
				>
					<h2
						className="text-xs font-semibold uppercase
							tracking-widest text-zinc-400"
					>
						Key Observations & Patterns
					</h2>

					<div className="space-y-3">
						{analysis.insights.map((text, i) => (
							<div
								key={i}
								className="flex items-start gap-4
									p-4 rounded-2xl bg-zinc-50
									border border-zinc-100"
							>
								<span
									className="flex items-center justify-center
										h-6 w-6 rounded-full
										bg-black text-white text-xs
										font-bold shrink-0 mt-0.5"
								>
									{i + 1}
								</span>
								<p
									className="text-sm font-medium text-zinc-800
										leading-relaxed"
								>
									{text}
								</p>
							</div>
						))}
					</div>
				</section>

				{/* ── Actionable Next Steps (Apple Reminders style) ── */}
				<section
					id="recommendations-section"
					className="p-6 sm:p-8 rounded-3xl
						border border-zinc-200 bg-white
						space-y-4"
				>
					<h2
						className="text-xs font-semibold uppercase
							tracking-widest text-zinc-400"
					>
						Actionable Savings Plan
					</h2>

					<div className="space-y-3">
						{analysis.recommendations.map((text, i) => (
							<div
								key={i}
								className="flex items-start gap-3.5
									p-4 rounded-2xl border
									border-zinc-200 bg-white"
							>
								<div
									className="flex items-center justify-center
										h-5 w-5 rounded-full
										border-2 border-black text-black
										shrink-0 mt-0.5"
								>
									<div className="h-2 w-2 rounded-full bg-black" />
								</div>
								<p
									className="text-sm font-medium text-black
										leading-relaxed"
								>
									{text}
								</p>
							</div>
						))}
					</div>
				</section>

				{/* ── Transaction Ledger (Apple Wallet style) ── */}
				<section
					id="transactions-section"
					className="p-6 sm:p-8 rounded-3xl
						border border-zinc-200 bg-white
						space-y-4"
				>
					<div
						className="flex items-center justify-between
							gap-2"
					>
						<h2
							className="text-xs font-semibold uppercase
								tracking-widest text-zinc-400"
						>
							Sample Transaction Ledger
						</h2>
						<span className="text-xs text-zinc-400">
							Opay Transaction Activity
						</span>
					</div>

					<div className="divide-y divide-zinc-100">
						{sampleTransactions.map((tx, i) => (
							<div
								key={i}
								className="flex items-center justify-between
									py-3.5 gap-4"
							>
								<div className="min-w-0 flex-1">
									<p className="text-[11px] font-medium text-zinc-400 mb-0.5">
										{tx.date}
									</p>
									<p className="text-sm font-medium text-black truncate">
										{tx.description}
									</p>
								</div>
								<span
									className={`text-sm font-semibold tabular-nums
										shrink-0 ${tx.amount >= 0 ? 'text-black font-bold' : 'text-zinc-600'}`}
								>
									{tx.amount >= 0 ? '+' : ''}
									{fmt(tx.amount)}
								</span>
							</div>
						))}
					</div>
				</section>

				{/* ── Footer ── */}
				<footer
					className="text-center py-6 text-xs
						text-zinc-400"
				>
					Ajo Savings Intelligence • Hackathon Edition
				</footer>
			</div>
		</main>
	)
}
