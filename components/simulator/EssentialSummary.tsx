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
  rows: { label: string; value: string; highlight?: boolean; bold?: boolean }[];
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
      className={`rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 p-5 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-1`}
     
    >
      <div className="flex items-center">
        
        <h3
          className="text-base  tracking-tight font-medium text-neutral-800 dark:text-neutral-200"
          
        >
          {title}
        </h3>
      </div>

      {/* Animated main KPI if provided */}
      {mainValue != null && (
        <div className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums" style={{ fontFamily: 'var(--font-nunito-sim), sans-serif' }}>
          {fmt(animatedMain)}€
        </div>
      )}

      <div className="space-y-0 sm:space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between items-baseline">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {row.label}
            </span>
            <span
              className={`text-sm tabular-nums ${
                row.bold ? 'font-bold text-base' : 'font-medium'
              } ${
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

export function EssentialSummary({ result }: EssentialSummaryProps) {
  const year1 = result.yearlyProjection[0];
  const year2 = result.yearlyProjection[1];

  // Coût mensuel = total des dépenses hors impôts (crédit + charges)
  const expenses1 = year1?.monthlyExpenseBreakdown;
  const expenses2 = year2?.monthlyExpenseBreakdown;
  const totalCost = (exp: typeof expenses1) => {
    if (!exp) return 0;
    return exp.loanPayment + exp.loanInsurance + exp.propertyTax + exp.insurancePNO
      + exp.coproCharges + exp.gli + exp.management + exp.maintenance + exp.otherCharges;
  };
  const cost1 = totalCost(expenses1);
  const cost2 = totalCost(expenses2);


  // Card 1 — Coût réel (hors impôts)
  const costColor: CardColor = 'orange';

  const costRows = [
    {
      label: '1ère année',
      value: `${fmt(cost1)}€/mois`,
    },
    {
      label: 'Années suivantes',
      value: `${fmt(cost2)}€/mois`,
    },
  ];

  // Card 2 — Rentabilité
  const rendement = result.netNetYield;
  const hasDonationYield = result.yieldOnCashInvested != null;
  const profitColor: CardColor =
    rendement >= 5 ? 'green' : rendement >= 3 ? 'orange' : 'red';

  const profitRows = [
    {
      label: hasDonationYield ? 'Rendement / valeur du bien' : 'Rendement net-net',
      value: `${rendement}%`,
    },
    ...(hasDonationYield
      ? [{ label: 'Rendement / apport réel', value: `${result.yieldOnCashInvested}%`, highlight: true }]
      : []),
    {
      label: 'Cash-flow mensuel',
      value: `${result.monthlyCashflow >= 0 ? '+' : ''}${fmt(result.monthlyCashflow)}€/mois`,
      highlight: result.monthlyCashflow >= 0,
    },
  ];

  // Card 3 — Fiscalité
  const diff = result.taxDifference;
  const taxColor: CardColor = diff <= 0 ? 'green' : diff <= 1000 ? 'orange' : 'red';

  const monthlyTaxWithout = Math.round(result.taxWithoutInvestment / 12);
  const monthlyTaxWith = Math.round(result.taxWithInvestment / 12);
  const monthlyDiff = Math.round(diff / 12);

  const taxRows = [
    { label: 'Impôts sans investissement', value: `${fmt(monthlyTaxWithout)}€/mois` },
    { label: 'Impôts avec investissement', value: `${fmt(monthlyTaxWith)}€/mois` },
    {
      label: monthlyDiff <= 0 ? 'Économie' : 'Surcoût',
      value: `${monthlyDiff > 0 ? '+' : ''}${fmt(monthlyDiff)}€/mois`,
      highlight: monthlyDiff <= 0,
      bold: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SummaryCard
        icon={<Wallet size={18} />}
        title="Coût hors impôts"
        rows={costRows}
        color={costColor}
        tabId="section-cost"
      />
      <SummaryCard
        icon={<Receipt size={18} />}
        title="Impact fiscal"
        rows={taxRows}
        color={taxColor}
        tabId="section-fiscal"
      />
      <SummaryCard
        icon={<BarChart3 size={18} />}
        title="Revenu"
        rows={profitRows}
        color={profitColor}
        tabId="section-profitability"
      />
    </div>
  );
}
