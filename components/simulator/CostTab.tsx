'use client';

import { useState } from 'react';
import { YearSlider } from './YearSlider';
import type { InvestmentResult } from '@/services/InvestmentSimulatorService';

interface CostTabProps {
  result: InvestmentResult;
  startYear: number;
}

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 ${bold ? 'border-t border-neutral-200 dark:border-neutral-700 pt-2 mt-1' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-neutral-800 dark:text-neutral-200' : 'text-neutral-600 dark:text-neutral-400'}`}>
        {label}
      </span>
      <span className={`text-sm tabular-nums ${bold ? 'font-semibold text-neutral-900 dark:text-neutral-100' : 'text-neutral-800 dark:text-neutral-200'}`}>
        {value}
      </span>
    </div>
  );
}

export function CostTab({ result, startYear }: CostTabProps) {
  const endYear = startYear + result.yearlyProjection.length - 1;
  const [selectedYear, setSelectedYear] = useState(startYear);
  const yearIndex = selectedYear - startYear;
  const yp = result.yearlyProjection[yearIndex];

  if (!yp) return null;

  const rev = yp.monthlyRevenueBreakdown;
  const exp = yp.monthlyExpenseBreakdown;
  const effort = yp.savingsEffort;

  // Find breakeven year
  const breakEvenIdx = result.yearlyProjection.findIndex((y) => y.savingsEffort >= 0);
  const breakEvenYear = breakEvenIdx >= 0 ? startYear + breakEvenIdx : null;

  let message: string;
  if (effort >= 0 && yearIndex === 0) {
    message = "Cet investissement s'autofinance dès le départ.";
  } else if (breakEvenYear && breakEvenYear > selectedYear) {
    message = `Cash-flow positif à partir de ${breakEvenYear}. Encore ${breakEvenYear - selectedYear} an(s) d'effort.`;
  } else if (breakEvenYear && selectedYear >= breakEvenYear) {
    message = `Cash-flow positif depuis ${breakEvenYear}. L'investissement s'autofinance.`;
  } else {
    message = "Cet investissement nécessite un effort d'épargne constant sur la durée du prêt.";
  }

  // Dynamic tip: if extending loan would lead to breakeven
  let tip: string | null = null;
  if (effort < 0 && breakEvenYear) {
    const yearsToBreakeven = breakEvenYear - startYear;
    if (yearsToBreakeven <= 5) {
      tip = `En allongeant le prêt de ${yearsToBreakeven} an(s), cet investissement deviendrait autofinancé.`;
    }
  }

  // Effort color: green if positive, grey warm if moderate, red only if alarming (>500€/mois)
  const isAlarming = effort < -500;
  const effortBg = effort >= 0
    ? 'bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800'
    : isAlarming
      ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
      : 'bg-(--sim-effort-bg) border border-neutral-200 dark:border-neutral-700';
  const effortText = effort >= 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : isAlarming
      ? 'text-red-600 dark:text-red-400'
      : 'text-(--sim-effort)';

  return (
    <div className="space-y-6">
      <h3
        className="text-2xl md:text-3xl text-neutral-900 dark:text-neutral-100"
        style={{ fontFamily: 'var(--font-serif-sim), serif' }}
      >
        Combien ça me coûte par mois ?
      </h3>

      <YearSlider
        startYear={startYear}
        endYear={endYear}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenus */}
        <div className="bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3">
            Revenus mensuels
          </h4>
          <Row label="Loyer HC" value={`${fmt(rev.rentHC)}€`} />
          {rev.vacancyDeduction > 0 && (
            <Row label="Vacance locative" value={`-${fmt(rev.vacancyDeduction)}€`} />
          )}
          <Row label="Total revenus" value={`${fmt(rev.netRent)}€`} bold />
        </div>

        {/* Dépenses */}
        <div className="bg-red-50/50 dark:bg-red-950/30 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">
            Dépenses mensuelles
          </h4>
          {exp.loanPayment > 0 && <Row label="Mensualité crédit" value={`${fmt(exp.loanPayment)}€`} />}
          {exp.loanInsurance > 0 && <Row label="Assurance prêt" value={`${fmt(exp.loanInsurance)}€`} />}
          {exp.propertyTax > 0 && <Row label="Taxe foncière" value={`${fmt(exp.propertyTax)}€`} />}
          {exp.insurancePNO > 0 && <Row label="Assurance PNO" value={`${fmt(exp.insurancePNO)}€`} />}
          {exp.coproCharges > 0 && <Row label="Copropriété" value={`${fmt(exp.coproCharges)}€`} />}
          {exp.gli > 0 && <Row label="GLI" value={`${fmt(exp.gli)}€`} />}
          {exp.management > 0 && <Row label="Gestion locative" value={`${fmt(exp.management)}€`} />}
          {exp.maintenance > 0 && <Row label="Entretien" value={`${fmt(exp.maintenance)}€`} />}
          {exp.otherCharges > 0 && <Row label="Autres charges" value={`${fmt(exp.otherCharges)}€`} />}
          {exp.monthlyTax > 0 && <Row label="Impôts fonciers" value={`${fmt(exp.monthlyTax)}€`} />}
          <Row
            label="Total dépenses"
            value={`${fmt(Object.values(exp).reduce((a, b) => a + b, 0))}€`}
            bold
          />
        </div>
      </div>

      {/* Effort d'épargne */}
      <div className={`rounded-xl p-4 text-center ${effortBg}`}>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
          Effort d&apos;épargne mensuel
        </div>
        <div className={`text-2xl font-bold tabular-nums ${effortText}`}>
          {effort >= 0 ? '+' : ''}{fmt(effort)}€/mois
        </div>
        <div className="text-xs text-neutral-500 mt-1 tabular-nums">
          Soit {effort >= 0 ? '+' : ''}{fmt(effort * 12)}€/an
        </div>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400 italic">
        {message}
      </p>

      {tip && (
        <p className="text-xs text-(--sim-amber-500) font-medium">
          💡 {tip}
        </p>
      )}
    </div>
  );
}
