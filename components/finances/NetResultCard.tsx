'use client';

import { useCountUp } from '@/hooks/useCountUp';
import Sparkline from './Sparkline';
import MetricRow from './MetricRow';

interface MonthlyCashflow {
  month: string;
  revenue: number;
  expense: number;
  net: number;
}

interface FinancialReport {
  year: number;
  totalRevenue: number;
  totalExpenses: number;
  netResult: number;
  noi: number;
  noiTrend: number | null;
  netYield: number | null;
  netYieldTrend: number | null;
  livretARate: number;
  scpiRate: number;
  estimatedValue: number | null;
  totalPurchasePrice: number | null;
  grossCapitalGain: number | null;
  netCapitalGain: number | null;
  totalDebt: number | null;
  debtDetails: string | null;
  netEquity: number | null;
  equityTrend: number | null;
  occupancyRate: number;
  occupiedMonths: number;
  totalMonths: number;
  monthlyCashflow: MonthlyCashflow[];
  hasPowensConnection: boolean;
  availableYears: number[];
}

interface NetResultCardProps {
  report: FinancialReport;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.abs(Math.round(cents / 100)));

const fmtSigned = (cents: number) => {
  const abs = fmt(cents);
  if (cents > 0) return `+${abs} €`;
  if (cents < 0) return `−${abs} €`;
  return `${abs} €`;
};

const fmtEuro = (cents: number) => `${fmt(cents)} €`;

const NetResultCard: React.FC<NetResultCardProps> = ({ report }) => {
  const netEuros = Math.round(report.netResult / 100);
  const animatedNet = useCountUp(Math.abs(netEuros), 800);
  const isPositive = report.netResult >= 0;

  const hasPatrimoine =
    report.estimatedValue != null ||
    report.totalDebt != null ||
    report.netEquity != null ||
    report.grossCapitalGain != null;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5">
      {/* Hero section */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-800 dark:text-neutral-100 uppercase tracking-wider font-medium mb-1">
            Résultat net {report.year}
          </p>
          <p
            className={`text-[38px] font-medium tabular-nums tracking-tight leading-none ${
              isPositive
                ? 'text-neutral-600 dark:text-neutral-100'
                : 'text-red-500 dark:text-red-400'
            }`}
          >
            {isPositive ? '' : '−'}
            {new Intl.NumberFormat('fr-FR').format(animatedNet)}&nbsp;€
          </p>
        </div>
        <div className="flex-shrink-0 ml-4 mt-2">
          <Sparkline data={report.monthlyCashflow.map(m => ({ v: m.net }))} />
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-neutral-100 dark:border-neutral-800 mt-4" />

      {/* Revenue & Expenses */}
      <MetricRow
        label="Revenus bruts"
        sub="Loyers + charges encaissés"
        value={fmtEuro(report.totalRevenue)}
      />
      <MetricRow
        label="Charges & dépenses"
        value={`−${fmt(report.totalExpenses)} €`}
      />

      {/* Separator */}
      <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />

      {/* NOI */}
      <MetricRow
        label="NOI"
        value={fmtSigned(report.noi)}
        trend={
          report.noiTrend != null
            ? `${report.noiTrend > 0 ? '+' : ''}${report.noiTrend.toFixed(1)}%`
            : undefined
        }
        good={report.noiTrend != null ? report.noiTrend >= 0 : undefined}
      />

      {/* Net Yield */}
      {report.netYield != null && (
        <MetricRow
          label="Rendement net"
          sub={`vs Livret A ${report.livretARate}% · SCPI ${report.scpiRate}%`}
          value={`${report.netYield.toFixed(1)}%`}
          trend={
            report.netYieldTrend != null
              ? `${report.netYieldTrend > 0 ? '+' : ''}${report.netYieldTrend.toFixed(1)} pts`
              : undefined
          }
          good={report.netYieldTrend != null ? report.netYieldTrend >= 0 : undefined}
        />
      )}

      {/* Occupancy */}
      <div className="flex items-center justify-between py-2.5">
        <div>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Taux d&apos;occupation</p>
          <p className="text-sm text-neutral-400 dark:text-neutral-500">{report.occupiedMonths}/{report.totalMonths} mois occupés</p>
        </div>
        <span className="w-11 h-11 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-700 dark:text-neutral-200 tabular-nums">
          {Math.round(report.occupancyRate)}%
        </span>
      </div>

      {/* Patrimoine section */}
      {hasPatrimoine && (
        <>
          <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />

          {report.estimatedValue != null && (
            <MetricRow label="Valeur patrimoine" value={fmtEuro(report.estimatedValue)} />
          )}

          {report.totalDebt != null && (
            <MetricRow
              label="Capital restant dû"
              value={`−${fmt(report.totalDebt)} €`}
            />
          )}

          {report.netEquity != null && (
            <MetricRow
              label="Equity nette"
              value={fmtEuro(report.netEquity)}
              trend={
                report.equityTrend != null
                  ? `${report.equityTrend > 0 ? '+' : ''}${report.equityTrend.toFixed(1)}%`
                  : undefined
              }
              good={report.equityTrend != null ? report.equityTrend >= 0 : undefined}
            />
          )}

          {report.grossCapitalGain != null && (
            <MetricRow
              label="Plus-value latente"
              sub={
                report.totalPurchasePrice != null
                  ? `Acheté ${fmtEuro(report.totalPurchasePrice)}${
                      report.netCapitalGain != null
                        ? ` · ~${fmtEuro(report.netCapitalGain)} net après impôts`
                        : ''
                    }`
                  : undefined
              }
              value={fmtSigned(report.grossCapitalGain)}
              good={report.grossCapitalGain >= 0}
            />
          )}
        </>
      )}
    </div>
  );
};

export default NetResultCard;
