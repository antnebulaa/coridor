'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CashflowChartProps {
    data: { month: number; income: number; expenses: number }[];
}

const formatEuro = (value: number) => `${value} €`;

const CashflowChart: React.FC<CashflowChartProps> = ({ data }) => {
    // Calculate max value for synchronized domain
    const maxVal = data.length > 0 ? Math.max(...data.map(d => Math.max(d.income, d.expenses))) : 0;
    // Add 10% buffer and round up to nice number, default to 100 if 0
    const domainMax = maxVal > 0 ? Math.ceil(maxVal * 1.1) : 100;

    return (
        <div className="w-full bg-white p-4 rounded-xl border border-neutral-200">
            <h3 className="text-lg font-medium mb-4 text-neutral-800">Flux de Trésorerie Mensuel</h3>

            <div className="flex h-[350px]">
                {/* Scrollable Chart Area */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden relative no-scrollbar">
                    <div className="h-full min-w-[300px]"> {/* 700px ensures ~5 months visible on mobile */}
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={data}
                                margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                <XAxis
                                    dataKey="month"
                                    tickFormatter={(val) => ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][val - 1]}
                                    stroke="#737373"
                                    tick={{ fontSize: 14, fontWeight: 500 }}
                                    interval={0}
                                />
                                {/* Hidden YAxis to maintain grid alignment but not show ticks/line */}
                                <YAxis
                                    domain={[0, domainMax]}
                                    hide
                                />
                                <Tooltip
                                    formatter={(value: any) => [`${(value || 0).toFixed(0)} €`, ""]}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                />
                                <Legend />
                                <Bar name="Revenus" dataKey="income" fill="#B2C8DD" radius={[22, 22, 0, 0]} />
                                <Bar name="Dépenses" dataKey="expenses" fill="#FE3C10" radius={[22, 22, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Fixed Y-Axis on Right */}
                <div className="w-[40px] shrink-0 border-l border-neutral-100 bg-white z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
                        >
                            <YAxis
                                orientation="right"
                                tickFormatter={(val) => `${val}`}
                                stroke="#737373"
                                tick={{ fontSize: 11 }}
                                width={35}
                                domain={[0, domainMax]}
                                axisLine={false}
                                tickLine={false}
                            />
                            {/* Invisible bar to force chart rendering */}
                            <Bar dataKey="income" fill="transparent" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default CashflowChart;
