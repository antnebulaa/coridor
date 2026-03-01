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

  // This component is ALWAYS on dark background — explicit white text, no dark: prefixes
  return (
    <div className="space-y-6">
      <h3
        className="text-3xl md:text-4xl text-white"
        style={{ fontFamily: 'var(--font-serif-sim), serif' }}
      >
        Quel impact sur mes impôts ?
      </h3>

      <YearSlider
        startYear={startYear}
        endYear={endYear}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        theme="dark"
      />

      {/* Side by side — glassmorphism cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sans investissement */}
        <div
          className="rounded-xl p-4"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <h4 className="text-base font-semibold text-white/60 mb-3">
            Sans investissement
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-base text-white/50">Revenu imposable</span>
              <span className="text-base font-medium text-white/80 tabular-nums">{fmt(yp.taxWithout > 0 ? yp.taxWithout * 3 : 0)}€</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2">
              <span className="text-base font-semibold text-white">Impôt</span>
              <span className="text-base font-bold text-white tabular-nums">{fmt(yp.taxWithout)}€</span>
            </div>
          </div>
        </div>

        {/* Avec investissement */}
        <div
          className="rounded-xl p-4"
          style={{
            background: isReduction ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <h4 className={`text-base font-semibold mb-3 ${
            isReduction ? 'text-emerald-400' : 'text-red-400'
          }`}>
            Avec investissement
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-base text-white/50">Revenus fonciers</span>
              <span className="text-base font-medium text-white/80 tabular-nums">+{fmt(yp.tax > 0 ? yp.grossRent : 0)}€</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2">
              <span className="text-base font-semibold text-white">Impôt total</span>
              <span className="text-base font-bold text-white tabular-nums">{fmt(yp.taxWith)}€</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual comparison bars */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-sm text-white/60">Sans investissement</span>
            <span className="text-sm font-semibold text-white/80 tabular-nums">{fmt(yp.taxWithout)}€</span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(2, (yp.taxWithout / Math.max(yp.taxWithout, yp.taxWith, 1)) * 100)}%`,
                background: 'rgba(255, 255, 255, 0.3)',
              }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1.5">
            <span className={`text-sm ${isReduction ? 'text-emerald-400' : 'text-red-400'}`}>Avec investissement</span>
            <span className={`text-sm font-semibold tabular-nums ${isReduction ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(yp.taxWith)}€</span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
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

      {/* Impact badge */}
      <div
        className="rounded-xl p-4 flex items-center gap-3"
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

      {/* Tax regime comparison table */}
      <div>
        <h4 className="text-base font-semibold mb-3 text-white/70">
          Comparaison des régimes fiscaux
        </h4>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                <th className="text-left px-4 py-2.5 font-medium text-white/50">Régime</th>
                <th className="text-right px-4 py-2.5 font-medium text-white/50">Impôt/an</th>
                <th className="text-right px-4 py-2.5 font-medium text-white/50 hidden sm:table-cell">Cash-flow/m</th>
                <th className="text-right px-4 py-2.5 font-medium text-white/50 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {result.taxRegimeComparison
                .filter((r) => r.eligible)
                .map((r) => (
                  <tr
                    key={r.regime}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      background: r.isRecommended ? 'rgba(212, 146, 42, 0.1)' : undefined,
                    }}
                  >
                    <td className="px-4 py-2.5 font-medium text-white/80">{r.label}</td>
                    <td className="px-4 py-2.5 text-right text-white/80 tabular-nums">{fmt(r.yearlyTax)}€</td>
                    <td className="px-4 py-2.5 text-right hidden sm:table-cell text-white/80 tabular-nums">
                      {r.netCashflow >= 0 ? '+' : ''}{fmt(r.netCashflow)}€
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {r.isRecommended && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(212, 146, 42, 0.2)', color: '#E8A838' }}>
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
