'use client';

import { MonthlyBreakdown } from '@/app/actions/getFinancialOverview';
import CashflowChart from '@/app/[locale]/properties/components/analytics/CashflowChart';

interface AnnualViewProps {
    data: {
        monthlyBreakdown: MonthlyBreakdown[];
        totalRevenue: number;
        totalExpenses: number;
        totalCashflow: number;
    };
    year: number;
}

function formatCents(cents: number): string {
    return Math.round(cents / 100).toLocaleString('fr-FR');
}

const MONTH_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const AnnualView: React.FC<AnnualViewProps> = ({ data, year }) => {
    // Transform data for CashflowChart (expects euros, not cents)
    const chartData = data.monthlyBreakdown.map(m => ({
        month: m.month,
        income: Math.round(m.revenue / 100),
        expenses: Math.round(m.expenses / 100),
    }));

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 text-center">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Revenus {year}</p>
                    <p className="text-xl font-semibold text-neutral-900 dark:text-white tabular-nums">
                        {formatCents(data.totalRevenue)} €
                    </p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 text-center">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Dépenses {year}</p>
                    <p className="text-xl font-semibold text-neutral-900 dark:text-white tabular-nums">
                        {formatCents(data.totalExpenses)} €
                    </p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 text-center">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Cashflow net</p>
                    <p className={`text-xl font-semibold tabular-nums ${
                        data.totalCashflow > 0 ? 'text-emerald-600' :
                        data.totalCashflow < 0 ? 'text-red-600' :
                        'text-neutral-400'
                    }`}>
                        {data.totalCashflow > 0 ? '+' : ''}{formatCents(data.totalCashflow)} €
                    </p>
                </div>
            </div>

            {/* Cashflow chart */}
            <CashflowChart data={chartData} />

            {/* Monthly breakdown table */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                                <th className="text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 p-3">Mois</th>
                                <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 p-3">Revenus</th>
                                <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 p-3">Dépenses</th>
                                <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 p-3">Cashflow</th>
                                <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 p-3">Occupation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.monthlyBreakdown.map(m => (
                                <tr
                                    key={m.month}
                                    className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
                                >
                                    <td className="p-3 text-sm text-neutral-900 dark:text-white font-medium">
                                        {MONTH_SHORT[m.month - 1]}
                                    </td>
                                    <td className="p-3 text-sm text-right tabular-nums text-neutral-900 dark:text-white">
                                        {formatCents(m.revenue)} €
                                    </td>
                                    <td className="p-3 text-sm text-right tabular-nums text-neutral-900 dark:text-white">
                                        {formatCents(m.expenses)} €
                                    </td>
                                    <td className={`p-3 text-sm text-right tabular-nums font-medium ${
                                        m.cashflow > 0 ? 'text-emerald-600' :
                                        m.cashflow < 0 ? 'text-red-600' :
                                        'text-neutral-400'
                                    }`}>
                                        {m.cashflow > 0 ? '+' : ''}{formatCents(m.cashflow)} €
                                    </td>
                                    <td className="p-3 text-sm text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                                        {m.occupiedUnits}/{m.totalUnits}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                                <td className="p-3 text-sm font-semibold text-neutral-900 dark:text-white">Total</td>
                                <td className="p-3 text-sm text-right tabular-nums font-semibold text-neutral-900 dark:text-white">
                                    {formatCents(data.totalRevenue)} €
                                </td>
                                <td className="p-3 text-sm text-right tabular-nums font-semibold text-neutral-900 dark:text-white">
                                    {formatCents(data.totalExpenses)} €
                                </td>
                                <td className={`p-3 text-sm text-right tabular-nums font-semibold ${
                                    data.totalCashflow > 0 ? 'text-emerald-600' :
                                    data.totalCashflow < 0 ? 'text-red-600' :
                                    'text-neutral-400'
                                }`}>
                                    {data.totalCashflow > 0 ? '+' : ''}{formatCents(data.totalCashflow)} €
                                </td>
                                <td />
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                    {data.monthlyBreakdown.map(m => (
                        <div key={m.month} className="p-3 flex items-center justify-between">
                            <span className="text-sm font-medium text-neutral-900 dark:text-white w-12">
                                {MONTH_SHORT[m.month - 1]}
                            </span>
                            <div className="flex gap-4 text-sm tabular-nums">
                                <span className="text-neutral-600 dark:text-neutral-400 w-20 text-right">
                                    {formatCents(m.revenue)} €
                                </span>
                                <span className="text-neutral-600 dark:text-neutral-400 w-20 text-right">
                                    -{formatCents(m.expenses)} €
                                </span>
                                <span className={`w-20 text-right font-medium ${
                                    m.cashflow > 0 ? 'text-emerald-600' :
                                    m.cashflow < 0 ? 'text-red-600' :
                                    'text-neutral-400'
                                }`}>
                                    {m.cashflow > 0 ? '+' : ''}{formatCents(m.cashflow)} €
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AnnualView;
