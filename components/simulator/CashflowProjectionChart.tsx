'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { YearlyProjection } from '@/services/InvestmentSimulatorService';

interface CashflowProjectionChartProps {
  yearlyProjection: YearlyProjection[];
}

const fmt = (n: number) =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

export default function CashflowProjectionChart({
  yearlyProjection,
}: CashflowProjectionChartProps) {
  if (!yearlyProjection || yearlyProjection.length === 0) return null;

  const data = yearlyProjection.map((yp) => ({
    name: `A${yp.year}`,
    cashflow: yp.cashflow,
    cumulatif: yp.cumulativeCashflow,
    patrimoine: yp.netWealth,
  }));

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-4">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            tickFormatter={(v) => `${fmt(v)} €`}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                cashflow: 'Cash-flow annuel',
                cumulatif: 'Cash-flow cumulé',
                patrimoine: 'Patrimoine net',
              };
              return [`${fmt(value)} €`, labels[name] || name];
            }}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #e5e5e5',
              fontSize: 12,
            }}
          />
          <Legend
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                cashflow: 'Cash-flow annuel',
                cumulatif: 'Cash-flow cumulé',
                patrimoine: 'Patrimoine net',
              };
              return labels[value] || value;
            }}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar
            dataKey="cashflow"
            fill="#E8A838"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
          <Line
            type="monotone"
            dataKey="cumulatif"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="patrimoine"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            strokeDasharray="6 3"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
