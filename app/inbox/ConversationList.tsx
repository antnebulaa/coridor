'use client';

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { FullConversationType, SafeUser } from "@/types";
import clsx from "clsx";
import ConversationBox from "./ConversationBox";
import useConversation from "@/hooks/useConversation";
import useRealtimeNotifications from "@/hooks/useRealtimeNotifications";

interface ConversationListProps {
    initialItems: FullConversationType[];
    currentUser: SafeUser | null;
}

type Tab = 'all' | 'tenant' | 'landlord' | 'support';

const ConversationList: React.FC<ConversationListProps> = ({
    initialItems,
    currentUser
}) => {
    const [items, setItems] = useState(initialItems);
    const [currentTab, setCurrentTab] = useState<Tab>('all');
    const router = useRouter();
    const { isOpen } = useConversation();

    useEffect(() => {
        console.log("ConversationList: Initial items updated", initialItems.length);
        setItems(initialItems);
    }, [initialItems]);

    // Realtime subscription for new messages - refresh list to update order and unread counts
    useRealtimeNotifications({
        userId: currentUser?.id,
        onNewMessage: (payload) => {
            console.log("ConversationList: New message received, refreshing router...");
            router.refresh();
        }
    });

    const filteredItems = useMemo(() => {
        if (!currentUser) return [];

        return items.filter((item) => {
            if (currentTab === 'all') return true;

            // 1. Support Logic: No listing, or Broken Listing Data (fallback to Support)
            // We use 'as any' to check for deep property existence safely
            const deepOwnerId = (item.listing as any)?.rentalUnit?.property?.owner?.id;

            if (currentTab === 'support') {
                return !item.listing || !deepOwnerId;
            }

            // 2. For Tenant/Landlord tabs, valid listing AND valid owner info is required
            if (!item.listing || !deepOwnerId) return false;

            // 3. Determine Ownership
            const listingOwnerId = deepOwnerId;
            const isOwner = currentUser.id === listingOwnerId;

            if (currentTab === 'landlord') {
                return isOwner;
            }

            if (currentTab === 'tenant') {
                return !isOwner;
            }

            return false;
        });
    }, [items, currentTab, currentUser]);

    // Unread Counts Logic
    const unreadCounts = useMemo(() => {
        const counts = {
            tenant: 0,
            landlord: 0,
            support: 0
        };

        if (!currentUser) return counts;

        items.forEach((item) => {
            // Check if unread: verification logic from ConversationBox, but lifted
            const lastMessage = item.messages?.[item.messages.length - 1];
            if (!lastMessage) return;

            const seenArray = lastMessage.seen || [];
            const hasSeen = seenArray.some((user) => user.email === currentUser.email);

            if (hasSeen) return; // Msg is read, don't count it

            // If unread, determine which category it belongs to
            let category: Tab | null = null;
            const deepOwnerId = (item.listing as any)?.rentalUnit?.property?.owner?.id;

            if (!item.listing || !deepOwnerId) {
                category = 'support';
            } else {
                const listingOwnerId = deepOwnerId;
                const isOwner = currentUser.id === listingOwnerId;
                category = isOwner ? 'landlord' : 'tenant';
            }

            if (category) {
                counts[category]++;
            }
        });

        return counts;
    }, [items, currentUser]);

    return (
        <aside className={clsx(
            /* Base Styles */
            `bg-background border-r border-border flex flex-col`,

            /* Mobile Styles */
            isOpen ? 'hidden lg:flex' : 'absolute inset-0 z-40 w-full pb-20 lg:pb-0 pt-0 lg:pt-0',

            /* Desktop Styles */
            `lg:static 
             lg:w-[410px] 
             lg:inset-auto 
             lg:z-auto 
             lg:h-full
             lg:block`
        )}>
            <div className="px-5 pt-4 pb-2 flex-none bg-background z-10">
                <div className="flex justify-between mb-4">
                    <div className="text-2xl font-medium text-foreground">
                        Messages
                    </div>
                </div>

                <div className="flex gap-2 pb-2 overflow-x-auto">
                    <button
                        onClick={() => setCurrentTab('all')}
                        className={clsx(`
                            px-4
                            py-2
                            text-sm 
                            font-medium 
                            transition
                            relative
                            flex
                            items-center
                            gap-2
                            rounded-full
                        `,
                            currentTab === 'all'
                                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                        )}
                    >
                        Tous
                    </button>
                    <button
                        onClick={() => setCurrentTab('tenant')}
                        className={clsx(`
                            px-4
                            py-2
                            text-sm 
                            font-medium 
                            transition
                            relative
                            flex
                            items-center
                            gap-2
                            rounded-full
                        `,
                            currentTab === 'tenant'
                                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                        )}
                    >
                        Locataire
                        {unreadCounts.tenant > 0 && (
                            <div className="bg-red-500 text-white text-[10px] px-1.5 h-4 rounded-full flex items-center justify-center">
                                {unreadCounts.tenant > 9 ? '9+' : unreadCounts.tenant}
                            </div>
                        )}
                    </button>
                    <button
                        onClick={() => setCurrentTab('landlord')}
                        className={clsx(`
                            px-4 
                            py-2
                            text-sm 
                            font-medium 
                            transition
                            relative
                            flex
                            items-center
                            gap-2
                            rounded-full
                        `,
                            currentTab === 'landlord'
                                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                        )}
                    >
                        Propriétaire
                        {unreadCounts.landlord > 0 && (
                            <div className="bg-red-500 text-white text-[10px] px-1.5 h-4 rounded-full flex items-center justify-center">
                                {unreadCounts.landlord > 9 ? '9+' : unreadCounts.landlord}
                            </div>
                        )}
                    </button>
                    <button
                        onClick={() => setCurrentTab('support')}
                        className={clsx(`
                            px-4 
                            py-2
                            text-sm 
                            font-medium 
                            transition
                            relative
                            flex
                            items-center
                            gap-2
                            rounded-full
                        `,
                            currentTab === 'support'
                                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                        )}
                    >
                        Assistance
                        {unreadCounts.support > 0 && (
                            <div className="bg-red-500 text-white text-[10px] px-1.5 h-4 rounded-full flex items-center justify-center">
                                {unreadCounts.support > 9 ? '9+' : unreadCounts.support}
                            </div>
                        )}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pt-2">
                {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                        <p className="text-center">Aucune conversation</p>
                    </div>
                ) : (
                    filteredItems.map((item) => (
                        <ConversationBox
                            key={item.id}
                            data={item}
                            selected={false}
                        />
                    ))
                )}
            </div>
        </aside>
    );
}

export default ConversationList;
