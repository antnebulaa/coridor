'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { InvestmentResult } from '@/services/InvestmentSimulatorService';

interface FiscalImpactTabProps {
  result: InvestmentResult;
  startYear: number;
}

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

export function FiscalImpactTab({ result, startYear }: FiscalImpactTabProps) {
  const endYear = startYear + result.yearlyProjection.length - 1;
  const [selectedYear, setSelectedYear] = useState(startYear);
  const yearIndex = selectedYear - startYear;
  const yp = result.yearlyProjection[yearIndex];

  if (!yp) return null;

  const diff = yp.taxWith - yp.taxWithout;
  const isReduction = diff <= 0;
  const hasSeasonal = result.seasonalRentalIncome > 0;
  const seasonalRent = yp.seasonalRent ?? 0;
  const longTermRent = yp.grossRent - seasonalRent;

  // This component is ALWAYS on dark background — explicit white text, no dark: prefixes
  return (
    <div className="space-y-6">
      <h3
        className="text-3xl md:text-4xl text-white tracking-tight font-medium mb-8"
      >
        Regardons maintenant l&apos;impact sur vos impôts
      </h3>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-neutral-800 p-3 px-4 rounded-xl mb-4">
        <div className="text-left text-xl font-medium text-white/50 bg-dark-800">
        <span className="font-medium text-white">{yearIndex + 1}</span><sup>e</sup> année - Année <span className="font-medium text-white">{selectedYear}</span>
        </div>
        <div className="text-sm text-white/40">
          Régime : <span className="text-white/70 font-medium">{result.usedRegimeLabel}</span>
        </div>
      </div>

      {/* Impact badge */}
      <div
        className="rounded-xl p-4 flex items-center gap-3 mb-10"
        style={{
          background: isReduction ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
        }}
      >
        {isReduction ? (
          <TrendingDown className="text-emerald-400 shrink-0" size={20} />
        ) : (
          <TrendingUp className="text-red-400 shrink-0" size={20} />
        )}
        <div>
          <div className={`text-base font-semibold ${
            isReduction ? 'text-emerald-300' : 'text-red-300'
          }`}>
            {isReduction ? "Réduction d'impôts" : 'Hausse des impôts'} : {diff > 0 ? '+' : ''}{fmt(diff)}€/an
          </div>
          <div className="text-sm text-white/50 mt-0.5">
            Soit {diff > 0 ? '+' : ''}{fmt(Math.round(diff / 12))}€/mois (inclus dans le coût mensuel)
          </div>
        </div>
      </div>

      <input
        type="range"
        min={startYear}
        max={endYear}
        value={selectedYear}
        onChange={(e) => setSelectedYear(Number(e.target.value))}
        className="sim-slider-dark w-full"
      />

      {/* Comparison bars with inline details */}
      <div className="space-y-2 mt-8">
        {/* Sans investissement — bar */}
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-base text-white/60">Sans votre investissement</span>
            <span className="text-sm font-semibold text-white/80 tabular-nums">{fmt(yp.taxWithout)}€/an</span>
          </div>
          <div className="w-full h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(2, (yp.taxWithout / Math.max(yp.taxWithout, yp.taxWith, 1)) * 100)}%`,
                background: 'rgba(255, 255, 255, 0.3)',
              }}
            />
          </div>
        </div>

        {/* Details between bars */}
        <div className="py-2 px-1 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Revenu imposable (salaire)</span>
            <span className="text-white/60 tabular-nums">{fmt(yp.taxWithout > 0 ? yp.taxWithout * 3 : 0)}€</span>
          </div>
          {hasSeasonal ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">+ Revenus longue durée</span>
                <span className="text-white/60 tabular-nums">+{fmt(longTermRent)}€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">+ Revenus saisonniers
                  <span className="text-white/25 ml-1">({result.isSeasonalClassified ? 'classé, −50%' : 'non classé, −30%'})</span>
                </span>
                <span className="text-white/60 tabular-nums">+{fmt(seasonalRent)}€</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-sm">
              <span className="text-white/40">+ Revenus fonciers bruts</span>
              <span className="text-white/60 tabular-nums">+{fmt(yp.tax > 0 ? yp.grossRent : 0)}€</span>
            </div>
          )}
        </div>

        {/* Avec investissement — bar */}
        <div>
          <div className="flex justify-between mb-1.5">
            <span className={`text-base ${isReduction ? 'text-emerald-400' : 'text-red-400'}`}>Avec votre investissement</span>
            <span className={`text-sm font-semibold tabular-nums ${isReduction ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(yp.taxWith)}€/an</span>
          </div>
          <div className="w-full h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(2, (yp.taxWith / Math.max(yp.taxWithout, yp.taxWith, 1)) * 100)}%`,
                background: isReduction ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)',
              }}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-white/30">
        Impôt sur le revenu total (salaire + revenus fonciers), pas uniquement la part liée à l&apos;investissement.
      </p>

      

      {/* Tax regime comparison table — dynamic per selected year */}
      {(() => {
        const yearTaxes = yp.taxByRegime;
        const eligible = result.taxRegimeComparison.filter((r) => r.eligible);
        const ineligible = result.taxRegimeComparison.filter((r) => !r.eligible);

        // Find minimum tax for this year to mark "Optimal"
        const eligibleTaxes = eligible
          .map((r) => ({ ...r, yearTax: yearTaxes[r.regime] ?? r.yearlyTax }))
          .sort((a, b) => a.yearTax - b.yearTax);
        const minTax = eligibleTaxes.length > 0 ? eligibleTaxes[0].yearTax : 0;

        return (
          <div>
            <h4 className="text-base font-semibold mb-3 text-white/70 mt-10">
              Comparaison des régimes fiscaux
            </h4>
            {/* Eligible regimes */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)' }} className="flex px-4 py-2.5 text-sm font-medium text-white/50">
                <span className="flex-1">Régime</span>
                <span className="text-right">Impôt/an</span>
              </div>
              {eligibleTaxes.map((r) => {
                const isBest = r.yearTax === minTax;
                return (
                  <div
                    key={r.regime}
                    className="flex items-center px-4 py-3 text-sm"
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      background: isBest ? 'rgba(185, 89, 45, 0.1)' : undefined,
                    }}
                  >
                    <span className="flex-1 font-medium text-white/80">{r.label}</span>
                    {isBest && (
                      <span className="mr-3 text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: 'rgba(185, 89, 45, 0.2)', color: '#D4703D' }}>
                        Optimal
                      </span>
                    )}
                    <span className="text-right text-white/80 tabular-nums">{fmt(r.yearTax)}€</span>
                  </div>
                );
              })}
            </div>

            {/* Ineligible regimes */}
            {ineligible.length > 0 && (
              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-2 px-1">
                  Non éligibles ({ineligible.length})
                </div>
                <div className="space-y-2">
                  {ineligible.map((r) => (
                    <div
                      key={r.regime}
                      className="flex items-start gap-3 px-4 py-2.5 rounded-xl text-sm"
                      style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white/40">{r.label}</div>
                        {r.reason && (
                          <div className="text-xs text-white/60 mt-0.5 leading-relaxed">{r.reason}</div>
                        )}
                      </div>
                      <span
                        className="text-[10px] px-2.5 py-1 rounded-lg font-medium shrink-0 text-center leading-tight"
                        style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.25)' }}
                      >
                        Non<br />éligible
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
