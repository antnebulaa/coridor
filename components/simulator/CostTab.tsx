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
    <div className={`flex justify-between py-2.5 ${bold ? 'border-t border-neutral-200 dark:border-neutral-700 pt-3 mt-1' : ''}`}>
      <span className={`text-base ${bold ? 'font-semibold text-neutral-800 dark:text-neutral-200' : 'text-neutral-600 dark:text-neutral-400'}`}>
        {label}
      </span>
      <span className={`text-base tabular-nums ${bold ? 'font-semibold text-neutral-900 dark:text-neutral-100' : 'font-medium text-neutral-800 dark:text-neutral-200'}`}>
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

  const totalRevenue = rev.netRent;
  const totalExpenses = Object.values(exp).reduce((a, b) => a + b, 0);
  const maxBar = Math.max(totalRevenue, totalExpenses, 1);

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

  let tip: string | null = null;
  if (effort < 0 && breakEvenYear) {
    const yearsToBreakeven = breakEvenYear - startYear;
    if (yearsToBreakeven <= 5) {
      tip = `En allongeant le prêt de ${yearsToBreakeven} an(s), cet investissement deviendrait autofinancé.`;
    }
  }

  const isAlarming = effort < -500;
  const effortText = effort >= 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : isAlarming
      ? 'text-red-600 dark:text-red-400'
      : 'text-(--sim-effort)';

  return (
    <div className="space-y-6">
      <h3
        className="text-3xl md:text-4xl text-neutral-900 dark:text-neutral-100"
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

      {/* EFFORT HERO — first visible element */}
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: effort >= 0
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02))'
            : isAlarming
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.02))'
              : 'linear-gradient(135deg, var(--sim-effort-bg), transparent)',
        }}
      >
        <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
          Effort d&apos;épargne mensuel
        </div>
        <div
          className={`text-3xl md:text-5xl font-bold tabular-nums ${effortText}`}
          style={{ fontFamily: 'var(--font-serif-sim), serif' }}
        >
          {effort >= 0 ? '+' : ''}{fmt(effort)}€<span className="text-lg md:text-2xl font-normal">/mois</span>
        </div>
        <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 tabular-nums">
          Soit {effort >= 0 ? '+' : ''}{fmt(effort * 12)}€ par an
        </div>
      </div>

      {/* Donut chart — revenus vs dépenses */}
      {(() => {
        const total = totalRevenue + totalExpenses;
        if (total <= 0) return null;
        const revPct = totalRevenue / total;
        const revAngle = revPct * 360;
        const r = 50;
        const cx = 60;
        const cy = 60;
        const circumference = 2 * Math.PI * r;
        const revArc = circumference * revPct;
        const expArc = circumference * (1 - revPct);
        return (
          <div className="flex items-center justify-center gap-6">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth="14" strokeDasharray={`${expArc} ${circumference}`} strokeDashoffset={-revArc} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth="14" strokeDasharray={`${revArc} ${circumference}`} strokeDashoffset="0" transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />
              <text x={cx} y={cy - 6} textAnchor="middle" className="text-xs fill-neutral-500 dark:fill-neutral-400" fontSize="11">Effort</text>
              <text x={cx} y={cy + 10} textAnchor="middle" className="fill-neutral-900 dark:fill-neutral-100" fontSize="14" fontWeight="bold">{effort >= 0 ? '+' : ''}{fmt(effort)}€</text>
            </svg>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Revenus : {fmt(totalRevenue)}€</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Dépenses : {fmt(totalExpenses)}€</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Revenue vs Expense columns with visual bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenus */}
        <div className="bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl p-4">
          <h4 className="text-base font-semibold text-emerald-700 dark:text-emerald-400 mb-3">
            Revenus mensuels
          </h4>
          <Row label="Loyer HC" value={`${fmt(rev.rentHC)}€`} />
          {rev.vacancyDeduction > 0 && (
            <Row label="Vacance locative" value={`-${fmt(rev.vacancyDeduction)}€`} />
          )}
          <Row label="Total revenus" value={`${fmt(totalRevenue)}€`} bold />
          {/* Visual bar */}
          <div className="mt-3 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(totalRevenue / maxBar) * 100}%` }}
            />
          </div>
        </div>

        {/* Dépenses */}
        <div className="bg-red-50/50 dark:bg-red-950/30 rounded-xl p-4">
          <h4 className="text-base font-semibold text-red-700 dark:text-red-400 mb-3">
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
          <Row label="Total dépenses" value={`${fmt(totalExpenses)}€`} bold />
          {/* Visual bar */}
          <div className="mt-3 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-500"
              style={{ width: `${(totalExpenses / maxBar) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
        {message}
      </p>

      {tip && (
        <p className="text-sm text-(--sim-amber-500) font-medium">
          {tip}
        </p>
      )}
    </div>
  );
}
