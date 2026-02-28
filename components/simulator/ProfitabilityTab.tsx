'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { InvestmentResult } from '@/services/InvestmentSimulatorService';

interface ProfitabilityTabProps {
  result: InvestmentResult;
  projectionYears: number;
}

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const fmtPct = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

function KPIMini({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="bg-(--sim-bg-section) rounded-xl p-3 text-center">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
        {value}{suffix && <span className="text-sm font-normal text-neutral-400"> {suffix}</span>}
      </div>
    </div>
  );
}

export function ProfitabilityTab({ result, projectionYears }: ProfitabilityTabProps) {
  // Chart data
  const chartData = result.yearlyProjection.map((yp) => ({
    name: `A${yp.year}`,
    patrimoineNet: yp.netWealth,
    cashflowCumule: yp.cumulativeCashflow,
    capitalRestant: yp.remainingLoan,
    valeurBien: yp.propertyValue,
  }));

  // Placement comparison — sort by final value desc
  const lastYear = result.yearlyProjection[result.yearlyProjection.length - 1];
  const investmentFinal = lastYear?.netWealth ?? 0;
  const livretAFinal = result.vsLivretA.totalGain;

  const placements = [
    { name: 'Votre investissement', finalValue: investmentFinal, color: 'bg-(--sim-amber-500)' },
    { name: result.vsBourseSP500.name, finalValue: result.vsBourseSP500.totalGain, color: 'bg-blue-500' },
    { name: result.vsLivretA.name, finalValue: livretAFinal, color: 'bg-emerald-500' },
    { name: result.vsAssuranceVie.name, finalValue: result.vsAssuranceVie.totalGain, color: 'bg-purple-500' },
  ].sort((a, b) => b.finalValue - a.finalValue);

  const maxPlacement = Math.max(...placements.map((p) => p.finalValue), 1);

  // Dynamic title comparing to Livret A
  const livretMultiple = livretAFinal > 0 ? (investmentFinal / livretAFinal).toFixed(1) : null;
  const placementTitle = livretMultiple && parseFloat(livretMultiple) > 1
    ? `Votre investissement rapporte ${livretMultiple}× plus que le Livret A`
    : 'Comparaison des placements';

  return (
    <div className="space-y-6">
      <h3
        className="text-2xl md:text-3xl text-neutral-900 dark:text-neutral-100"
        style={{ fontFamily: 'var(--font-serif-sim), serif' }}
      >
        Combien ça rapporte ?
      </h3>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPIMini label="Rendement brut" value={`${fmtPct(result.grossYield)}%`} />
        <KPIMini label="Rendement net" value={`${fmtPct(result.netYield)}%`} />
        <KPIMini label="Rendement net-net" value={`${fmtPct(result.netNetYield)}%`} />
        <KPIMini label={`TRI ${projectionYears} ans`} value={`${fmtPct(result.tri)}%`} />
      </div>

      {/* Wealth chart */}
      <div className="bg-(--sim-bg-card) rounded-xl p-4 border border-neutral-200 dark:border-neutral-800">
        <h4
          className="text-sm font-semibold mb-4 text-neutral-700 dark:text-neutral-300"
          style={{ fontFamily: 'var(--font-serif-sim), serif' }}
        >
          Évolution du patrimoine
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  patrimoineNet: 'Patrimoine net',
                  cashflowCumule: 'Cash-flow cumulé',
                  capitalRestant: 'Capital restant dû',
                  valeurBien: 'Valeur du bien',
                };
                return [`${fmt(value)}€`, labels[name] || name];
              }}
              contentStyle={{
                backgroundColor: '#1A1A1A',
                border: '1px solid #333',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#fff',
              }}
              itemStyle={{ color: '#d4d4d4' }}
              labelStyle={{ color: '#a3a3a3', fontWeight: 500 }}
            />
            <Legend
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  patrimoineNet: 'Patrimoine net',
                  cashflowCumule: 'Cash-flow cumulé',
                  valeurBien: 'Valeur du bien',
                  capitalRestant: 'Capital restant dû',
                };
                return labels[value] || value;
              }}
              wrapperStyle={{ fontSize: '11px' }}
            />
            <Area type="monotone" dataKey="valeurBien" stroke="#a3a3a3" fill="none" strokeDasharray="5 5" />
            <Area type="monotone" dataKey="patrimoineNet" stroke="#D4922A" fill="#D4922A20" strokeWidth={3} />
            <Area type="monotone" dataKey="cashflowCumule" stroke="#22c55e" fill="#22c55e15" />
            <Area type="monotone" dataKey="capitalRestant" stroke="#ef4444" fill="#ef444410" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Placement comparison */}
      <div className="bg-(--sim-bg-card) rounded-xl p-4 border border-neutral-200 dark:border-neutral-800">
        <h4
          className="text-sm font-semibold mb-4 text-neutral-700 dark:text-neutral-300"
          style={{ fontFamily: 'var(--font-serif-sim), serif' }}
        >
          {placementTitle}
        </h4>
        <div className="space-y-3">
          {placements.map((p) => (
            <div key={p.name} className="flex items-center gap-3">
              <span className="text-xs text-neutral-600 dark:text-neutral-400 w-40 shrink-0 truncate">
                {p.name}
              </span>
              <div className="flex-1 h-6 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${p.color} rounded-full transition-all`}
                  style={{ width: `${Math.max(2, (p.finalValue / maxPlacement) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 w-24 text-right tabular-nums">
                {p.finalValue >= 0 ? '+' : ''}{fmt(p.finalValue)}€
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-neutral-400 mt-3">
          Base : même apport initial ({fmt(result.vsLivretA.totalInvested)}€) placé sur {projectionYears} ans.
          L&apos;immobilier utilise l&apos;effet de levier du crédit.
        </p>
      </div>
    </div>
  );
}
