import Skeleton from '@/components/ui/Skeleton';

export default function RootLoading() {
    return (
        <div className="max-w-[2520px] mx-auto xl:px-20 md:px-10 sm:px-2 px-4">
            <div className="pt-6 pb-20 space-y-6">
                {/* Generic header */}
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-64" />
                </div>

                {/* Generic content blocks */}
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-3">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-full max-w-md" />
                            <Skeleton className="h-4 w-3/4 max-w-sm" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
