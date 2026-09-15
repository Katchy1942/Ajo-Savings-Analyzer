export interface AnalysisResult {
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
  sampleTransactions: {
    date: string
    description: string
    amount: number
  }[]
  analysis: {
    monthlyNetIncome: number
    requiredMonthlySaving: number
    feasible: boolean
    verdict: string
    insights: string[]
    recommendations: string[]
  }
  goal: {
    amount: number
    months: number
    label: string
  }
  errorNotice?: string
  isDemo?: boolean
}

export function createMockAnalysis(params?: {
  goalAmount?: number
  months?: number
  label?: string
  errorNotice?: string
}): AnalysisResult {
  const goalAmt = params?.goalAmount && params.goalAmount > 0 ? params.goalAmount : 75000
  const targetMonths = params?.months && params.months > 0 ? params.months : 2
  const requiredMonthlySaving = Math.round(goalAmt / targetMonths)
  const monthlyNetIncome = 58500
  const feasible = monthlyNetIncome >= requiredMonthlySaving

  return {
    summary: {
      openingBalance: 14250.00,
      closingBalance: 72750.00,
      totalDebit: 184500.00,
      totalCredit: 243000.00,
    },
    categoryBreakdown: {
      personTransfers: 92400.00,
      posPayments: 48200.00,
      airtimeData: 13900.00,
      other: 30000.00,
    },
    sampleTransactions: [
      { date: '2025-02-28', description: 'Salary / Client Retainer Direct Deposit', amount: 165000.00 },
      { date: '2025-02-27', description: 'Transfer to Femi Adebayo (Shared Utilities)', amount: -32000.00 },
      { date: '2025-02-25', description: 'POS Transfer / The Palms Supermarket VI', amount: -14500.00 },
      { date: '2025-02-23', description: 'Airtime & Data MTN 50GB Monthly Plan', amount: -6500.00 },
      { date: '2025-02-20', description: 'Transfer to Ngozi K. (Weekend Dinner)', amount: -11200.00 },
      { date: '2025-02-17', description: 'POS Transfer / Ebeano Market Lekki', amount: -8900.00 },
      { date: '2025-02-14', description: 'Uber Trip NG Victoria Island to Ikeja', amount: -5400.00 },
    ],
    analysis: {
      monthlyNetIncome,
      requiredMonthlySaving,
      feasible,
      verdict: feasible
        ? `Target reachable. Your historical monthly surplus (₦${monthlyNetIncome.toLocaleString()}) covers the required ₦${requiredMonthlySaving.toLocaleString()}/mo with a ₦${(monthlyNetIncome - requiredMonthlySaving).toLocaleString()} safety margin.`
        : `Target ambitious. You require ₦${requiredMonthlySaving.toLocaleString()}/mo but currently generate ₦${monthlyNetIncome.toLocaleString()}/mo in net surplus. Trim discretionary transfers or adjust timeline to ${Math.ceil(goalAmt / monthlyNetIncome)} months.`,
      insights: [
        'Peer-to-peer transfers account for 50.1% of your overall monthly debit transactions.',
        'Supermarket & dining POS transactions aggregate to ₦48,200 across 12 distinct checkouts.',
        'Consistent monthly inflow observed on the 28th, indicating steady recurring income of ₦165,000.',
      ],
      recommendations: [
        'Set an automated weekly transfer ceiling of ₦18,000 on peer-to-peer payments.',
        'Pre-allocate your required monthly saving (₦' + requiredMonthlySaving.toLocaleString() + ') immediately upon salary credit.',
        'Consolidate multiple small airtime micro-topups into a single discounted data bundle.',
      ],
    },
    goal: {
      amount: goalAmt,
      months: targetMonths,
      label: params?.label?.trim() || 'MacBook Pro / Emergency Fund',
    },
    errorNotice: params?.errorNotice,
    isDemo: true,
  }
}
