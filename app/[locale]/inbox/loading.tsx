import Skeleton from '@/components/ui/Skeleton';

export default function InboxLoading() {
    return (
        <div className="h-full flex flex-col md:flex-row">
            {/* Conversation list */}
            <div className="w-full md:w-80 lg:w-96 border-r border-border p-4 space-y-3">
                <Skeleton className="h-10 w-full rounded-full" />
                <div className="flex gap-2 mb-2">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-8 w-16 rounded-full" />
                    ))}
                </div>
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                        <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                        </div>
                    </div>
                ))}
            </div>
            {/* Content placeholder (desktop) */}
            <div className="hidden md:flex flex-1 items-center justify-center">
                <Skeleton className="h-6 w-48" />
            </div>
        </div>
    );
}
