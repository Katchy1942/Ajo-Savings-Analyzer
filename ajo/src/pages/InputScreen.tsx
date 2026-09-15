import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const ACCEPTED = '.csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv'

export default function InputScreen() {
  const navigate = useNavigate()

  const [file, setFile]             = useState<File | null>(null)
  const [goalAmount, setGoalAmount] = useState('')
  const [months, setMonths]         = useState('1')
  const [label, setLabel]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null
    setFile(picked)
    setError(null)
  }

  const canSubmit = file !== null && goalAmount.trim() !== '' && !loading

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError(null)

    const body = new FormData()
    body.append('statement', file!)
    body.append('goalAmount', goalAmount)
    body.append('months', months)
    body.append('label', label)

    try {
      const res = await fetch(`${API_BASE}/api/analyze`, { method: 'POST', body })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error ?? 'Something went wrong, please try again.')
      }

      navigate('/insights', { state: data })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong, please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">

      {/* ── Left — hero copy ── */}
      <div className="lg:w-1/2 bg-black text-white flex flex-col justify-center px-10 py-16 lg:px-16 lg:py-24">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-zinc-400 mb-6">
          Ajo Savings Planner
        </p>
        <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight mb-6">
          Know exactly where<br />your money goes.
        </h1>
        <p className="text-zinc-400 text-base leading-relaxed max-w-sm mb-10">
          Upload your Opay bank statement and set a savings goal. We'll analyse your spending and tell you if you can hit it — with a plan to get there.
        </p>

        <ul className="space-y-3">
          {[
            'Instant AI-powered analysis',
            'Spending breakdown by category',
            'Personalised savings recommendations',
          ].map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Right — form ── */}
      <div className="lg:w-1/2 flex items-center justify-center px-6 py-14 lg:px-16">
        <div className="w-full max-w-md">
          <h2 className="text-xl font-bold text-black mb-1">Analyse your statement</h2>
          <p className="text-sm text-zinc-500 mb-8">Takes about 15–30 seconds.</p>

          <form id="savings-form" onSubmit={handleSubmit} className="space-y-5">

            {/* File upload */}
            <div className="space-y-1.5">
              <label htmlFor="statement-input" className="block text-sm font-medium text-black">
                Upload your Opay statement (CSV or Excel)
              </label>

              <button
                id="file-pick-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2
                  px-4 py-3 rounded-lg border-2 border-dashed border-zinc-300
                  text-zinc-500 text-sm font-medium
                  hover:border-black hover:text-black
                  transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                {file ? 'Change file' : 'Choose file'}
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
                <div className="flex items-center gap-2 mt-1 text-sm text-zinc-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="shrink-0 inline-flex items-center gap-1
                    px-2 py-0.5 rounded-full text-xs font-medium
                    bg-black text-white">
                    Ready
                  </span>
                </div>
              )}
            </div>

            {/* Goal amount */}
            <div className="space-y-1.5">
              <label htmlFor="goal-amount" className="block text-sm font-medium text-black">
                How much do you want to save? <span className="text-zinc-400">(₦)</span>
              </label>
              <input
                id="goal-amount"
                type="number"
                min={1}
                step="any"
                placeholder="e.g. 50000"
                value={goalAmount}
                onChange={e => setGoalAmount(e.target.value)}
                className="w-full rounded-lg border border-zinc-300
                  px-4 py-3 text-sm text-black placeholder-zinc-400
                  focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent
                  transition"
              />
            </div>

            {/* Months */}
            <div className="space-y-1.5">
              <label htmlFor="months" className="block text-sm font-medium text-black">
                In how many months?
              </label>
              <input
                id="months"
                type="number"
                min={1}
                step={1}
                value={months}
                onChange={e => setMonths(e.target.value)}
                className="w-full rounded-lg border border-zinc-300
                  px-4 py-3 text-sm text-black placeholder-zinc-400
                  focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent
                  transition"
              />
            </div>

            {/* Goal label */}
            <div className="space-y-1.5">
              <label htmlFor="goal-label" className="block text-sm font-medium text-black">
                What's this for?{' '}
                <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <input
                id="goal-label"
                type="text"
                placeholder="e.g. New laptop, rent deposit…"
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="w-full rounded-lg border border-zinc-300
                  px-4 py-3 text-sm text-black placeholder-zinc-400
                  focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent
                  transition"
              />
            </div>

            {/* Submit */}
            <button
              id="analyze-btn"
              type="submit"
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2
                px-4 py-3 rounded-lg text-sm font-semibold
                bg-black text-white
                hover:bg-zinc-800 active:bg-zinc-900
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Analysing…
                </>
              ) : (
                'Analyze My Statement'
              )}
            </button>

            {/* Loading hint */}
            {loading && (
              <p className="text-center text-xs text-zinc-400 pt-1">
                This might take a moment, your statement is being analysed.
              </p>
            )}
          </form>

          {/* Inline error */}
          {error && (
            <p id="form-error" className="mt-4 text-sm text-red-600 text-center">
              {error}
            </p>
          )}
        </div>
      </div>

    </div>
  )
}
