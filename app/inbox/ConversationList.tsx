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
        <aside className={clsx(
            /* Base Styles */
            `bg-background border-r border-border flex flex-col`,

            /* Mobile Styles */
            isOpen ? 'hidden lg:flex' : 'absolute inset-0 z-40 w-full pb-20 lg:pb-0 pt-24 lg:pt-0',

            /* Desktop Styles */
            `lg:static 
             lg:w-[410px] 
             lg:inset-auto 
             lg:z-auto 
             lg:h-full
             lg:block`
        )}>
            <div className="px-5 pt-4 pb-2 border-b border-border flex-none bg-background z-10">
                <div className="flex justify-between mb-4">
                    <div className="text-2xl font-medium text-foreground">
                        Messages
                    </div>
                </div>

                <div className="flex gap-4">
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
                                ? 'border-foreground text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
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
                                ? 'border-foreground text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        Non lus
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5">
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
