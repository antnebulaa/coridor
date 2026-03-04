import Skeleton from '@/components/ui/Skeleton';
import Container from '@/components/Container';

export default function DashboardLoading() {
    return (
        <Container>
            <div className="pb-20 space-y-6">
                {/* PageHeader */}
                <div className="flex flex-col gap-2 pt-4">
                    <Skeleton className="h-9 w-56" />
                    <Skeleton className="h-5 w-40" />
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-card border border-border p-4 rounded-2xl space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    ))}
                </div>

                {/* Chart + Operations panel */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3 bg-card border border-border p-5 rounded-xl space-y-4">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                    <div className="bg-card border border-border p-5 rounded-xl space-y-4">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>

                {/* Widgets row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-card border border-border p-5 rounded-xl space-y-3">
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                    <div className="bg-card border border-border p-5 rounded-xl space-y-3">
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            </div>
        </Container>
    );
}
