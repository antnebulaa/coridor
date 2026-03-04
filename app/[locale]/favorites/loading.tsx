import Skeleton from '@/components/ui/Skeleton';
import Container from '@/components/Container';

export default function FavoritesLoading() {
    return (
        <Container>
            <div className="pb-20 space-y-6">
                <div className="pt-4">
                    <Skeleton className="h-9 w-40" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-2xl overflow-hidden">
                            <Skeleton className="h-48 w-full rounded-xl" />
                            <div className="p-3 space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Container>
    );
}
