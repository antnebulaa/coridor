'use client';

import { useState, useMemo } from 'react';
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
  isDonation?: boolean;
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

function Row({ label, value, highlight, bold, sub }: { label: string; value: string; highlight?: 'green' | 'red'; bold?: boolean; sub?: string }) {
  const textColor = highlight === 'green'
    ? 'text-emerald-600 dark:text-emerald-400'
    : highlight === 'red'
    ? 'text-red-600 dark:text-red-400'
    : bold
    ? 'text-neutral-900 dark:text-neutral-100'
    : 'text-neutral-800 dark:text-neutral-200';

  return (
    <div className={`flex justify-between items-baseline gap-4 py-1 ${bold ? 'border-t border-neutral-200 dark:border-neutral-700 pt-2 mt-1' : ''}`}>
      <div className="min-w-0">
        <span className={`text-sm ${bold ? 'font-semibold text-neutral-800 dark:text-neutral-200' : 'text-neutral-600 dark:text-neutral-400'}`}>
          {label}
        </span>
        {sub && (
          <span className="block text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{sub}</span>
        )}
      </div>
      <span className={`text-sm tabular-nums shrink-0 ${bold || highlight ? 'font-semibold' : 'font-medium'} ${textColor}`}>
        {value}
      </span>
    </div>
  );
}

export function ResaleTab({ result, startYear, purchasePrice, notaryFeesRate, renovationCost, downPayment, isDonation }: ResaleTabProps) {
  const endYear = startYear + result.yearlyProjection.length - 1;
  const [selectedYear, setSelectedYear] = useState(Math.min(startYear + 9, endYear));
  const yearIndex = selectedYear - startYear;
  const yp = result.yearlyProjection[yearIndex];

  if (!yp) return null;

  const holdingYears = yearIndex + 1;
  const notaryFees = isDonation ? 0 : purchasePrice * notaryFeesRate;
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

  // Find first year where total gain net turns positive
  const breakEvenYear = useMemo(() => {
    if (totalGainNet >= 0) return null; // already positive, no need
    for (let i = yearIndex + 1; i < result.yearlyProjection.length; i++) {
      const projYp = result.yearlyProjection[i];
      const gGain = projYp.propertyValue - acquisitionPrice;
      const hYears = i + 1;
      const tax = calculateCapitalGainTaxClient(gGain, hYears);
      const totalNet = tax.netGain + projYp.cumulativeCashflow;
      if (totalNet >= 0) return startYear + i;
    }
    return null; // never turns positive within projection
  }, [totalGainNet, yearIndex, result.yearlyProjection, acquisitionPrice, startYear]);

  // Detect milestone years on the slider
  const milestones = useMemo(() => {
    const totalYears = result.yearlyProjection.length;
    const marks: { year: number; label: string; color: string }[] = [];

    // Find year where gross gain turns positive (PV appears)
    let firstPositiveGainYear: number | null = null;
    for (let i = 0; i < totalYears; i++) {
      const projYp = result.yearlyProjection[i];
      const gGain = projYp.propertyValue - acquisitionPrice;
      if (gGain > 0 && firstPositiveGainYear === null) {
        firstPositiveGainYear = startYear + i;
        break;
      }
    }
    if (firstPositiveGainYear) {
      marks.push({ year: firstPositiveGainYear, label: 'Plus-value imposable à partir de cette année', color: '#f59e0b' });
    }

    // Year 6 of holding = start of IR abatement
    const abatementStart = startYear + 5;
    if (abatementStart <= endYear) {
      marks.push({ year: abatementStart, label: 'Début abattement Impôts sur le Revenu', color: '#3b82f6' });
    }

    // Year 22 = full IR exemption
    const irExemption = startYear + 21;
    if (irExemption <= endYear) {
      marks.push({ year: irExemption, label: 'Exonération IR', color: '#22c55e' });
    }

    // Year 30 = full PS exemption (total)
    const psExemption = startYear + 29;
    if (psExemption <= endYear) {
      marks.push({ year: psExemption, label: 'Exonération totale', color: '#10b981' });
    }

    return marks;
  }, [result.yearlyProjection, acquisitionPrice, startYear, endYear]);

  // Active milestone = the one matching selected year
  const activeMilestone = milestones.find((m) => m.year === selectedYear);

  return (
    <div className="space-y-6">
      <h3
        className="text-3xl font-medium md:text-4xl text-neutral-900 dark:text-neutral-100"
      >
        Quelle plus-value à la revente?
      </h3>

      <div className="text-left text-2xl font-medium text-neutral-400 mt-12">
        Revente en <span className="font-medium text-neutral-800 dark:text-neutral-100">{selectedYear}</span>
        <br />
        <span className="font-medium text-neutral-800 dark:text-neutral-100">{holdingYears}</span><sup>e</sup> année de détention
      </div>

      {/* Slider with milestone markers on the track */}
      <div className="pt-3">
        <div className="relative">
          <input
            type="range"
            min={startYear}
            max={endYear}
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="sim-slider w-full relative z-10"
          />
          {/* Milestone dots on the track */}
          {milestones.map((m) => {
            const pct = (m.year - startYear) / (endYear - startYear);
            return (
              <button
                key={m.year}
                type="button"
                onClick={() => setSelectedYear(m.year)}
                className="absolute bottom-2 -translate-x-1/2 z-5"
                style={{ left: `calc(12px + ${pct} * (100% - 24px))` }}
              >
                <div
                  className="w-3.5 h-7 rounded-full border-2 border-white dark:border-neutral-900"
                  style={{ backgroundColor: m.color, boxShadow: `0 0 0 0px ${m.color}33` }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Active milestone callout */}
      {activeMilestone && (
        <div
          className="rounded-xl px-4 py-2.5 text-sm font-medium"
          style={{ backgroundColor: `${activeMilestone.color}15`, color: activeMilestone.color }}
        >
          {activeMilestone.label} — année {holdingYears}
        </div>
      )}

      {/* Plus-value detail */}
      <div className="bg-(--sim-bg-card) rounded-3xl p-4 border border-neutral-200 dark:border-neutral-800">
        <Row label="Prix de revente estimé" value={`${fmt(yp.propertyValue)}€`} sub="Basé sur une revalorisation annuelle du bien (hypothèse de projection)." />
        <Row
          label={isDonation ? 'Valeur déclarée (donation/héritage)' : "Prix d'acquisition majoré"}
          value={`-${fmt(Math.round(acquisitionPrice))}€`}
          sub={isDonation ? 'Valeur du bien au moment de la transmission + travaux éventuels.' : undefined}
        />
        <Row label="Plus-value brute" value={`${grossGain >= 0 ? '+' : ''}${fmt(Math.round(grossGain))}€`} bold />

        {grossGain > 0 && (
          <>
            <div className="mt-3" />
            <Row label="Impôt sur le revenu (19%)" value={`-${fmt(pvTax.taxIR)}€`} sub={`Abattement ${Math.round(pvTax.irAbatement * 100)}%`} />
            <Row label="Prélèvements sociaux (17,2%)" value={`-${fmt(pvTax.taxPS)}€`} sub={`Abattement ${Math.round(pvTax.psAbatement * 100)}%`} />
            {pvTax.surtax > 0 && <Row label="Surtaxe" value={`-${fmt(pvTax.surtax)}€`} />}
            <Row label="Impôt sur la plus-value" value={`-${fmt(pvTax.total)}€`} bold />
          </>
        )}

        <div className="mt-3" />
        <Row
          label="Plus-value nette (après impôts)"
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
      <div className="bg-neutral-900 dark:bg-neutral-50 rounded-3xl p-5 text-white dark:text-neutral-900">
        <h4 className="text-base font-semibold mb-3 opacity-80">Bilan total de l&apos;opération</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm opacity-70">Plus-value nette</span>
            <span className="text-sm font-medium">{pvTax.netGain >= 0 ? '+' : ''}{fmt(pvTax.netGain)}€</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm opacity-70">Cash-flow cumulé ({holdingYears} ans)</span>
            <span className="text-sm font-medium">{cumulCashflow >= 0 ? '+' : ''}{fmt(cumulCashflow)}€</span>
          </div>
          {capitalRepaid > 0 && (
            <div className="flex justify-between">
              <span className="text-sm opacity-70">Capital remboursé</span>
              <span className="text-sm font-medium">+{fmt(Math.round(capitalRepaid))}€</span>
            </div>
          )}
          {/* Stacked bar — composition du gain */}
          {(() => {
            const parts = [
              { label: 'Plus-value', value: Math.max(0, pvTax.netGain), color: '#22c55e' },
              { label: 'Cash-flow', value: Math.max(0, cumulCashflow), color: '#833BFF' },
              { label: 'Capital', value: Math.max(0, Math.round(capitalRepaid)), color: '#a78bfa' },
            ];
            const total = parts.reduce((s, p) => s + p.value, 0);
            if (total <= 0) return null;
            return (
              <div className="my-6">
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
            <div className="text-base opacity-80 mb-1">Gain net total</div>
            <div
              className={`text-4xl p-4 md:text-4xl font-bold tabular-nums ${totalGainNet >= 0 ? 'text-emerald-400 dark:text-emerald-600' : 'text-red-400 dark:text-red-600'}`}
              style={{ fontFamily: 'var(--font-nunito-sim), sans-serif' }}
            >
              {totalGainNet >= 0 ? '+' : '-'}{fmt(animatedGain)}€
            </div>
            {totalGainNet < 0 && breakEvenYear && (
              <p className="text-sm opacity-60 mt-1">
                Positif à partir de {breakEvenYear} (année {breakEvenYear - startYear + 1})
              </p>
            )}
            {totalGainNet < 0 && !breakEvenYear && (
              <p className="text-sm opacity-60 mt-1">
                Non rentable sur la durée de projection
              </p>
            )}
          </div>
        </div>
        {/* Rendement pill */}
        <div className="mt-4 flex justify-center">
          {apportInitial > 0 ? (
            <span
              className={`inline-flex items-center gap-2 mb-3 px-5 py-2.5 rounded-full text-sm font-semibold ${
                rendementTotal >= 0
                  ? 'bg-neutral-100 dark:bg-neutral-900/40 text-neutral-700 dark:text-neutral-300'
                  : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
              }`}
            >
              Rendement total : {rendementTotal >= 0 ? '+' : ''}{rendementTotal}% sur {fmt(apportInitial)}€
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
              Bien reçu gratuitement — gain net : {totalGainNet >= 0 ? '+' : ''}{fmt(Math.round(totalGainNet))}€
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
