'use client';

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FullConversationType } from "@/types";
import clsx from "clsx";
import { useSession } from "next-auth/react";

import ConversationBox from "./ConversationBox";
import useConversation from "@/hooks/useConversation";

interface ConversationListProps {
    initialItems: FullConversationType[];
}

const ConversationList: React.FC<ConversationListProps> = ({
    initialItems
}) => {
    const [items, setItems] = useState(initialItems);
    const router = useRouter();
    const { isOpen } = useConversation();

    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const session = useSession();

    const filteredItems = items.filter((item) => {
        if (filter === 'all') return true;

        const lastMessage = item.messages?.[item.messages.length - 1];
        if (!lastMessage) return false;

        const seenArray = lastMessage.seen || [];
        const userEmail = session.data?.user?.email;

        if (!userEmail) return false;

        return seenArray.filter((user) => user.email === userEmail).length === 0;
    });

    return (
        <aside className={clsx(`
        fixed 
        inset-y-0 
        pt-0
        md:pt-20
        bg-white
        pb-20
        lg:pb-0
        lg:left-0
        lg:w-80 
        lg:block
        overflow-y-auto 
        border-r 
        border-gray-200 
      `,
            // On mobile, hide if a chat is open (we can check params, but layout handles children)
            // Actually, in Next.js nested layouts, the list is always rendered.
            // We need to hide it on mobile if we are in a conversation.
            // But `layout` doesn't know about params easily without `useParams`.
            // Let's just make it always visible on desktop, and on mobile... it's tricky with nested layout.
            // Simpler approach: `app/inbox/page.tsx` shows list. `app/inbox/[id]/page.tsx` shows chat.
            // But then we lose the split view on desktop.
            // Let's stick to split view.
            isOpen ? 'hidden' : 'block w-full left-0'
        )}>
            <div className="px-5">
                <div className="flex justify-between mb-4 pt-4">
                    <div className="text-2xl font-medium text-neutral-800">
                        Messages
                    </div>
                </div>

                <div className="flex gap-4 mb-4 border-b border-gray-200">
                    <button
                        onClick={() => setFilter('all')}
                        className={clsx(`
                            pb-2 
                            text-sm 
                            font-medium 
                            transition
                            border-b-2
                        `,
                            filter === 'all'
                                ? 'border-black text-black'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        )}
                    >
                        Tout
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={clsx(`
                            pb-2 
                            text-sm 
                            font-medium 
                            transition
                            border-b-2
                        `,
                            filter === 'unread'
                                ? 'border-black text-black'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        )}
                    >
                        Non lus
                    </button>
                </div>

                {filteredItems.map((item) => (
                    <ConversationBox
                        key={item.id}
                        data={item}
                        selected={false}
                    />
                ))}
            </div>
        </aside>
    );
}

export default ConversationList;
