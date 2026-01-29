'use client';

import { TrendingUp, Wallet, ArrowDownAZ, PiggyBank } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface KPICardsProps {
    data: {
        totalIncome: number;
        totalExpenses: number;
        netBenefit: number;
        yieldGross: number;
        yieldNet: number;
        totalDeductible: number;
        totalRecoverable: number;
        netBenefitEvolution: number | null;
        totalExpensesEvolution: number | null;
    }
}

const KPICard = ({ title, value, subtext, icon: Icon, color, className, chart }: any) => (
    <div className={`bg-white p-3 rounded-2xl border border-neutral-200 flex flex-col gap-1 ${className}`}>
        <div className="flex items-center gap-2 mb-1">
            <div className={`p-0 rounded-md ${color} bg-opacity-10`}>
                <Icon size={14} className={color.replace('bg-', 'text-')} />
            </div>
            <p className="text-sm text-neutral-600 font-semibold">{title}</p>
        </div>

        {chart ? (
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h4 className="text-2xl font-medium text-neutral-900">{value}</h4>
                    {subtext && <div className="text-sm text-neutral-500">{subtext}</div>}
                </div>
                <div className="w-[76px] h-[76px] shrink-0">
                    {chart}
                </div>
            </div>
        ) : (
            <div>
                <h4 className="text-2xl font-medium text-neutral-900">{value}</h4>
                {subtext && <div className="text-sm text-neutral-500">{subtext}</div>}
            </div>
        )}
    </div>
);

const KPICards: React.FC<KPICardsProps> = ({ data }) => {
    // Basic checks
    const showIncompleteWarning = data.totalExpenses === 0;

    // Data for Expenses Pie Chart
    const expenseData = [
        { name: 'Récupérable', value: data.totalRecoverable, color: '#16a34a' }, // green-600
        { name: 'Déductible', value: data.totalDeductible, color: '#2563eb' }, // blue-600
        { name: 'Autre', value: Math.max(0, data.totalExpenses - data.totalRecoverable - data.totalDeductible), color: '#e5e5e5' } // neutral-200
    ];

    // Filter out 0 values for cleaner chart? Recharts handles 0 fine usually.
    // If total is 0, dummy data?
    const chartData = data.totalExpenses > 0 ? expenseData : [{ name: 'Empty', value: 1, color: '#f5f5f5' }];

    return (
        <div className="flex flex-col gap-4 w-full">
            {showIncompleteWarning && (
                <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-2xl flex items-start gap-3 w-full animate-fade-in">
                    <TrendingUp className="shrink-0 mt-0.5" size={18} />
                    <div className="text-sm">
                        <span className="font-semibold block">Données en cours de consolidation</span>
                        L'exercice comptable n'étant pas clôturé ou les données étant partielles, certains indicateurs peuvent être temporairement à 0.
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 w-full">
                <KPICard
                    title="Bénéfice Net"
                    value={`${data.netBenefit > 0 ? '+' : ''}${data.netBenefit.toFixed(0)} €`}
                    subtext={
                        data.netBenefitEvolution !== null ? (
                            <span className={`flex items-center gap-1 ${data.netBenefitEvolution >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {data.netBenefitEvolution >= 0 ? '↗' : '↘'} {Math.abs(data.netBenefitEvolution).toFixed(1)}% <span className="text-neutral-500">vs Année précédente</span>
                            </span>
                        ) : "Revenus - Dépenses"
                    }
                    icon={Wallet}
                    color={data.netBenefit >= 0 ? "bg-green text-green-600" : "bg-red-500 text-red-600"}
                />

                <KPICard
                    title="Rentabilité Brute"
                    value={`${data.yieldGross.toFixed(2)} %`}
                    subtext={data.yieldGross === 0 ? "Prix d'achat manquant" : "Loyer HC / Prix d'achat"}
                    icon={TrendingUp}
                    color="bg-blue text-blue-600"
                />

                <KPICard
                    title="Rentabilité Nette"
                    value={`${data.yieldNet.toFixed(2)} %`}
                    subtext={data.yieldNet === 0 ? "Prix d'achat manquant" : "Bénéfice / Prix d'achat"}
                    icon={PiggyBank}
                    color="bg-purple text-purple-600"
                />

                <KPICard
                    title="Revenus Totaux"
                    value={`${data.totalIncome.toFixed(0)} €`}
                    subtext="Loyers + Charges encaissés"
                    icon={ArrowDownAZ}
                    color="bg-indigo text-indigo-600"
                />

                <KPICard
                    title="Dépenses Totales"
                    value={`${data.totalExpenses.toFixed(0)} €`}
                    chart={
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={22}
                                    outerRadius={35}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    }
                    subtext={
                        <div className="flex flex-col gap-0.5 mt-1">
                            {/* Evolution Expenses */}
                            {data.totalExpensesEvolution !== null && (
                                <div className={`flex items-center gap-1 mb-1 font-normal ${data.totalExpensesEvolution <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {data.totalExpensesEvolution > 0 ? '↗' : '↘'} {Math.abs(data.totalExpensesEvolution).toFixed(1)}% <span className="text-neutral-500">vs Année précédente</span>
                                </div>
                            )}
                            <span className="text-green-600 font-medium">Dont récupérable : {data.totalRecoverable.toFixed(0)} €</span>
                            <span className="text-blue-600 font-medium">Dont déductible : {data.totalDeductible.toFixed(0)} €</span>
                        </div>
                    }
                    icon={ArrowDownAZ}
                    color="bg-rose text-rose-600"
                />
            </div>
        </div>
    );
};

export default KPICards;
