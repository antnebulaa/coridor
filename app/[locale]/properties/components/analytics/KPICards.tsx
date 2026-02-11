'use client';

import { TrendingUp, Wallet, ArrowDownAZ, PiggyBank } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface KPICardsProps {
    data: {
        year: number; // Add Year to prop
        totalIncome: number;
        totalExpenses: number;
        netBenefit: number;
        yieldGross: number;
        yieldNet: number;
        yieldNetNet: number;
        totalDeductible: number;
        totalRecoverable: number;
        netBenefitEvolution: number | null;
        totalExpensesEvolution: number | null;
        totalIncomeEvolution: number | null;
        yieldGrossEvolution: number | null;
        yieldNetEvolution: number | null;
        yieldNetNetEvolution: number | null;

        // Prev Values
        totalIncomePrev: number | null;
        yieldGrossPrev: number | null;
        yieldNetPrev: number | null;
        yieldNetNetPrev: number | null;

        vacancyLoss: number;
    }
}

const KPICard = ({ title, value, subtext, icon: Icon, color, className, chart }: any) => (
    <div className={`bg-white p-3 rounded-2xl pl-3 flex flex-col gap-1 ${className}`}>
        <div className="flex items-center gap-2 mb-1">
            <p className="text-sm text-neutral-700 font-semibold">{title}</p>
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
                <h4 className="text-2xl font-medium text-neutral-600">{value}</h4>
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
                <div className="bg-white-50 border-2 border-neutral-700 text-neutral-700 px-4 py-3 rounded-2xl flex items-start gap-3 w-full animate-fade-in">
                    <TrendingUp className="shrink-0 mt-0.5" size={18} />
                    <div className="text-sm">
                        <span className="font-semibold block">Données en cours de consolidation</span>
                        L'exercice comptable n'étant pas clôturé ou les données étant partielles, certains indicateurs peuvent être temporairement à 0.
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 w-full">

                {/* 1. Cashflow Net (Ex Bénéfice Net) */}
                <KPICard
                    title={`Cashflow Net ${data.year}`}
                    value={`${data.netBenefit > 0 ? '+' : ''}${data.netBenefit.toFixed(0)} €`}
                    subtext={
                        data.netBenefitEvolution !== null ? (
                            <span className={`flex items-center gap-1 ${data.netBenefitEvolution >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {data.netBenefitEvolution >= 0 ? '↗' : '↘'} {Math.abs(data.netBenefitEvolution).toFixed(1)}%
                            </span>
                        ) : "Revenus - Dépenses"
                    }
                    icon={Wallet}
                    color={data.netBenefit >= 0 ? "bg-green text-green-600" : "bg-red-500 text-red-600"}
                    className="col-span-1"
                />

                {/* 2. Revenus Encaissés (Ex Revenus Totaux) */}
                <KPICard
                    title={`Revenus Encaissés ${data.year}`}
                    value={
                        <div className="flex items-center gap-2">
                            {`${data.totalIncome.toFixed(0)} €`}
                            {data.totalIncomeEvolution !== null && data.totalIncomeEvolution !== 0 && (
                                <span className={`text-sm font-medium ${data.totalIncomeEvolution > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {data.totalIncomeEvolution > 0 ? '↗' : '↘'} {Math.abs(data.totalIncomeEvolution).toFixed(1)}%
                                </span>
                            )}
                        </div>
                    }
                    subtext="Loyers + Charges perçus"
                    icon={ArrowDownAZ}
                    color="bg-indigo text-indigo-600"
                />

                {/* 3. Manque à Gagner (Vacancy Loss) - NEW */}
                <KPICard
                    title="Manque à Gagner"
                    value={`${data.vacancyLoss.toFixed(0)} €`}
                    subtext="Loyers potentiels non perçus"
                    icon={Wallet}
                    color="bg-orange text-orange-600"
                />

                {/* 4. Rendement Brut */}
                <KPICard
                    title="Rendement Brut"
                    value={
                        <div className="flex items-center gap-2">
                            {`${data.yieldGross.toFixed(2)} %`}
                            {data.yieldGrossEvolution !== null && data.yieldGrossEvolution !== 0 && (
                                <span className={`text-sm font-medium ${data.yieldGrossEvolution > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {data.yieldGrossEvolution > 0 ? '↗' : '↘'} {Math.abs(data.yieldGrossEvolution).toFixed(1)}%
                                </span>
                            )}
                        </div>
                    }
                    subtext={data.yieldGross === 0 ? "Prix d'achat manquant" : "Loyer HC / Prix d'achat"}
                    icon={TrendingUp}
                    color="bg-blue text-blue-600"
                />

                {/* 5. Rendement Net */}
                <KPICard
                    title="Rendement Net"
                    value={
                        <div className="flex items-center gap-2">
                            {`${data.yieldNet.toFixed(2)} %`}
                            {data.yieldNetEvolution !== null && data.yieldNetEvolution !== 0 && (
                                <span className={`text-sm font-medium ${data.yieldNetEvolution > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {data.yieldNetEvolution > 0 ? '↗' : '↘'} {Math.abs(data.yieldNetEvolution).toFixed(1)}%
                                </span>
                            )}
                        </div>
                    }
                    subtext={data.yieldNet === 0 ? "Prix d'achat manquant" : "Cashflow / Prix d'achat"}
                    icon={PiggyBank}
                    color="bg-purple text-purple-600"
                />

                {/* 6. Dépenses (Pie Chart) */}
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
                                    {data.totalExpensesEvolution > 0 ? '↗' : '↘'} {Math.abs(data.totalExpensesEvolution).toFixed(1)}%
                                </div>
                            )}
                            <span className="text-green-600 font-semibold">Dont récupérable : {data.totalRecoverable.toFixed(0)} €</span>
                            <span className="text-blue-600 font-semibold">Dont déductible : {data.totalDeductible.toFixed(0)} €</span>
                        </div>
                    }
                    icon={ArrowDownAZ}
                    color="bg-rose text-rose-600"
                    className="col-span-1"
                />
            </div>
        </div>
    );
};

export default KPICards;
