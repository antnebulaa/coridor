export default function SuiviLoyersLoading() {
    return (
        <div className="max-w-3xl mx-auto px-4 pb-28 pt-6 md:pt-8 space-y-5">
            {/* Header: back button + title + toggle */}
            <div>
                <div className="h-5 w-20 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-3" />
                <div className="flex items-center justify-between">
                    <div className="h-7 w-44 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
                    <div className="h-9 w-36 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                </div>
            </div>

            {/* Month nav */}
            <div className="flex items-center justify-center gap-4">
                <div className="h-9 w-9 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                <div className="h-6 w-28 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
                <div className="h-9 w-9 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
            </div>

            {/* Summary card */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
                <div className="flex items-end justify-between">
                    <div className="space-y-2">
                        <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                        <div className="h-8 w-28 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
                        <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                        <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                    </div>
                </div>
                <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
            </div>

            {/* Property group cards */}
            {[1, 2, 3].map(i => (
                <div
                    key={i}
                    className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                >
                    {/* Property header */}
                    <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1.5">
                                <div className="h-5 w-40 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                                <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                            </div>
                            <div className="h-5 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                        </div>
                        {i === 1 && (
                            <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                        )}
                    </div>
                    {/* Tenant lines */}
                    <div className="border-t border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-50 dark:divide-neutral-800">
                        {Array.from({ length: i === 1 ? 3 : 1 }).map((_, j) => (
                            <div key={j} className="px-4 py-3.5 flex items-center justify-between">
                                <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                                    <div className="h-5 w-14 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
