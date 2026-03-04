import Skeleton from '@/components/ui/Skeleton';
import Container from '@/components/Container';

export default function FavoritesLoading() {
    return (
        <Container>
            <div className="pb-20">
                {/* PageHeader */}
                <div className="pt-4 flex items-center justify-between">
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                </div>

                {/* Wishlist cards grid — matches actual breakpoints */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex flex-col gap-2 w-full">
                            {/* Image grid: 3 cols × 2 rows with aspect 4/3 */}
                            <div className="aspect-[4/3] w-full grid grid-cols-3 grid-rows-2 gap-1 overflow-hidden rounded-[20px]">
                                {/* Large image (left 2/3) */}
                                <Skeleton className="col-span-2 row-span-2 h-full w-full rounded-none" />
                                {/* Top right */}
                                <Skeleton className="col-span-1 row-span-1 h-full w-full rounded-none" />
                                {/* Bottom right */}
                                <Skeleton className="col-span-1 row-span-1 h-full w-full rounded-none" />
                            </div>
                            {/* Text */}
                            <div className="space-y-1">
                                <Skeleton className="h-5 w-28" />
                                <Skeleton className="h-4 w-16" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Container>
    );
}
