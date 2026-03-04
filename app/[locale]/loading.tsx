import Skeleton from '@/components/ui/Skeleton';

export default function HomeLoading() {
    return (
        <div className="max-w-[2520px] mx-auto">
            <div className="h-screen md:h-[calc(100vh-5rem)] grid grid-cols-1 md:grid-cols-12 gap-0 overflow-hidden relative">
                {/* Left Column: Listing list */}
                <div className="col-span-1 md:col-span-7 xl:col-span-6 h-full overflow-hidden">
                    <div className="pt-safe-navbar md:pt-4 px-[10px] md:pl-6 md:pr-3 pb-32 md:pb-6">
                        {/* Header: count + alert button */}
                        <div className="flex items-center justify-between mb-3">
                            <Skeleton className="h-5 w-28" />
                            <Skeleton className="h-8 w-24 rounded-lg" />
                        </div>

                        {/* Sort dropdown */}
                        <div className="mb-4">
                            <Skeleton className="h-9 w-32 rounded-lg" />
                        </div>

                        {/* Horizontal listing cards */}
                        <div className="grid grid-cols-1 gap-4 lg:gap-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="border-b border-neutral-200 dark:border-neutral-800 pb-4 last:border-none md:border-none md:pb-0">
                                    <div className="flex flex-col md:flex-row gap-1.5 md:gap-4 lg:gap-3 w-full h-auto md:h-[180px] bg-card rounded-3xl md:p-2">
                                        {/* Image */}
                                        <Skeleton className="w-full h-[200px] md:w-[240px] md:min-w-[240px] md:h-full rounded-[16px] shrink-0" />
                                        {/* Content */}
                                        <div className="flex flex-col justify-between py-1 md:py-2 flex-1 px-1 md:px-0">
                                            <div className="space-y-2">
                                                <Skeleton className="h-7 w-32" />
                                                <Skeleton className="h-4 w-44" />
                                                <Skeleton className="h-4 w-36" />
                                            </div>
                                            <div className="flex gap-2 mt-3 md:mt-0">
                                                <Skeleton className="h-6 w-16 rounded-full" />
                                                <Skeleton className="h-6 w-14 rounded-full" />
                                                <Skeleton className="h-6 w-12 rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Map placeholder */}
                <div className="hidden md:block col-span-1 md:col-span-5 xl:col-span-6 h-full bg-neutral-100 dark:bg-neutral-900" />
            </div>
        </div>
    );
}
