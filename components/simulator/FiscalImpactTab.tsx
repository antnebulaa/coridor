'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { YearSlider } from './YearSlider';
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

  return (
    <div className="space-y-6">
      <h3
        className="text-2xl md:text-3xl text-neutral-900 dark:text-neutral-100"
        style={{ fontFamily: 'var(--font-serif-sim), serif' }}
      >
        Quel impact sur mes impôts ?
      </h3>

      <YearSlider
        startYear={startYear}
        endYear={endYear}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />

      {/* Side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sans investissement */}
        <div className="bg-(--sim-bg-section) rounded-xl p-4 border border-neutral-200 dark:border-neutral-800">
          <h4 className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-3">
            Sans investissement
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-neutral-500">Revenu imposable</span>
              <span className="text-sm font-medium tabular-nums">{fmt(yp.taxWithout > 0 ? yp.taxWithout * 3 : 0)}€</span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 dark:border-neutral-700 pt-2">
              <span className="text-sm font-semibold">Impôt</span>
              <span className="text-sm font-bold tabular-nums">{fmt(yp.taxWithout)}€</span>
            </div>
          </div>
        </div>

        {/* Avec investissement */}
        <div className={`rounded-xl p-4 border-l-4 border ${
          isReduction
            ? 'bg-(--sim-bg-card) border-emerald-500 border-y-neutral-200 border-r-neutral-200 dark:border-y-neutral-800 dark:border-r-neutral-800'
            : 'bg-(--sim-bg-card) border-red-500 border-y-neutral-200 border-r-neutral-200 dark:border-y-neutral-800 dark:border-r-neutral-800'
        }`}>
          <h4 className={`text-sm font-semibold mb-3 ${
            isReduction
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-red-700 dark:text-red-400'
          }`}>
            Avec investissement
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-neutral-500">Revenus fonciers</span>
              <span className="text-sm font-medium tabular-nums">+{fmt(yp.tax > 0 ? yp.grossRent : 0)}€</span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 dark:border-neutral-700 pt-2">
              <span className="text-sm font-semibold">Impôt total</span>
              <span className="text-sm font-bold tabular-nums">{fmt(yp.taxWith)}€</span>
            </div>
          </div>
        </div>
      </div>

      {/* Impact badge */}
      <div className={`rounded-xl p-4 flex items-center gap-3 border-l-4 ${
        isReduction
          ? 'bg-emerald-50 dark:bg-emerald-950 border-l-emerald-500 border border-emerald-200 dark:border-emerald-800 dark:border-l-emerald-500'
          : 'bg-red-50 dark:bg-red-950 border-l-red-500 border border-red-200 dark:border-red-800 dark:border-l-red-500'
      }`}>
        {isReduction ? (
          <TrendingDown className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
        ) : (
          <TrendingUp className="text-red-600 dark:text-red-400 shrink-0" size={20} />
        )}
        <div>
          <div className={`text-sm font-semibold ${
            isReduction ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
          }`}>
            {isReduction ? "Réduction d'impôts" : 'Hausse des impôts'} : {diff > 0 ? '+' : ''}{fmt(diff)}€/an
          </div>
          <div className="text-xs text-neutral-500 mt-0.5">
            Soit {diff > 0 ? '+' : ''}{fmt(Math.round(diff / 12))}€/mois (inclus dans le coût mensuel)
          </div>
        </div>
      </div>

      {/* Tax regime comparison table */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-neutral-700 dark:text-neutral-300">
          Comparaison des régimes fiscaux
        </h4>
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                <th className="text-left px-4 py-2.5 font-medium text-neutral-600 dark:text-neutral-400">Régime</th>
                <th className="text-right px-4 py-2.5 font-medium text-neutral-600 dark:text-neutral-400">Impôt/an</th>
                <th className="text-right px-4 py-2.5 font-medium text-neutral-600 dark:text-neutral-400 hidden sm:table-cell">Cash-flow/m</th>
                <th className="text-right px-4 py-2.5 font-medium text-neutral-600 dark:text-neutral-400 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {result.taxRegimeComparison
                .filter((r) => r.eligible)
                .map((r) => (
                  <tr
                    key={r.regime}
                    className={`border-b last:border-0 border-neutral-100 dark:border-neutral-800 ${
                      r.isRecommended ? 'bg-emerald-50/50 dark:bg-emerald-950/30' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 font-medium">{r.label}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(r.yearlyTax)}€</td>
                    <td className="px-4 py-2.5 text-right hidden sm:table-cell">
                      {r.netCashflow >= 0 ? '+' : ''}{fmt(r.netCashflow)}€
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {r.isRecommended && (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                          Optimal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
