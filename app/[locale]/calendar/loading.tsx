import Skeleton from '@/components/ui/Skeleton';
import Container from '@/components/Container';

export default function CalendarLoading() {
    return (
        <Container>
            <div className="flex flex-col gap-6">
                {/* Header: sticky area */}
                <div className="pt-safe md:pt-4 pb-2">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-44" />
                            <Skeleton className="h-5 w-56" />
                        </div>
                        {/* View toggle pills */}
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-24 rounded-full" />
                            <Skeleton className="h-9 w-24 rounded-full" />
                        </div>
                    </div>

                    {/* Date navigation */}
                    <div className="flex items-center justify-between mt-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-6 w-36" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                </div>

                {/* Agenda items */}
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex gap-4 items-start">
                            {/* Time column */}
                            <div className="w-16 shrink-0 text-right space-y-1">
                                <Skeleton className="h-4 w-12 ml-auto" />
                                <Skeleton className="h-3 w-10 ml-auto" />
                            </div>
                            {/* Event card */}
                            <div className="flex-1 border border-border rounded-xl p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                                <Skeleton className="h-3 w-44" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Container>
    );
}
