import Skeleton from '@/components/ui/Skeleton';
import Container from '@/components/Container';

export default function DashboardLoading() {
    return (
        <Container>
            <div className="pb-20 space-y-6 md:space-y-8 max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-5 w-64" />
                        <Skeleton className="h-4 w-36" />
                    </div>
                    <Skeleton className="h-10 w-10 md:w-40 rounded-full md:rounded-xl" />
                </div>

                {/* Action Cards */}
                <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                    ))}
                </div>

                {/* Monthly KPIs — 3 cards */}
                <div className="flex gap-4 md:grid md:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-5 min-w-[200px] space-y-3">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-9 w-28" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    ))}
                </div>

                {/* Property Status List */}
                <div className="space-y-4">
                    <Skeleton className="h-6 w-24" />
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-4">
                                <Skeleton className="w-12 h-12 rounded-lg" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-3 w-56" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Finance Section header */}
                <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
        </Container>
    );
}
