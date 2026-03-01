'use client';

import { useState } from 'react';
import { YearSlider } from './YearSlider';
import { useCountUp } from '@/hooks/useCountUp';
import type { InvestmentResult } from '@/services/InvestmentSimulatorService';
import {
  CAPITAL_GAIN_IR_RATE,
  CAPITAL_GAIN_PS_RATE,
  CAPITAL_GAIN_SURTAX_THRESHOLD,
  CAPITAL_GAIN_SURTAX_BRACKETS,
} from '@/lib/simulatorDefaults';

interface ResaleTabProps {
  result: InvestmentResult;
  startYear: number;
  purchasePrice: number;
  notaryFeesRate: number;
  renovationCost: number;
  downPayment: number;
}

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

function calculateCapitalGainTaxClient(grossGain: number, holdingYears: number) {
  if (grossGain <= 0) return { taxIR: 0, taxPS: 0, surtax: 0, total: 0, netGain: grossGain, irAbatement: 0, psAbatement: 0 };

  let irAbatement = 0;
  if (holdingYears >= 22) {
    irAbatement = 1;
  } else {
    for (let y = 6; y <= Math.min(holdingYears, 21); y++) irAbatement += 0.06;
  }
  const taxableGainIR = grossGain * (1 - Math.min(1, irAbatement));
  const taxIR = Math.round(taxableGainIR * CAPITAL_GAIN_IR_RATE);

  let psAbatement = 0;
  if (holdingYears >= 30) {
    psAbatement = 1;
  } else {
    for (let y = 6; y <= Math.min(holdingYears, 21); y++) psAbatement += 0.0165;
    if (holdingYears >= 22) psAbatement += 0.016;
    for (let y = 23; y <= Math.min(holdingYears, 30); y++) psAbatement += 0.09;
  }
  const taxableGainPS = grossGain * (1 - Math.min(1, psAbatement));
  const taxPS = Math.round(taxableGainPS * CAPITAL_GAIN_PS_RATE);

  let surtax = 0;
  if (taxableGainIR > CAPITAL_GAIN_SURTAX_THRESHOLD) {
    for (const bracket of CAPITAL_GAIN_SURTAX_BRACKETS) {
      if (taxableGainIR <= bracket.min) break;
      surtax += (Math.min(taxableGainIR, bracket.max) - bracket.min) * bracket.rate;
    }
    surtax = Math.round(surtax);
  }

  const total = taxIR + taxPS + surtax;
  return { taxIR, taxPS, surtax, total, netGain: grossGain - total, irAbatement, psAbatement };
}

function Row({ label, value, highlight, bold }: { label: string; value: string; highlight?: 'green' | 'red'; bold?: boolean }) {
  const textColor = highlight === 'green'
    ? 'text-emerald-600 dark:text-emerald-400'
    : highlight === 'red'
    ? 'text-red-600 dark:text-red-400'
    : bold
    ? 'text-neutral-900 dark:text-neutral-100'
    : 'text-neutral-800 dark:text-neutral-200';

  return (
    <div className={`flex justify-between py-2.5 ${bold ? 'border-t border-neutral-200 dark:border-neutral-700 pt-3 mt-1' : ''}`}>
      <span className={`text-base ${bold ? 'font-semibold text-neutral-800 dark:text-neutral-200' : 'text-neutral-600 dark:text-neutral-400'}`}>
        {label}
      </span>
      <span className={`text-base tabular-nums ${bold || highlight ? 'font-semibold' : 'font-medium'} ${textColor}`}>
        {value}
      </span>
    </div>
  );
}

export function ResaleTab({ result, startYear, purchasePrice, notaryFeesRate, renovationCost, downPayment }: ResaleTabProps) {
  const endYear = startYear + result.yearlyProjection.length - 1;
  const [selectedYear, setSelectedYear] = useState(Math.min(startYear + 9, endYear));
  const yearIndex = selectedYear - startYear;
  const yp = result.yearlyProjection[yearIndex];

  if (!yp) return null;

  const holdingYears = yearIndex + 1;
  const notaryFees = purchasePrice * notaryFeesRate;
  const acquisitionPrice = purchasePrice + notaryFees + renovationCost;
  const grossGain = yp.propertyValue - acquisitionPrice;

  const pvTax = calculateCapitalGainTaxClient(grossGain, holdingYears);

  // Bilan total
  const cumulCashflow = yp.cumulativeCashflow;
  const capitalRepaid = result.loanAmount - yp.remainingLoan;
  const totalGainNet = pvTax.netGain + cumulCashflow;
  const apportInitial = downPayment > 0 ? downPayment : Math.round(purchasePrice * notaryFeesRate);
  const rendementTotal = apportInitial > 0 ? Math.round((totalGainNet / apportInitial) * 100) : 0;

  const animatedGain = useCountUp(Math.abs(Math.round(totalGainNet)), 800);

  return (
    <div className="space-y-6">
      <h3
        className="text-3xl md:text-4xl text-neutral-900 dark:text-neutral-100"
        style={{ fontFamily: 'var(--font-serif-sim), serif' }}
      >
        Quelle plus-value à la revente ?
      </h3>

      <YearSlider
        startYear={startYear}
        endYear={endYear}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />

      <div className="text-center text-sm text-neutral-500 -mt-2">
        Revente en {selectedYear} ({holdingYears}e année de détention)
      </div>

      {/* Plus-value detail */}
      <div className="bg-(--sim-bg-card) rounded-xl p-4 border border-neutral-200 dark:border-neutral-800">
        <Row label="Prix de revente estimé" value={`${fmt(yp.propertyValue)}€`} />
        <p className="text-xs text-neutral-400 dark:text-neutral-500 -mt-1 mb-1">
          Basé sur une revalorisation annuelle du bien (hypothèse de projection).
        </p>
        <Row label="Prix d'acquisition majoré" value={`-${fmt(Math.round(acquisitionPrice))}€`} />
        <Row label="Plus-value brute" value={`${grossGain >= 0 ? '+' : ''}${fmt(Math.round(grossGain))}€`} bold />

        {grossGain > 0 && (
          <>
            <div className="mt-3" />
            <Row label={`Impôt sur le revenu (19%) — abattement ${Math.round(pvTax.irAbatement * 100)}%`} value={`-${fmt(pvTax.taxIR)}€`} />
            <Row label={`Prélèvements sociaux (17,2%) — abattement ${Math.round(pvTax.psAbatement * 100)}%`} value={`-${fmt(pvTax.taxPS)}€`} />
            {pvTax.surtax > 0 && <Row label="Surtaxe" value={`-${fmt(pvTax.surtax)}€`} />}
            <Row label="Impôt sur la plus-value" value={`-${fmt(pvTax.total)}€`} bold />
          </>
        )}

        <div className="mt-3" />
        <Row
          label="Plus-value nette (ce qui vous reste)"
          value={`${pvTax.netGain >= 0 ? '+' : ''}${fmt(pvTax.netGain)}€`}
          bold
          highlight={pvTax.netGain >= 0 ? 'green' : 'red'}
        />

        {holdingYears >= 22 && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
            Exonération IR atteinte ({holdingYears >= 30 ? 'IR + PS' : 'IR uniquement'})
          </p>
        )}
      </div>

      {/* Bilan total */}
      <div className="bg-neutral-900 dark:bg-neutral-50 rounded-2xl p-5 text-white dark:text-neutral-900">
        <h4 className="text-base font-semibold mb-3 opacity-80">Bilan total de l&apos;opération</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-base opacity-70">Plus-value nette</span>
            <span className="text-base font-medium">{pvTax.netGain >= 0 ? '+' : ''}{fmt(pvTax.netGain)}€</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base opacity-70">Cash-flow cumulé ({holdingYears} ans)</span>
            <span className="text-base font-medium">{cumulCashflow >= 0 ? '+' : ''}{fmt(cumulCashflow)}€</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base opacity-70">Capital remboursé</span>
            <span className="text-base font-medium">+{fmt(Math.round(capitalRepaid))}€</span>
          </div>
          {/* Stacked bar — composition du gain */}
          {(() => {
            const parts = [
              { label: 'Plus-value', value: Math.max(0, pvTax.netGain), color: '#22c55e' },
              { label: 'Cash-flow', value: Math.max(0, cumulCashflow), color: '#3b82f6' },
              { label: 'Capital', value: Math.max(0, Math.round(capitalRepaid)), color: '#a78bfa' },
            ];
            const total = parts.reduce((s, p) => s + p.value, 0);
            if (total <= 0) return null;
            return (
              <div className="mt-2">
                <div className="flex h-4 rounded-full overflow-hidden">
                  {parts.map((p) => p.value > 0 ? (
                    <div
                      key={p.label}
                      className="h-full transition-all duration-500"
                      style={{ width: `${(p.value / total) * 100}%`, backgroundColor: p.color }}
                    />
                  ) : null)}
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  {parts.map((p) => p.value > 0 ? (
                    <span key={p.label} className="flex items-center gap-1.5 text-xs opacity-70">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.label}
                    </span>
                  ) : null)}
                </div>
              </div>
            );
          })()}

          <div className="border-t border-white/20 dark:border-neutral-900/20 pt-3 mt-2 text-center">
            <div className="text-sm opacity-60 mb-1">Gain net total</div>
            <div
              className={`text-3xl md:text-4xl font-bold tabular-nums ${totalGainNet >= 0 ? 'text-emerald-400 dark:text-emerald-600' : 'text-red-400 dark:text-red-600'}`}
              style={{ fontFamily: 'var(--font-serif-sim), serif' }}
            >
              {totalGainNet >= 0 ? '+' : '-'}{fmt(animatedGain)}€
            </div>
          </div>
        </div>
        {/* Rendement pill */}
        <div className="mt-4 flex justify-center">
          <span
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold ${
              rendementTotal >= 0
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
            }`}
          >
            Rendement total : {rendementTotal >= 0 ? '+' : ''}{rendementTotal}% sur {fmt(apportInitial)}€
          </span>
        </div>
      </div>
    </div>
  );
}
