import { type ChangeEvent, type FormEvent, useState } from 'react';
import { ArrowLeft, Check, FileSpreadsheet, LockKeyhole, Sparkle, Upload, WalletCards } from 'lucide-react';
import { createContext, type ReactNode, useContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type AnalysisResponse = {
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

type AnalysisContextValue = {
  response: AnalysisResponse | null;
  setResponse: (response: AnalysisResponse) => void;
};

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) throw new Error('useAnalysis must be used inside AnalysisContext');
  return context;
}

function Logo() {
  return (
    <div className="flex items-center gap-3" data-testid="brand-ajo">
      <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#d6e9d9] text-[#23564d] shadow-[0_4px_12px_-8px_rgba(26,58,52,0.4)]" aria-hidden="true">
        <WalletCards size={20} strokeWidth={1.8} />
      </div>
      <span className="text-[1.18rem] font-semibold tracking-[-0.04em] text-[#204d46]">ajo</span>
    </div>
  );
}

function FileUpload({ file, onFileChange }: { file: File | null; onFileChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="space-y-2.5">
      <label htmlFor="statement-file" className="block text-[0.86rem] font-semibold tracking-[-0.01em] text-[#224d47]">
        Upload your Opay statement (CSV or Excel)
      </label>
      <label
        htmlFor="statement-file"
        className={`group relative flex min-h-[112px] cursor-pointer items-center gap-4 rounded-2xl border border-dashed px-4 py-4 transition-all duration-200 focus-within:ring-4 focus-within:ring-[#abd1b4]/35 ${
          file ? 'border-[#73ae88] bg-[#eff8ef]' : 'border-[#b8cbbd] bg-[#f8faf4] hover:border-[#74a689] hover:bg-[#f0f7ef]'
        }`}
        data-testid="dropzone-statement"
      >
        <input
          id="statement-file"
          name="statement-file"
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={onFileChange}
          className="sr-only"
          data-testid="input-statement-file"
        />
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${file ? 'bg-[#d4ecd8] text-[#357354]' : 'bg-[#e5f0e5] text-[#427b61]'}`} aria-hidden="true">
          {file ? <Check size={20} strokeWidth={2.4} /> : <Upload size={19} strokeWidth={1.8} />}
        </div>
        <div className="min-w-0">
          {file ? (
            <>
              <p className="truncate text-[0.9rem] font-semibold text-[#23564d]" data-testid="text-selected-filename">{file.name}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[0.75rem] font-medium text-[#528565]" data-testid="status-file-ready">
                <Check size={13} strokeWidth={2.5} aria-hidden="true" /> Ready to read
              </p>
            </>
          ) : (
            <>
              <p className="text-[0.87rem] font-semibold text-[#365b53]">Choose a statement file</p>
              <p className="mt-1 text-[0.75rem] leading-5 text-[#758b7d]">Drop it here or browse from your device</p>
            </>
          )}
        </div>
        {!file && <FileSpreadsheet className="ml-auto hidden text-[#98b7a1] sm:block" size={23} strokeWidth={1.4} aria-hidden="true" />}
      </label>
    </div>
  );
}

function FieldLabel({ children, htmlFor, optional = false }: { children: ReactNode; htmlFor: string; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[0.86rem] font-semibold tracking-[-0.01em] text-[#224d47]">
      {children}
      {optional && <span className="ml-1 font-normal text-[#88a094]">(optional)</span>}
    </label>
  );
}

function Home() {
  const [, navigate] = useLocation();
  const { setResponse } = useAnalysis();
  const [file, setFile] = useState<File | null>(null);
  const [goal, setGoal] = useState('');
  const [months, setMonths] = useState('1');
  const [purpose, setPurpose] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) {
      setFile(null);
      return;
    }
    const validExtension = /\.(csv|xlsx)$/i.test(nextFile.name);
    setFile(validExtension ? nextFile : null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !goal || isReading) return;

    setIsReading(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('goalAmount', goal);
      formData.append('months', months);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      const responseBody = (await response.json()) as AnalysisResponse | { error?: string };

      if (!response.ok) {
        throw new Error(
          'error' in responseBody && responseBody.error
            ? responseBody.error
            : 'We could not read that statement.',
        );
      }

      setResponse(responseBody as AnalysisResponse);
      navigate('/insights');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'We could not read that statement.');
    } finally {
      setIsReading(false);
    }
  };

  const canSubmit = Boolean(file && goal);

  return (
    <main className="app-shell paper-grain min-h-[100dvh] overflow-hidden">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1240px] flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
        <header className="float-in flex items-center justify-between" data-testid="header-main">
          <Logo />
          <div className="flex items-center gap-2 text-[0.72rem] font-medium text-[#698176] sm:gap-2.5 sm:text-[0.76rem]">
            <LockKeyhole size={14} strokeWidth={1.8} aria-hidden="true" />
            <span>Private by design</span>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,0.86fr)] lg:gap-24 lg:py-14">
          <section className="float-in-delay max-w-[580px]" aria-labelledby="page-heading">
            <div className="mb-7 flex items-center gap-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[#6b9479]">
              <span className="h-px w-8 bg-[#89b698]" aria-hidden="true" />
              A gentler way to save
            </div>
            <h1 id="page-heading" className="display-font max-w-[570px] text-[clamp(3rem,6.8vw,5.85rem)] leading-[0.96] tracking-[-0.065em] text-[#204d46]">
              Give your money<br />
              <span className="relative inline-block text-[#4d8765]">
                somewhere to go.
                <svg className="absolute -bottom-3 left-0 h-3 w-full overflow-visible text-[#e4b35f]" viewBox="0 0 410 12" fill="none" aria-hidden="true">
                  <path d="M2 8.5C103 3 282 1 408 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-8 max-w-[420px] text-[1rem] leading-7 tracking-[-0.01em] text-[#61776d] sm:text-[1.07rem]">
              Upload your Opay statement and turn everyday spending into a savings plan that feels doable.
            </p>
            <div className="mt-10 flex items-center gap-4 text-[0.76rem] font-medium text-[#6e8379]">
              <div className="flex -space-x-2" aria-hidden="true">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f5f3e9] bg-[#d9b47b] text-[0.62rem] font-bold text-[#5d4930]">A</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f5f3e9] bg-[#9dc3a5] text-[0.62rem] font-bold text-[#315641]">K</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#f5f3e9] bg-[#c0b49f] text-[0.62rem] font-bold text-[#504839]">T</span>
              </div>
              <span>A small step, made clearer.</span>
            </div>
          </section>

          <section className="float-in-late w-full max-w-[520px] lg:justify-self-end" aria-label="Savings plan details">
            <form onSubmit={handleSubmit} className="relative overflow-hidden rounded-[27px] border border-[#dce4d9] bg-[rgba(253,252,246,0.82)] p-5 shadow-[0_24px_70px_-30px_rgba(32,77,70,0.42)] backdrop-blur-[10px] sm:p-8" data-testid="savings-form">
              <div className="absolute right-0 top-0 h-28 w-28 translate-x-8 -translate-y-8 rounded-full bg-[#dcebd9]/55 blur-2xl" aria-hidden="true" />
              <div className="relative">
                <div className="mb-7">
                  <div className="mb-2 flex items-center gap-2 text-[#4a8565]">
                    <Sparkle size={15} strokeWidth={1.8} aria-hidden="true" />
                    <span className="text-[0.72rem] font-bold uppercase tracking-[0.14em]">Start with a check-in</span>
                  </div>
                  <h2 className="display-font text-[1.85rem] leading-tight tracking-[-0.045em] text-[#244f47]">Let’s make a plan.</h2>
                  <p className="mt-2 text-[0.8rem] leading-5 text-[#7b8e83]">A few details is all we need to begin.</p>
                </div>

                <div className="space-y-5">
                  <FileUpload file={file} onFileChange={handleFileChange} />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="savings-goal">How much do you want to save?</FieldLabel>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[0.95rem] font-semibold text-[#729080]" aria-hidden="true">₦</span>
                        <input
                          id="savings-goal"
                          name="savings-goal"
                          type="number"
                          min="1"
                          step="any"
                          value={goal}
                          onChange={(event) => setGoal(event.target.value)}
                          placeholder="e.g. 120,000"
                          className="h-12 w-full rounded-xl border border-[#cfddd0] bg-[#fbfcf7] pl-9 pr-3 text-[0.92rem] font-semibold text-[#244f47] outline-none transition-all placeholder:font-normal placeholder:text-[#a3b3a5] focus:border-[#70a585] focus:ring-4 focus:ring-[#abd1b4]/30"
                          data-testid="input-savings-goal"
                        />
                      </div>
                    </div>
                    <div>
                      <FieldLabel htmlFor="savings-months">In how many months?</FieldLabel>
                      <div className="relative">
                        <input
                          id="savings-months"
                          name="savings-months"
                          type="number"
                          min="1"
                          step="1"
                          value={months}
                          onChange={(event) => setMonths(event.target.value)}
                          className="h-12 w-full rounded-xl border border-[#cfddd0] bg-[#fbfcf7] px-4 pr-16 text-[0.92rem] font-semibold text-[#244f47] outline-none transition-all focus:border-[#70a585] focus:ring-4 focus:ring-[#abd1b4]/30"
                          data-testid="input-savings-months"
                        />
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[0.75rem] font-medium text-[#8a9d90]">months</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <FieldLabel htmlFor="savings-purpose" optional>What's this for?</FieldLabel>
                    <input
                      id="savings-purpose"
                      name="savings-purpose"
                      type="text"
                      value={purpose}
                      onChange={(event) => setPurpose(event.target.value)}
                      placeholder="e.g. rent, phone, or a little breathing room"
                      className="h-12 w-full rounded-xl border border-[#cfddd0] bg-[#fbfcf7] px-4 text-[0.88rem] text-[#244f47] outline-none transition-all placeholder:text-[#a3b3a5] focus:border-[#70a585] focus:ring-4 focus:ring-[#abd1b4]/30"
                      data-testid="input-savings-purpose"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit || isReading}
                  className="mt-7 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#285f53] text-[0.88rem] font-bold tracking-[-0.01em] text-[#f8f7ee] shadow-[0_8px_18px_-9px_rgba(29,82,70,0.8)] transition-all duration-200 hover:bg-[#1f5146] hover:shadow-[0_11px_22px_-10px_rgba(29,82,70,0.9)] focus:outline-none focus:ring-4 focus:ring-[#9bc9a7]/45 active:translate-y-px disabled:cursor-not-allowed disabled:bg-[#c4cec5] disabled:text-[#7d8b80] disabled:shadow-none"
                  data-testid="button-analyze-statement"
                >
                  {isReading ? (
                    <>
                      <span className="soft-spin h-4 w-4 rounded-full border-2 border-[#daeade] border-t-transparent" aria-hidden="true" />
                      <span>Reading your statement...</span>
                    </>
                  ) : (
                    <>
                      <span>Analyze My Statement</span>
                      <span className="text-[1.05rem] leading-none" aria-hidden="true">→</span>
                    </>
                  )}
                </button>
                {errorMessage && (
                  <p className="mt-3 text-center text-[0.75rem] font-medium text-[#a4574c]" role="alert">
                    {errorMessage}
                  </p>
                )}
                <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[0.7rem] text-[#87988d]" data-testid="text-privacy-note">
                  <LockKeyhole size={12} strokeWidth={1.8} aria-hidden="true" />
                  Your statement stays on this device.
                </p>
              </div>
            </form>
          </section>
        </div>

        <footer className="float-in flex items-center justify-between border-t border-[#d7dfd5] pt-5 text-[0.68rem] font-medium text-[#8a9a8f]">
          <span>Small steps count.</span>
          <span>Made for real life</span>
        </footer>
      </div>
    </main>
  );
}

function Insights() {
  const [, navigate] = useLocation();
  const { response } = useAnalysis();

  return (
    <main className="app-shell paper-grain min-h-[100dvh]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1060px] flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
        <header className="float-in flex items-center justify-between">
          <Logo />
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-[0.76rem] font-semibold text-[#4d7763] transition-colors hover:text-[#204d46] focus:outline-none focus:ring-4 focus:ring-[#9bc9a7]/35"
          >
            <ArrowLeft size={15} strokeWidth={1.8} aria-hidden="true" />
            Back to upload
          </button>
        </header>

        <section className="float-in-delay flex flex-1 flex-col justify-center py-14" aria-labelledby="insights-heading">
          <div className="mb-8 max-w-[650px]">
            <div className="mb-4 flex items-center gap-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[#6b9479]">
              <span className="h-px w-8 bg-[#89b698]" aria-hidden="true" />
              Analyzer response
            </div>
            <h1 id="insights-heading" className="display-font text-[clamp(2.8rem,6vw,5.4rem)] leading-[0.96] tracking-[-0.06em] text-[#204d46]">
              Your statement, <span className="text-[#4d8765]">made clear.</span>
            </h1>
            <p className="mt-6 max-w-[520px] text-[1rem] leading-7 text-[#61776d] sm:text-[1.07rem]">
              This is the response returned by the statement analyzer.
            </p>
          </div>

          {response ? (
            <pre
              className="w-full overflow-x-auto rounded-[24px] border border-[#dce4d9] bg-[rgba(253,252,246,0.88)] p-5 text-[0.78rem] leading-6 text-[#315a50] shadow-[0_24px_70px_-30px_rgba(32,77,70,0.35)] sm:p-8 sm:text-[0.86rem]"
              data-testid="analysis-response"
            >
              {JSON.stringify(response, null, 2)}
            </pre>
          ) : (
            <div className="rounded-[24px] border border-[#dce4d9] bg-[rgba(253,252,246,0.88)] p-6 text-[0.9rem] text-[#61776d] shadow-[0_24px_70px_-30px_rgba(32,77,70,0.35)]">
              No analysis response is available yet. Upload a statement to begin.
            </div>
          )}
        </section>

        <footer className="float-in flex items-center justify-between border-t border-[#d7dfd5] pt-5 text-[0.68rem] font-medium text-[#8a9a8f]">
          <span>Small steps count.</span>
          <span>Made for real life</span>
        </footer>
      </div>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/insights" component={Insights} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  const [response, setResponse] = useState<AnalysisResponse | null>(null);

  return (
    <AnalysisContext.Provider value={{ response, setResponse }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AnalysisContext.Provider>
  );
}

export default App;