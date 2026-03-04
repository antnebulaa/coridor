import Skeleton from '@/components/ui/Skeleton';

export default function InboxLoading() {
    return (
        <div className="h-full flex flex-col md:flex-row">
            {/* Conversation list sidebar */}
            <aside className="bg-background border-r border-border flex flex-col w-full lg:w-[410px]">
                {/* Header: "Messages" title */}
                <div className="flex-none">
                    <div className="flex items-center h-[72px] px-5">
                        <Skeleton className="h-7 w-32" />
                    </div>

                    {/* Tab pills */}
                    <div className="flex gap-2 px-5 pb-2">
                        <Skeleton className="h-9 w-16 rounded-full" />
                        <Skeleton className="h-9 w-20 rounded-full" />
                        <Skeleton className="h-9 w-24 rounded-full" />
                        <Skeleton className="h-9 w-18 rounded-full" />
                    </div>
                </div>

                {/* Conversation items */}
                <div className="flex-1 overflow-hidden px-2 pt-2">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
                            {/* Avatar */}
                            <Skeleton className="h-[52px] w-[52px] shrink-0 rounded-full" />
                            {/* Content */}
                            <div className="min-w-0 flex-1 space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-4 w-10" />
                                </div>
                                <Skeleton className="h-4 w-44" />
                                <div className="flex items-center gap-2">
                                    <Skeleton className="w-2 h-2 rounded-full" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main area (desktop only) */}
            <div className="hidden md:flex flex-1 items-center justify-center">
                <Skeleton className="h-5 w-48 rounded-lg" />
            </div>
        </div>
    );
}
