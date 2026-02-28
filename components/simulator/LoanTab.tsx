'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type {
  InvestmentResult,
  InvestmentInput,
  LoanAmortizationRow,
} from '@/services/InvestmentSimulatorService';

interface LoanTabProps {
  result: InvestmentResult;
  input: InvestmentInput;
}

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const fmtDec = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

function Row({ label, value, indent, bold }: { label: string; value: string; indent?: boolean; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 ${bold ? 'border-t border-neutral-200 dark:border-neutral-700 pt-2 mt-1' : ''}`}>
      <span className={`text-sm ${indent ? 'pl-3 text-neutral-400' : bold ? 'font-semibold text-neutral-800 dark:text-neutral-200' : 'text-neutral-600 dark:text-neutral-400'}`}>
        {indent ? '├ ' : ''}{label}
      </span>
      <span className={`text-sm tabular-nums ${bold ? 'font-bold text-neutral-900 dark:text-neutral-100' : 'text-neutral-800 dark:text-neutral-200'}`}>
        {value}
      </span>
    </div>
  );
}

function aggregateByYear(rows: LoanAmortizationRow[]) {
  const years: { year: number; principal: number; interest: number; insurance: number; remaining: number }[] = [];
  for (let i = 0; i < rows.length; i += 12) {
    const chunk = rows.slice(i, i + 12);
    years.push({
      year: Math.floor(i / 12) + 1,
      principal: Math.round(chunk.reduce((s, r) => s + r.principal, 0)),
      interest: Math.round(chunk.reduce((s, r) => s + r.interest, 0)),
      insurance: Math.round(chunk.reduce((s, r) => s + r.insurance, 0)),
      remaining: Math.round(chunk[chunk.length - 1]?.remainingBalance ?? 0),
    });
  }
  return years;
}

export function LoanTab({ result, input }: LoanTabProps) {
  const [showAmortization, setShowAmortization] = useState(false);

  const notaryFees = Math.round(input.purchasePrice * input.notaryFeesRate);
  const guaranteeCost = input.guaranteeCost ?? 0;
  const totalFrais = input.bankFees + guaranteeCost;

  const totalInterest = result.loanAmortization.reduce((s, r) => s + r.interest, 0);
  const totalInsurance = result.loanAmortization.reduce((s, r) => s + r.insurance, 0);
  const totalCreditCost = Math.round(totalInterest + totalInsurance);

  const yearlyData = aggregateByYear(result.loanAmortization);

  return (
    <div className="space-y-6">
      <h3
        className="text-2xl md:text-3xl text-neutral-900 dark:text-neutral-100"
        style={{ fontFamily: 'var(--font-serif-sim), serif' }}
      >
        Comment gérer mon emprunt ?
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Investissement global */}
        <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800">
          <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
            Investissement global
          </h4>
          <Row label="Prix du bien" value={`${fmt(input.purchasePrice)}€`} />
          <Row label="Frais de notaire" value={`${fmt(notaryFees)}€`} />
          {input.renovationCost > 0 && <Row label="Travaux" value={`${fmt(input.renovationCost)}€`} />}
          {input.furnitureCost > 0 && <Row label="Ameublement" value={`${fmt(input.furnitureCost)}€`} />}
          {totalFrais > 0 && <Row label="Frais bancaires" value={`${fmt(totalFrais)}€`} />}
          {input.bankFees > 0 && <Row label="Frais de dossier" value={`${fmt(input.bankFees)}€`} indent />}
          {guaranteeCost > 0 && <Row label="Garantie" value={`${fmt(guaranteeCost)}€`} indent />}
          <Row label="Total" value={`${fmt(result.totalInvestment)}€`} bold />
        </div>

        {/* Votre crédit */}
        <div className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3">
            Votre crédit
          </h4>
          <Row label="Capital emprunté" value={`${fmt(result.loanAmount)}€`} />
          <Row label="Mensualité" value={`${fmt(result.monthlyLoanPayment)}€`} />
          <Row label="Durée" value={`${input.loanDurationYears * 12} mois`} />
          <Row label="Taux" value={`${fmtDec(input.loanRate * 100)}%`} />
          <Row label="Assurance" value={`${fmtDec(input.loanInsuranceRate * 100)}%`} />
          <Row label="Coût du prêt" value={`${fmt(totalCreditCost)}€`} bold />
          <Row label="Intérêts" value={`${fmt(Math.round(totalInterest))}€`} indent />
          <Row label="Assurance" value={`${fmt(Math.round(totalInsurance))}€`} indent />
        </div>
      </div>

      {/* Amortization toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowAmortization(!showAmortization)}
          className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
        >
          {showAmortization ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Tableau d&apos;amortissement
        </button>

        {showAmortization && (
          <div className="mt-3 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                    <th className="text-left px-3 py-2 font-medium text-neutral-500">Année</th>
                    <th className="text-right px-3 py-2 font-medium text-neutral-500">Capital</th>
                    <th className="text-right px-3 py-2 font-medium text-neutral-500">Intérêts</th>
                    <th className="text-right px-3 py-2 font-medium text-neutral-500">Assurance</th>
                    <th className="text-right px-3 py-2 font-medium text-neutral-500">Restant dû</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyData.map((row) => (
                    <tr key={row.year} className="border-b last:border-0 border-neutral-100 dark:border-neutral-800">
                      <td className="px-3 py-2">{row.year}</td>
                      <td className="px-3 py-2 text-right">{fmt(row.principal)}€</td>
                      <td className="px-3 py-2 text-right">{fmt(row.interest)}€</td>
                      <td className="px-3 py-2 text-right">{fmt(row.insurance)}€</td>
                      <td className="px-3 py-2 text-right">{fmt(row.remaining)}€</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
