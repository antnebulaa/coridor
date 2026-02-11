'use client';

interface ExpenseDistributionBarProps {
    data: { name: string; value: number; color?: string }[];
}

const DEFAULT_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

const ExpenseDistributionBar: React.FC<ExpenseDistributionBarProps> = ({ data }) => {
    // Filter positive values
    const activeData = data.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    const total = activeData.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <div className="h-[300px] w-full bg-white p-3 rounded-2xl border border-neutral-200 flex flex-col">
            <h3 className="text-lg font-medium mb-4 text-neutral-800">Répartition des Charges</h3>

            {activeData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-neutral-400">Aucune dépense</div>
            ) : (
                <div className="flex flex-col gap-4">
                    {/* Bar Chart */}
                    <div className="h-4 w-full rounded-lg flex overflow-hidden">
                        {activeData.map((item, index) => {
                            const percent = (item.value / total) * 100;
                            const color = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];

                            return (
                                <div
                                    key={index}
                                    style={{ width: `${percent}%`, backgroundColor: color }}
                                    className="h-full border-r border-white last:border-r-0 first:rounded-l-lg last:rounded-r-lg"
                                    title={`${item.name}: ${item.value.toFixed(0)}€`}
                                />
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-col gap-2">
                        {activeData.map((item, index) => {
                            const color = item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                            return (
                                <div key={index} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-3 h-3 rounded-xl shrink-0"
                                            style={{ backgroundColor: color }}
                                        />
                                        <span className="text-sm font-medium text-neutral-600 group-hover:text-black transition">
                                            {item.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-neutral-500">
                                            {((item.value / total) * 100).toFixed(0)}%
                                        </span>
                                        <span className="text-sm font-medium text-neutral-900">
                                            {item.value.toFixed(0)} €
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseDistributionBar;
