export interface EquityParams {
  purchasePrice: number;
  downPaymentPct: number;
  annualRate: number;
  termYears: number;
  monthsElapsed: number;
  currentMarketValue: number;
}

export interface EquityResult {
  downPayment: number;
  originalLoan: number;
  monthlyPayment: number;
  remainingPrincipal: number;
  totalPrincipalPaid: number;
  estimatedEquity: number;
  equityPct: number;
  leverageReturn: number;
}

export function calculateEquity(params: EquityParams): EquityResult {
  const { purchasePrice, downPaymentPct, annualRate, termYears, monthsElapsed, currentMarketValue } = params;

  const downPayment = purchasePrice * downPaymentPct;
  const originalLoan = purchasePrice - downPayment;
  const monthlyRate = annualRate / 100 / 12;
  const totalPayments = termYears * 12;

  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = originalLoan / totalPayments;
  } else {
    monthlyPayment = originalLoan * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))
      / (Math.pow(1 + monthlyRate, totalPayments) - 1);
  }

  let remainingPrincipal: number;
  const capped = Math.min(monthsElapsed, totalPayments);
  if (monthlyRate === 0) {
    remainingPrincipal = originalLoan - (monthlyPayment * capped);
  } else {
    remainingPrincipal = originalLoan * Math.pow(1 + monthlyRate, capped)
      - monthlyPayment * (Math.pow(1 + monthlyRate, capped) - 1) / monthlyRate;
  }
  remainingPrincipal = Math.max(0, remainingPrincipal);

  const totalPrincipalPaid = originalLoan - remainingPrincipal;
  const estimatedEquity = currentMarketValue - remainingPrincipal;
  const equityPct = currentMarketValue > 0 ? estimatedEquity / currentMarketValue : 0;
  const leverageReturn = downPayment > 0 ? (estimatedEquity - downPayment) / downPayment : 0;

  return {
    downPayment: Math.round(downPayment),
    originalLoan: Math.round(originalLoan),
    monthlyPayment: Math.round(monthlyPayment),
    remainingPrincipal: Math.round(remainingPrincipal),
    totalPrincipalPaid: Math.round(totalPrincipalPaid),
    estimatedEquity: Math.round(estimatedEquity),
    equityPct: Math.round(equityPct * 1000) / 1000,
    leverageReturn: Math.round(leverageReturn * 1000) / 1000,
  };
}
