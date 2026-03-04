import Skeleton from '@/components/ui/Skeleton';

export default function EditPropertyLoading() {
    return (
        <div className="md:fixed md:top-[73px] md:bottom-0 md:left-0 md:right-0">
            <div className="max-w-[2520px] mx-auto px-4 sm:px-2 md:pl-10 md:pr-0 xl:pl-20 xl:pr-0 md:h-full">
                <div className="grid grid-cols-1 md:grid-cols-[400px_1fr] md:h-full">
                    {/* Sidebar */}
                    <div className="col-span-1 md:overflow-y-auto md:pr-10 md:pt-10">
                        {/* Back button + title */}
                        <div className="flex items-center gap-4 mb-6">
                            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                            <Skeleton className="h-7 w-48" />
                        </div>

                        {/* Tab pills */}
                        <div className="flex gap-2 mb-6">
                            <Skeleton className="h-9 w-24 rounded-full" />
                            <Skeleton className="h-9 w-24 rounded-full" />
                            <Skeleton className="h-9 w-28 rounded-full" />
                        </div>

                        {/* Section links */}
                        <div className="space-y-1">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl">
                                    <Skeleton className="h-5 w-5 rounded shrink-0" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content area (desktop) */}
                    <div className="hidden md:block col-span-1 bg-neutral-50 dark:bg-neutral-950 md:overflow-y-auto p-10">
                        <div className="max-w-2xl space-y-6">
                            <Skeleton className="h-7 w-36" />
                            <div className="space-y-4">
                                <Skeleton className="h-12 w-full rounded-xl" />
                                <Skeleton className="h-12 w-full rounded-xl" />
                                <Skeleton className="h-24 w-full rounded-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
