import Skeleton from '@/components/ui/Skeleton';
import Container from '@/components/Container';

export default function PropertiesLoading() {
    return (
        <div className="bg-neutral-100 dark:bg-neutral-950 min-h-screen">
            <Container>
                <div className="pb-24 space-y-4">
                    {/* PageHeader */}
                    <div className="pt-4 space-y-1">
                        <Skeleton className="h-8 w-44" />
                        <Skeleton className="h-5 w-56" />
                    </div>

                    {/* Filter pills row */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        <Skeleton className="h-9 w-20 rounded-full shrink-0" />
                        <Skeleton className="h-9 w-24 rounded-full shrink-0" />
                        <Skeleton className="h-9 w-20 rounded-full shrink-0" />
                        <Skeleton className="h-9 w-22 rounded-full shrink-0" />
                    </div>

                    {/* Property cards grid — 1 col mobile, 2 tablet, 3 desktop */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-neutral-900 rounded-[20px] p-3 flex flex-col gap-3">
                                {/* Top row: thumbnail + property info */}
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-16 h-16 shrink-0 rounded-[16px]" />
                                    <div className="flex-1 space-y-1.5">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 w-40" />
                                    </div>
                                </div>
                                {/* Listing sub-card */}
                                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-4 w-28" />
                                        <Skeleton className="h-5 w-16 rounded-full" />
                                    </div>
                                    <Skeleton className="h-4 w-20" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Container>
        </div>
    );
}
