import Skeleton from '@/components/ui/Skeleton';

export default function ConversationLoading() {
    return (
        <div className="h-full flex flex-col">
            {/* Header — 72px */}
            <div className="flex items-center gap-3 h-[72px] px-4 lg:px-6 border-b border-border">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-20 rounded-full" />
            </div>

            {/* Messages area */}
            <div className="flex-1 p-4 space-y-4 overflow-hidden">
                {/* Incoming message */}
                <div className="flex items-end gap-2 max-w-[70%]">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <Skeleton className="h-14 flex-1 rounded-2xl rounded-bl-md" />
                </div>

                {/* Outgoing message */}
                <div className="flex justify-end">
                    <Skeleton className="h-10 w-48 rounded-2xl rounded-br-md" />
                </div>

                {/* Incoming message (longer) */}
                <div className="flex items-end gap-2 max-w-[70%]">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <Skeleton className="h-20 flex-1 rounded-2xl rounded-bl-md" />
                </div>

                {/* Outgoing message */}
                <div className="flex justify-end">
                    <Skeleton className="h-12 w-40 rounded-2xl rounded-br-md" />
                </div>

                {/* Incoming message */}
                <div className="flex items-end gap-2 max-w-[60%]">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <Skeleton className="h-10 flex-1 rounded-2xl rounded-bl-md" />
                </div>
            </div>

            {/* Message input */}
            <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                    <Skeleton className="h-12 flex-1 rounded-full" />
                    <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                </div>
            </div>
        </div>
    );
}
