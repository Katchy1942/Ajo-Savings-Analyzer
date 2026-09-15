import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

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
      const res = await fetch('/api/analyze', { method: 'POST', body })
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
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Savings Planner
          </h1>
          <p className="mt-2 text-slate-500 text-sm">
            Upload your Opay statement to get a personalised savings breakdown.
          </p>
        </div>

        {/* Form */}
        <form
          id="savings-form"
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200
            rounded-2xl shadow-sm p-6 space-y-5"
        >
          {/* ── File upload ── */}
          <div className="space-y-1.5">
            <label
              htmlFor="statement-input"
              className="block text-sm font-medium text-slate-700"
            >
              Upload your Opay statement (CSV or Excel)
            </label>

            <button
              id="file-pick-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2
                px-4 py-3 rounded-xl border-2 border-dashed border-slate-300
                text-slate-500 text-sm font-medium
                hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50
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

            {/* File name + ready badge */}
            {file && (
              <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <span className="truncate flex-1">{file.name}</span>
                <span className="shrink-0 inline-flex items-center gap-1
                  px-2 py-0.5 rounded-full text-xs font-medium
                  bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                  Ready
                </span>
              </div>
            )}
          </div>

          {/* ── Goal amount ── */}
          <div className="space-y-1.5">
            <label
              htmlFor="goal-amount"
              className="block text-sm font-medium text-slate-700"
            >
              How much do you want to save? <span className="text-slate-400">(₦)</span>
            </label>
            <input
              id="goal-amount"
              type="number"
              min={1}
              step="any"
              placeholder="e.g. 50000"
              value={goalAmount}
              onChange={e => setGoalAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-300
                px-4 py-3 text-sm text-slate-800 placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                transition"
            />
          </div>

          {/* ── Months ── */}
          <div className="space-y-1.5">
            <label
              htmlFor="months"
              className="block text-sm font-medium text-slate-700"
            >
              In how many months?
            </label>
            <input
              id="months"
              type="number"
              min={1}
              step={1}
              value={months}
              onChange={e => setMonths(e.target.value)}
              className="w-full rounded-xl border border-slate-300
                px-4 py-3 text-sm text-slate-800 placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                transition"
            />
          </div>

          {/* ── Goal label ── */}
          <div className="space-y-1.5">
            <label
              htmlFor="goal-label"
              className="block text-sm font-medium text-slate-700"
            >
              What's this for?{' '}
              <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="goal-label"
              type="text"
              placeholder="e.g. New laptop, rent deposit…"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full rounded-xl border border-slate-300
                px-4 py-3 text-sm text-slate-800 placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                transition"
            />
          </div>

          {/* ── Submit ── */}
          <button
            id="analyze-btn"
            type="submit"
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2
              px-4 py-3 rounded-xl text-sm font-semibold
              bg-indigo-600 text-white
              hover:bg-indigo-700 active:bg-indigo-800
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Reading your statement…
              </>
            ) : (
              'Analyze My Statement'
            )}
          </button>

          {/* Loading hint */}
          {loading && (
            <p className="text-center text-xs text-slate-400 pt-1">
              This might take a moment — the AI is reading your statement ✨
            </p>
          )}
        </form>

        {/* Inline error */}
        {error && (
          <p
            id="form-error"
            className="mt-4 text-sm text-red-600 text-center"
          >
            {error}
          </p>
        )}
      </div>
    </main>
  )
}
