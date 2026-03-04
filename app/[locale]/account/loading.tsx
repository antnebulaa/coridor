import Skeleton from '@/components/ui/Skeleton';

export default function AccountLoading() {
    return (
        <div className="p-6 space-y-6">
            {/* Profile card */}
            <div className="flex items-center gap-4 p-5 rounded-3xl bg-neutral-50 dark:bg-neutral-900">
                <Skeleton className="h-13 w-13 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-36" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>

            {/* Sections */}
            {[...Array(3)].map((_, s) => (
                <div key={s} className="space-y-2">
                    <Skeleton className="h-3 w-24 ml-3" />
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3.5 py-2.5 px-3">
                            <Skeleton className="h-5 w-5 rounded" />
                            <Skeleton className="h-4 w-36" />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
