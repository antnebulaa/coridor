import Skeleton from '@/components/ui/Skeleton';

export default function ConversationLoading() {
    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </div>
            {/* Messages */}
            <div className="flex-1 p-4 space-y-4">
                <div className="flex gap-2 max-w-[70%]">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <Skeleton className="h-16 w-64 rounded-2xl" />
                </div>
                <div className="flex justify-end">
                    <Skeleton className="h-12 w-48 rounded-2xl" />
                </div>
                <div className="flex gap-2 max-w-[70%]">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <Skeleton className="h-20 w-56 rounded-2xl" />
                </div>
                <div className="flex justify-end">
                    <Skeleton className="h-10 w-40 rounded-2xl" />
                </div>
            </div>
            {/* Input */}
            <div className="p-4 border-t border-border">
                <Skeleton className="h-12 w-full rounded-full" />
            </div>
        </div>
    );
}
