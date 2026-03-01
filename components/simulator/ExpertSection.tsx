'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Save, FileDown, Settings2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { InvestmentResult, InvestmentInput } from '@/services/InvestmentSimulatorService';
import type { User } from '@prisma/client';
import { PaywallOverlay } from './PaywallOverlay';

interface ExpertSectionProps {
  result: InvestmentResult;
  input: InvestmentInput;
  onSave: () => void;
  user: User | null;
}

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const fmtPct = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

function cashflowBg(value: number, maxAbs: number): string {
  const intensity = Math.min(Math.abs(value) / maxAbs, 1);
  return value >= 0
    ? `rgba(22, 163, 74, ${intensity * 0.15})`
    : `rgba(220, 38, 38, ${intensity * 0.15})`;
}

export function ExpertSection({ result, input, onSave, user }: ExpertSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Condensed mode: show key years only
  const totalYears = result.yearlyProjection.length;
  const displayedYears = useMemo(() => {
    if (showAll) return result.yearlyProjection;
    const keyYears = [1, 5, 10, 15, 20, totalYears];
    return result.yearlyProjection.filter((yp) => keyYears.includes(yp.year));
  }, [showAll, result.yearlyProjection, totalYears]);

  // Max abs cashflow for heatmap normalization
  const maxAbsCashflow = useMemo(() => {
    return Math.max(
      ...result.yearlyProjection.map((yp) => Math.abs(yp.cashflow)),
      ...result.yearlyProjection.map((yp) => Math.abs(yp.cumulativeCashflow)),
      1
    );
  }, [result.yearlyProjection]);

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-(--sim-amber-50) flex items-center justify-center">
            <Settings2 size={14} className="text-(--sim-amber-500)" />
          </span>
          Indicateurs avancés (investisseurs expérimentés)
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-6 border-t border-neutral-200 dark:border-neutral-800">
              <PaywallOverlay isAuthenticated={!!user}>
              {/* KPIs techniques */}
              <div className="grid grid-cols-3 gap-3 pt-4">
                <div className="bg-(--sim-bg-section) rounded-xl p-3 text-center">
                  <div className="text-xs text-neutral-500">TRI</div>
                  <div className="text-lg font-bold tabular-nums">{fmtPct(result.tri)}%</div>
                </div>
                <div className="bg-(--sim-bg-section) rounded-xl p-3 text-center">
                  <div className="text-xs text-neutral-500">VAN</div>
                  <div className="text-lg font-bold tabular-nums">{fmt(result.van)}€</div>
                </div>
                <div className="bg-(--sim-bg-section) rounded-xl p-3 text-center">
                  <div className="text-xs text-neutral-500">Point mort</div>
                  <div className="text-lg font-bold tabular-nums">
                    {result.breakevenMonth
                      ? result.breakevenMonth >= 12
                        ? `${Math.floor(result.breakevenMonth / 12)}a ${result.breakevenMonth % 12}m`
                        : `${result.breakevenMonth}m`
                      : '—'}
                  </div>
                </div>
              </div>

              {/* Yearly projection table */}
              <div>
                <h4
                  className="text-sm font-semibold mb-3 text-neutral-700 dark:text-neutral-300"
                  style={{ fontFamily: 'var(--font-serif-sim), serif' }}
                >
                  Projection annuelle détaillée
                </h4>
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-(--sim-bg-section) border-b border-neutral-200 dark:border-neutral-800">
                        <th className="text-left px-3 py-2 font-medium text-neutral-500 sticky left-0 bg-(--sim-bg-section) z-10">An</th>
                        <th className="text-right px-3 py-2 font-medium text-neutral-500">Loyer brut</th>
                        <th className="text-right px-3 py-2 font-medium text-neutral-500">Loyer net</th>
                        <th className="text-right px-3 py-2 font-medium text-neutral-500">Crédit</th>
                        <th className="text-right px-3 py-2 font-medium text-neutral-500">Impôt</th>
                        <th className="text-right px-3 py-2 font-medium text-neutral-500">Cash-flow</th>
                        <th className="text-right px-3 py-2 font-medium text-neutral-500">Cumulé</th>
                        <th className="text-right px-3 py-2 font-medium text-neutral-500">Valeur</th>
                        <th className="text-right px-3 py-2 font-medium text-neutral-500">Patrimoine</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedYears.map((yp) => (
                        <tr
                          key={yp.year}
                          className="border-b last:border-0 border-neutral-100 dark:border-neutral-800"
                        >
                          <td className="px-3 py-1.5 font-medium sticky left-0 bg-(--sim-bg-card) z-10">{yp.year}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{fmt(yp.grossRent)}€</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{fmt(yp.netRent)}€</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{fmt(yp.loanPayment)}€</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{fmt(yp.tax)}€</td>
                          <td
                            className={`px-3 py-1.5 text-right font-medium tabular-nums ${yp.cashflow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                            style={{ backgroundColor: cashflowBg(yp.cashflow, maxAbsCashflow) }}
                          >
                            {yp.cashflow >= 0 ? '+' : ''}{fmt(yp.cashflow)}€
                          </td>
                          <td
                            className={`px-3 py-1.5 text-right tabular-nums ${yp.cumulativeCashflow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                            style={{ backgroundColor: cashflowBg(yp.cumulativeCashflow, maxAbsCashflow) }}
                          >
                            {yp.cumulativeCashflow >= 0 ? '+' : ''}{fmt(yp.cumulativeCashflow)}€
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{fmt(yp.propertyValue)}€</td>
                          <td className="px-3 py-1.5 text-right font-medium tabular-nums">{fmt(yp.netWealth)}€</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Toggle all years */}
                {totalYears > 6 && (
                  <button
                    type="button"
                    onClick={() => setShowAll(!showAll)}
                    className="mt-3 text-xs text-(--sim-amber-500) hover:underline transition-colors"
                  >
                    {showAll ? 'Réduire' : `Voir les ${totalYears} années`}
                  </button>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onSave}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-linear-to-r from-[#E8A838] via-[#D4922A] to-[#B87A1E] text-white shadow-md hover:shadow-lg transition-all"
                >
                  <Save size={14} />
                  Sauvegarder
                </button>
                <button
                  type="button"
                  onClick={() => {
                    fetch('/api/simulator/export-pdf', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ inputs: input }),
                    })
                      .then((res) => res.blob())
                      .then((blob) => {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = 'rapport-investissement-coridor.pdf';
                        a.click();
                        URL.revokeObjectURL(a.href);
                      });
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <FileDown size={14} />
                  Exporter PDF
                </button>
              </div>
              </PaywallOverlay>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
