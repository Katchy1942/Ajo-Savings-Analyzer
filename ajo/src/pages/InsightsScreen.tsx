import { useLocation, Link } from 'react-router-dom'

export default function InsightsScreen() {
  const { state } = useLocation()

  if (!state) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-slate-600 mb-4">
          No data to display — please upload a statement first.
        </p>
        <Link
          to="/"
          className="text-sm font-medium text-indigo-600
            hover:text-indigo-800 underline underline-offset-2 transition-colors"
        >
          ← Back to upload
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Parsed Output
          </h1>
          <Link
            to="/"
            className="text-sm font-medium text-indigo-600
              hover:text-indigo-800 transition-colors"
          >
            ← Upload another
          </Link>
        </div>

        <p className="text-slate-500 text-sm">
          Raw JSON from <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-xs">/api/analyze</code> —
          use this to verify the backend parsed the statement correctly.
        </p>

        {/* JSON debug view */}
        <pre
          id="raw-json-output"
          className="bg-slate-900 text-emerald-300
            rounded-2xl p-6 overflow-x-auto
            text-xs font-mono leading-relaxed
            whitespace-pre-wrap break-words"
        >
          {JSON.stringify(state, null, 2)}
        </pre>
      </div>
    </main>
  )
}
