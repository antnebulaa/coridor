export default function FinancesLoading() {
    return (
        <div className="max-w-3xl mx-auto px-4 pb-28 pt-6 md:pt-8 space-y-5">
            {/* Header skeleton */}
            <div>
                <div className="flex items-center justify-between">
                    <div className="h-7 w-28 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
                    <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
                </div>
                <div className="flex gap-2 mt-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-8 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                    ))}
                </div>
            </div>

            {/* Quick links skeleton */}
            <div className="flex gap-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 w-40 bg-neutral-200 dark:bg-neutral-800 rounded-2xl animate-pulse flex-shrink-0" />
                ))}
            </div>

            {/* Net result card skeleton */}
            <div className="bg-neutral-200 dark:bg-neutral-800 rounded-2xl h-80 animate-pulse" />

            {/* Insights skeleton */}
            <div className="space-y-2.5">
                <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-neutral-200 dark:bg-neutral-800 rounded-2xl animate-pulse" />
                ))}
            </div>

            {/* Occupation skeleton */}
            <div>
                <div className="h-3 w-28 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-2" />
                <div className="bg-neutral-200 dark:bg-neutral-800 rounded-2xl h-48 animate-pulse" />
            </div>

            {/* Fiscal skeleton */}
            <div>
                <div className="h-3 w-36 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-2" />
                <div className="bg-neutral-200 dark:bg-neutral-800 rounded-2xl h-16 animate-pulse" />
            </div>
        </div>
    );
}
