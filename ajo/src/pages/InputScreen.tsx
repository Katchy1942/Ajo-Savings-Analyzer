import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createMockAnalysis } from '../utils/mockData'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const ACCEPTED = '.csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv'

export default function InputScreen() {
	const navigate = useNavigate()

	const [file, setFile] = useState<File | null>(null)
	const [goalAmount, setGoalAmount] = useState('')
	const [months, setMonths] = useState('1')
	const [label, setLabel] = useState('')
	const [loading, setLoading] = useState(false)

	const fileInputRef = useRef<HTMLInputElement>(null)

	function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
		const picked = e.target.files?.[0] ?? null
		setFile(picked)
	}

	const canSubmit = file !== null && goalAmount.trim() !== '' && !loading

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		if (!canSubmit) return

		setLoading(true)

		const parsedGoal = parseFloat(goalAmount) || 50000
		const parsedMonths = parseInt(months, 10) || 1
		const goalLabel = label.trim() || 'Savings Target'

		const body = new FormData()
		body.append('statement', file!)
		body.append('goalAmount', goalAmount)
		body.append('months', months)
		body.append('label', label)

		try {
			const res = await fetch(`${API_BASE}/api/analyze`, {
				method: 'POST',
				body,
			})

			const data = await res.json()

			if (!res.ok) {
				throw new Error(data?.error ?? `Server error (${res.status})`)
			}

			if (!data.analysis) {
				throw new Error('Response is missing AI analysis data')
			}

			navigate('/insights', { state: data })
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'AI analysis failed or server is unreachable.'
			// Fallback: navigate to insights with test data while displaying the error clearly
			const mockData = createMockAnalysis({
				goalAmount: parsedGoal,
				months: parsedMonths,
				label: goalLabel,
				errorNotice: errorMsg,
			})
			navigate('/insights', { state: mockData })
		} finally {
			setLoading(false)
		}
	}

	return (
		<div
			className="min-h-screen flex flex-col
				lg:flex-row bg-white font-sans"
		>
			{/* ── Left — Apple-style Hero ── */}
			<div
				className="flex flex-col justify-between
					w-full lg:w-1/2 p-8
					lg:p-16 bg-black text-white"
			>
				<div>
					<div
						className="inline-flex items-center gap-2
							px-3 py-1 mb-8
							rounded-full bg-zinc-900 border
							border-zinc-800 text-[11px] font-semibold
							tracking-widest uppercase text-zinc-300"
					>
						<span
							className="h-1.5 w-1.5 rounded-full
								bg-emerald-400 animate-pulse"
						/>
						Ajo Intelligence
					</div>

					<h1
						className="text-4xl sm:text-5xl lg:text-6xl
							font-bold tracking-tight leading-[1.08]
							text-white mb-6"
					>
						Know exactly
						<br />
						where your
						<br />
						money goes.
					</h1>

					<p
						className="text-base sm:text-lg text-zinc-400
							leading-relaxed max-w-md mb-12"
					>
						Upload your bank statement and set a target. Our AI analyzes recurring cash flow, categorizes spending, and builds an actionable savings roadmap.
					</p>

					<div
						className="space-y-4 pt-4
							border-t border-zinc-900"
					>
						{[
							'Deep transaction categorization & trend detection',
							'Real-time cash flow & savings feasibility check',
							'Targeted recommendations to hit your goal on time',
						].map((item) => (
							<div
								key={item}
								className="flex items-center gap-3
									text-sm text-zinc-300"
							>
								<div
									className="flex items-center justify-center
										h-5 w-5 rounded-full
										bg-zinc-900 border border-zinc-800
										text-zinc-100 text-xs shrink-0"
								>
									✓
								</div>
								<span>{item}</span>
							</div>
						))}
					</div>
				</div>

				<div
					className="mt-12 pt-8 border-t
						border-zinc-900 flex items-center
						justify-between text-xs text-zinc-500"
				>
					<span>Bank-grade privacy & client-side security</span>
					<span>Hackathon Edition</span>
				</div>
			</div>

			{/* ── Right — Form ── */}
			<div
				className="flex flex-col justify-center
					w-full lg:w-1/2 p-8
					sm:p-12 lg:p-16 bg-white"
			>
				<div
					className="w-full max-w-md mx-auto
						space-y-8"
				>
					<div>
						<h2
							className="text-2xl sm:text-3xl font-bold
								tracking-tight text-black mb-2"
						>
							Analyze Statement
						</h2>
						<p
							className="text-sm text-zinc-500
								leading-relaxed"
						>
							Select your statement file and target savings parameters.
						</p>
					</div>

					<form
						id="savings-form"
						onSubmit={handleSubmit}
						className="space-y-5"
					>
						{/* File Upload Area */}
						<div className="space-y-2">
							<label
								htmlFor="statement-input"
								className="block text-xs font-semibold
									uppercase tracking-wider text-zinc-700"
							>
								Bank Statement (CSV / Excel)
							</label>

							<button
								id="file-pick-btn"
								type="button"
								onClick={() => fileInputRef.current?.click()}
								className="w-full flex flex-col
									items-center justify-center gap-2
									p-6 rounded-2xl border
									border-dashed border-zinc-300 hover:border-black
									bg-zinc-50/50 hover:bg-zinc-50
									transition-all cursor-pointer group"
							>
								<div
									className="flex items-center justify-center
										h-10 w-10 rounded-full
										bg-white border border-zinc-200
										text-zinc-800 group-hover:border-black
										transition-colors"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-5 w-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={1.8}
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
										/>
									</svg>
								</div>
								<span
									className="text-sm font-medium text-zinc-700
										group-hover:text-black"
								>
									{file ? 'Change selected file' : 'Click to select statement'}
								</span>
								<span className="text-xs text-zinc-400">
									Supports Opay CSV or XLSX
								</span>
							</button>

							<input
								ref={fileInputRef}
								id="statement-input"
								type="file"
								accept={ACCEPTED}
								onChange={handleFileChange}
								className="sr-only"
							/>

							{file && (
								<div
									className="flex items-center justify-between
										p-3 rounded-xl bg-zinc-100
										border border-zinc-200 text-xs"
								>
									<div
										className="flex items-center gap-2
											min-w-0 pr-2"
									>
										<span className="font-semibold text-black shrink-0">📄</span>
										<span className="truncate font-medium text-zinc-800">
											{file.name}
										</span>
									</div>
									<span
										className="shrink-0 px-2 py-0.5
											rounded-md bg-black text-white
											font-medium text-[11px]"
									>
										Ready
									</span>
								</div>
							)}
						</div>

						{/* Goal Amount */}
						<div className="space-y-1.5">
							<label
								htmlFor="goal-amount"
								className="block text-xs font-semibold
									uppercase tracking-wider text-zinc-700"
							>
								Savings Target (₦)
							</label>
							<input
								id="goal-amount"
								type="number"
								min={1}
								step="any"
								placeholder="e.g. 50000"
								value={goalAmount}
								onChange={(e) => setGoalAmount(e.target.value)}
								className="w-full px-4 py-3.5
									rounded-xl border border-zinc-300
									bg-white text-sm text-black
									placeholder-zinc-400 focus:outline-none focus:ring-2
									focus:ring-black focus:border-transparent transition"
							/>
						</div>

						{/* Timeline (Months) */}
						<div className="space-y-1.5">
							<label
								htmlFor="months"
								className="block text-xs font-semibold
									uppercase tracking-wider text-zinc-700"
							>
								Target Timeline (Months)
							</label>
							<input
								id="months"
								type="number"
								min={1}
								step={1}
								value={months}
								onChange={(e) => setMonths(e.target.value)}
								className="w-full px-4 py-3.5
									rounded-xl border border-zinc-300
									bg-white text-sm text-black
									placeholder-zinc-400 focus:outline-none focus:ring-2
									focus:ring-black focus:border-transparent transition"
							/>
						</div>

						{/* Goal Label */}
						<div className="space-y-1.5">
							<label
								htmlFor="goal-label"
								className="block text-xs font-semibold
									uppercase tracking-wider text-zinc-700"
							>
								Goal Name <span className="text-zinc-400 font-normal">(optional)</span>
							</label>
							<input
								id="goal-label"
								type="text"
								placeholder="e.g. Rent, Tuition, Emergency Fund"
								value={label}
								onChange={(e) => setLabel(e.target.value)}
								className="w-full px-4 py-3.5
									rounded-xl border border-zinc-300
									bg-white text-sm text-black
									placeholder-zinc-400 focus:outline-none focus:ring-2
									focus:ring-black focus:border-transparent transition"
							/>
						</div>

						{/* Submit Button */}
						<button
							id="analyze-btn"
							type="submit"
							disabled={!canSubmit}
							className="w-full flex items-center
								justify-center gap-2 py-4
								px-6 rounded-xl font-semibold
								text-sm bg-black text-white
								hover:bg-zinc-800 active:scale-[0.99]
								disabled:opacity-40 disabled:cursor-not-allowed
								transition-all"
						>
							{loading ? (
								<>
									<div
										className="h-4 w-4 rounded-full
											border-2 border-white/25 border-t-white
											animate-spin shrink-0"
									/>
									<span>Analyzing Statement…</span>
								</>
							) : (
								'Analyze Statement'
							)}
						</button>

						{/* Loading patience message */}
						{loading && (
							<p
								className="text-center text-xs text-zinc-500
									animate-pulse"
							>
								This might take a moment, your statement is being analyzed.
							</p>
						)}
					</form>
				</div>
			</div>
		</div>
	)
}
