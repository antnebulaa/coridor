'use client';

import { Wallet, BarChart3, Receipt } from 'lucide-react';
import type { InvestmentResult } from '@/services/InvestmentSimulatorService';
import { useCountUp } from '@/hooks/useCountUp';

interface EssentialSummaryProps {
  result: InvestmentResult;
  projectionYears: number;
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR');
}

type CardColor = 'green' | 'orange' | 'red';

function SummaryCard({
  icon,
  title,
  rows,
  color,
  tabId,
  mainValue,
}: {
  icon: React.ReactNode;
  title: string;
  rows: { label: string; value: string; highlight?: boolean }[];
  color: CardColor;
  tabId: string;
  mainValue?: number;
}) {
  const iconBg = {
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
    orange: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
  }[color];

  const animatedMain = useCountUp(mainValue ?? 0, 800, mainValue != null);

  return (
    <div
      className={`rounded-[20px] border border-neutral-200 dark:border-neutral-800 bg-(--sim-bg-card) p-6 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-1`}
      style={{ boxShadow: 'var(--sim-shadow-card-v23)' }}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <h3
          className="text-base font-semibold text-neutral-800 dark:text-neutral-200"
          style={{ fontFamily: 'var(--font-serif-sim), serif' }}
        >
          {title}
        </h3>
      </div>

      {/* Animated main KPI if provided */}
      {mainValue != null && (
        <div className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
          {fmt(animatedMain)}€
        </div>
      )}

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between items-baseline">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {row.label}
            </span>
            <span
              className={`text-base font-medium tabular-nums ${
                row.highlight
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-neutral-900 dark:text-neutral-100'
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          document
            .getElementById(tabId)
            ?.scrollIntoView({ behavior: 'smooth' })
        }
        className="text-sm text-(--sim-amber-500) hover:underline transition-colors mt-auto"
      >
        Voir détail →
      </button>
    </div>
  );
}

export function EssentialSummary({ result, projectionYears }: EssentialSummaryProps) {
  const year1 = result.yearlyProjection[0];
  const year2 = result.yearlyProjection[1];
  const lastYear = result.yearlyProjection[result.yearlyProjection.length - 1];

  const effort1 = year1?.savingsEffort ?? 0;
  const effort2 = year2?.savingsEffort ?? effort1;
  const patrimoine = lastYear?.netWealth ?? 0;

  // Card 1 — Coût
  const costColor: CardColor =
    effort1 >= 0 ? 'green' : effort1 >= -200 ? 'orange' : 'red';

  const costRows = [
    {
      label: 'Année 1',
      value: `${effort1 >= 0 ? '+' : ''}${fmt(effort1)}€/mois`,
      highlight: effort1 >= 0,
    },
    {
      label: 'Années suivantes',
      value: `${effort2 >= 0 ? '+' : ''}${fmt(effort2)}€/mois`,
      highlight: effort2 >= 0,
    },
    {
      label: `Patrimoine à ${projectionYears} ans`,
      value: `${fmt(patrimoine)}€`,
    },
  ];

  // Card 2 — Rentabilité
  const rendement = result.netNetYield;
  const profitColor: CardColor =
    rendement >= 5 ? 'green' : rendement >= 3 ? 'orange' : 'red';

  const profitRows = [
    { label: 'Rendement net-net', value: `${rendement}%` },
    {
      label: 'Cash-flow mensuel',
      value: `${result.monthlyCashflow >= 0 ? '+' : ''}${fmt(result.monthlyCashflow)}€/mois`,
      highlight: result.monthlyCashflow >= 0,
    },
    {
      label: `En ${projectionYears} ans`,
      value: `${fmt(patrimoine)}€`,
    },
  ];

  // Card 3 — Fiscalité
  const diff = result.taxDifference;
  const taxColor: CardColor = diff <= 0 ? 'green' : diff <= 1000 ? 'orange' : 'red';

  const taxRows = [
    { label: 'Impôts sans investissement', value: `${fmt(result.taxWithoutInvestment)}€` },
    { label: 'Impôts avec investissement', value: `${fmt(result.taxWithInvestment)}€` },
    {
      label: diff <= 0 ? 'Économie/an' : 'Surcoût/an',
      value: `${diff > 0 ? '+' : ''}${fmt(diff)}€`,
      highlight: diff <= 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SummaryCard
        icon={<Wallet size={18} />}
        title="Combien ça me coûte ?"
        rows={costRows}
        color={costColor}
        tabId="section-cost"
      />
      <SummaryCard
        icon={<BarChart3 size={18} />}
        title="Combien ça rapporte ?"
        rows={profitRows}
        color={profitColor}
        tabId="section-profitability"
        mainValue={Math.round(patrimoine)}
      />
      <SummaryCard
        icon={<Receipt size={18} />}
        title="Quel impact fiscal ?"
        rows={taxRows}
        color={taxColor}
        tabId="section-fiscal"
      />
    </div>
  );
}
