import Skeleton from '@/components/ui/Skeleton';

export default function HomeLoading() {
    return (
        <div className="pt-4 pb-20">
            <div className="px-4 md:px-8 lg:px-12">
                {/* Search/filter bar */}
                <div className="flex gap-2 mb-6">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-9 w-20 rounded-full" />
                    ))}
                </div>

                {/* Listing cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex flex-col gap-2">
                            <Skeleton className="aspect-square w-full rounded-xl" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-1/3" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
