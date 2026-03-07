export default function FinancesLoading() {
    return (
        <div className="max-w-5xl mx-auto px-4 md:px-0 pb-20 pt-6 md:pt-8 animate-pulse">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="h-8 w-28 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
                <div className="flex gap-2 items-center">
                    <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
                    <div className="h-8 w-32 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
                    <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
                    <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-700 rounded-lg ml-2" />
                </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 h-28">
                        <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded mb-3" />
                        <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
                        <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
                    </div>
                ))}
            </div>

            {/* Cashflow line */}
            <div className="flex justify-center py-2 mb-4">
                <div className="h-5 w-48 bg-neutral-200 dark:bg-neutral-700 rounded" />
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-neutral-200 dark:border-neutral-700 mb-6 pb-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
                ))}
            </div>

            {/* Table rows */}
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-14 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700" />
                ))}
            </div>
        </div>
    );
}
