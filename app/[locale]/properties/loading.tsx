import Skeleton from '@/components/ui/Skeleton';
import Container from '@/components/Container';

export default function PropertiesLoading() {
    return (
        <div className="bg-neutral-100 dark:bg-neutral-950 min-h-screen">
            <Container>
                <div className="pb-20 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between pt-4">
                        <Skeleton className="h-9 w-48" />
                        <Skeleton className="h-10 w-36 rounded-full" />
                    </div>

                    {/* Property cards */}
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-48" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            </div>
                            <Skeleton className="h-3 w-full" />
                        </div>
                    ))}
                </div>
            </Container>
        </div>
    );
}
