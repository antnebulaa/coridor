import Skeleton from '@/components/ui/Skeleton';
import Container from '@/components/Container';

export default function DashboardLoading() {
    return (
        <Container>
            <div className="pb-20 space-y-6">
                {/* Header: greeting + add property button */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
                    <div className="space-y-2">
                        <Skeleton className="h-9 w-56" />
                        <Skeleton className="h-5 w-72" />
                    </div>
                    <Skeleton className="h-11 w-40 rounded-full" />
                </div>

                {/* KPI Cards — 2 cols mobile, 4 cols desktop */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-card border border-border p-4 rounded-2xl space-y-3">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-8 w-24" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    ))}
                </div>

                {/* Chart (3 cols) + Operations panel (1 col) */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Cashflow chart */}
                    <div className="lg:col-span-3 bg-card border border-border p-5 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-5 w-36" />
                            <Skeleton className="h-8 w-24 rounded-lg" />
                        </div>
                        <Skeleton className="h-52 w-full rounded-lg" />
                    </div>

                    {/* Operations panel */}
                    <div className="bg-card border border-border p-5 rounded-xl flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-5 rounded" />
                            <Skeleton className="h-5 w-32" />
                        </div>
                        {/* Occupancy rate */}
                        <div className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg space-y-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-6 w-16" />
                        </div>
                        {/* Applications link */}
                        <div className="flex items-center justify-between p-3 rounded-lg">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-6 w-8" />
                        </div>
                        {/* Visits link */}
                        <div className="flex items-center justify-between p-3 rounded-lg">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-6 w-8" />
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    );
}
