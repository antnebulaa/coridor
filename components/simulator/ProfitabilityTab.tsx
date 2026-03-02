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
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface ProfitabilityTabProps {
  result: InvestmentResult;
  projectionYears: number;
}

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const fmtPct = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

function KPIMini({ label, value, suffix, highlight, tooltip }: { label: string; value: string; suffix?: string; highlight?: boolean; tooltip?: string }) {
  return (
    <div className={`rounded-2xl p-4 ${
      highlight
        ? 'bg-(--sim-amber-50) ring-1 ring-(--sim-amber-400)'
        : 'bg-(--sim-bg-section)'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`text-base font-medium ${highlight ? 'text-(--sim-amber-600) font-medium' : 'text-neutral-500'}`}>
          {label}
        </div>
        <div className={`text-xl font-bold tabular-nums ${highlight ? 'text-(--sim-amber-600)' : 'text-neutral-900 dark:text-neutral-100'}`} style={{ fontFamily: 'var(--font-nunito-sim), sans-serif' }}>
          {value}{suffix && <span className="text-sm font-normal text-neutral-400"> {suffix}</span>}
        </div>
      </div>
      {tooltip && (
        <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1.5 leading-relaxed">
          {tooltip}
        </p>
      )}
    </div>
  );
}

export function ProfitabilityTab({ result, projectionYears }: ProfitabilityTabProps) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const hasSeasonal = result.seasonalRentalIncome > 0;

  // Chart data
  const chartData = result.yearlyProjection.map((yp) => ({
    name: `A${yp.year}`,
    patrimoineNet: yp.netWealth,
    cashflowCumule: yp.cumulativeCashflow,
    capitalRestant: yp.remainingLoan,
    valeurBien: yp.propertyValue,
  }));

  // Placement comparison — use total investment gain (equity + cashflows - initial outlay)
  // This properly accounts for all income including seasonal/Airbnb
  const lastYear = result.yearlyProjection[result.yearlyProjection.length - 1];
  const downPayment = result.vsLivretA.totalInvested;
  const investmentFinal = (lastYear?.netWealth ?? 0) + (lastYear?.cumulativeCashflow ?? 0) - downPayment;
  const livretAFinal = result.vsLivretA.totalGain;

  // CAGR on cash invested for real estate (comparable to simple compound rates)
  const totalFinal = downPayment + investmentFinal;
  const investmentCAGR = downPayment > 0 && totalFinal > 0 && projectionYears > 0
    ? (Math.pow(totalFinal / downPayment, 1 / projectionYears) - 1) * 100
    : 0;

  const placements = [
    { name: 'Votre investissement', rate: investmentCAGR, finalValue: investmentFinal, color: '#B9592D' },
    { name: result.vsBourseSP500.name, rate: result.vsBourseSP500.annualRate * 100, finalValue: result.vsBourseSP500.totalGain, color: 'bg-orange-500' },
    { name: result.vsLivretA.name, rate: result.vsLivretA.annualRate * 100, finalValue: livretAFinal, color: 'bg-emerald-500' },
    { name: result.vsAssuranceVie.name, rate: result.vsAssuranceVie.annualRate * 100, finalValue: result.vsAssuranceVie.totalGain, color: 'bg-purple-500' },
  ].sort((a, b) => b.finalValue - a.finalValue);

  const maxPlacement = Math.max(...placements.map((p) => p.finalValue), 1);

  // Dynamic title comparing to Livret A
  const livretMultiple = livretAFinal > 0 ? (investmentFinal / livretAFinal).toFixed(1) : null;
  const hasMultiple = livretMultiple && parseFloat(livretMultiple) > 1;

  return (
    <div className="space-y-12">
      <h3
        className="text-3xl md:text-4xl font-medium tracking-tight animate-room-name text-neutral-900 dark:text-neutral-100"
        
      >
        Combien cela vous rapporte ?
      </h3>

      {/* KPI cards — 1 per line on mobile, with explanations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <KPIMini label="Rendement brut" value={`${fmtPct(result.grossYield)}%`} tooltip="Loyer annuel ÷ valeur du bien. Ne tient pas compte des charges ni des impôts." />
        <KPIMini label="Rendement net" value={`${fmtPct(result.netYield)}%`} tooltip="Prend en compte les charges (copro, taxe foncière, assurance…) mais pas les impôts." />
        <KPIMini label="Rendement net-net" value={`${fmtPct(result.netNetYield)}%`} highlight tooltip="Le rendement réel après impôts et charges. C'est le chiffre le plus fiable." />
        {result.yieldOnCashInvested != null && (
          <KPIMini label="Rendement / apport" value={`${fmtPct(result.yieldOnCashInvested)}%`} highlight tooltip="Rendement net-net rapporté à votre apport réel (travaux + mobilier). Très élevé car le bien a été reçu gratuitement." />
        )}
        <KPIMini label={`TRI ${projectionYears} ans`} value={`${fmtPct(result.tri)}%`} tooltip="Taux de Rentabilité Interne. Mesure la performance globale en incluant la plus-value à la revente et l'effet de levier du crédit." />
      </div>

      {/* Wealth chart */}
      <div className="bg-(--sim-bg-card)">
        <h4
          className="text-base font-semibold mb-4 text-neutral-700 dark:text-neutral-300"
          
        >
          Évolution du patrimoine
        </h4>
        {/* Inline legend for mobile (replaces heavy bottom Legend) */}
        {isMobile && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
            <span className="flex items-center gap-1.5 text-xs text-neutral-500">
              <span className="w-3 h-[3px] rounded bg-[#B9592D]" /> Patrimoine net
            </span>
            <span className="flex items-center gap-1.5 text-xs text-neutral-500">
              <span className="w-3 h-[3px] rounded bg-[#22c55e]" /> Cash-flow cumulé
            </span>
            <span className="flex items-center gap-1.5 text-xs text-neutral-500">
              <span className="w-3 h-[3px] rounded bg-[#ef4444]" /> Capital restant
            </span>
            <span className="flex items-center gap-1.5 text-xs text-neutral-500">
              <span className="w-3 h-[3px] rounded bg-[#a3a3a3] opacity-60" style={{ borderBottom: '1px dashed #a3a3a3' }} /> Valeur du bien
            </span>
          </div>
        )}
        <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="name" tick={{ fontSize: isMobile ? 10 : 11 }} />
            <YAxis
              width={isMobile ? 22 : 50}
              tick={{ fontSize: isMobile ? 8 : 11 }}
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
            {!isMobile && (
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
            )}
            <defs>
              <linearGradient id="patrimoineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#B9592D" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#B9592D" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="valeurBien" stroke="#a3a3a3" fill="none" strokeDasharray="5 5" />
            <Area type="monotone" dataKey="patrimoineNet" stroke="#B9592D" fill="url(#patrimoineGradient)" strokeWidth={3} />
            <Area type="monotone" dataKey="cashflowCumule" stroke="#22c55e" fill="#22c55e15" strokeWidth={3}/>
            <Area type="monotone" dataKey="capitalRestant" stroke="#ef4444" fill="#ef444410" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Placement comparison */}
      <div className="bg-(--sim-bg-card) rounded-3xl pb-10 dark:border-neutral-800">
        <h4
          className="text-2xl tracking-tight animate-room-name font-semibold mb-4 text-neutral-700 dark:text-neutral-300"
        >
          {hasMultiple
            ? <>Votre investissement rapporte <span className="text-emerald-500">{livretMultiple}×</span> plus que le Livret A</>
            : 'Comparaison des placements'}
        </h4>
        <div className="space-y-4">
          {placements.map((p) => (
            <div key={p.name}>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {p.name} <span className="text-neutral-400 dark:text-neutral-500">({fmtPct(p.rate)}%/an)</span>
                </span>
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums">
                  {p.finalValue >= 0 ? '+' : ''}{fmt(p.finalValue)}€
                </span>
              </div>
              <div className="w-full h-4 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${p.color.startsWith('#') ? '' : p.color} rounded-full transition-all`}
                  style={{ width: `${Math.max(2, (p.finalValue / maxPlacement) * 100)}%`, ...(p.color.startsWith('#') ? { backgroundColor: p.color } : {}) }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-neutral-400 mt-3">
          Base : même apport initial ({fmt(result.vsLivretA.totalInvested)}€) placé sur {projectionYears} ans.
          L&apos;immobilier inclut l&apos;effet de levier du crédit{hasSeasonal ? ', les revenus Airbnb' : ''} et les cash-flows cumulés.
          Tous les rendements sont exprimés en valeur nominale (inflation non déduite).
        </p>
      </div>
    </div>
  );
}
