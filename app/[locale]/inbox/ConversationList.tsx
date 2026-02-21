'use client';

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { FullConversationType, SafeUser } from "@/types";
import clsx from "clsx";
import ConversationBox from "./ConversationBox";
import useConversation from "@/hooks/useConversation";
import useRealtimeNotifications from "@/hooks/useRealtimeNotifications";
import { useTranslations } from "next-intl";

interface ConversationListProps {
    initialItems: FullConversationType[];
    currentUser: SafeUser | null;
}

type Tab = 'all' | 'tenant' | 'landlord' | 'support';

const ConversationList: React.FC<ConversationListProps> = ({
    initialItems,
    currentUser
}) => {
    const t = useTranslations('inbox');
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

    // Tabs scroll fade
    const tabsRef = useRef<HTMLDivElement>(null);
    const [tabsFade, setTabsFade] = useState({ left: false, right: false });

    const updateTabsFade = useCallback(() => {
        const el = tabsRef.current;
        if (!el) return;
        const hasOverflow = el.scrollWidth > el.clientWidth + 2;
        setTabsFade({
            left: el.scrollLeft > 4,
            right: hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 4
        });
    }, []);

    useEffect(() => {
        updateTabsFade();
        window.addEventListener('resize', updateTabsFade);
        return () => window.removeEventListener('resize', updateTabsFade);
    }, [updateTabsFade]);

    return (
        <aside className={clsx(
            /* Base Styles */
            `bg-background border-r border-border flex flex-col`,

            /* Mobile Styles */
            isOpen ? 'hidden lg:flex' : 'absolute inset-0 z-40 w-full pb-24 lg:pb-0 pt-[env(safe-area-inset-top)] lg:pt-0',

            /* Desktop Styles */
            `lg:static 
             lg:w-[410px] 
             lg:inset-auto 
             lg:z-auto 
             lg:h-full
             lg:block`
        )}>
            <div className="px-5 pt-6 pb-2 flex-none bg-background z-10">
                <div className="flex justify-between mb-4">
                    <div className="text-2xl font-medium text-foreground">
                        {t('title')}
                    </div>
                </div>

                <div className="relative">
                    {tabsFade.left && (
                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-linear-to-r from-background to-transparent z-10 pointer-events-none" />
                    )}
                    <div
                        ref={tabsRef}
                        onScroll={updateTabsFade}
                        className="flex gap-2 overflow-x-auto"
                        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                    >
                        {([
                            { key: 'all' as Tab, label: t('tabs.all') },
                            { key: 'tenant' as Tab, label: t('tabs.tenant'), count: unreadCounts.tenant },
                            { key: 'landlord' as Tab, label: t('tabs.landlord'), count: unreadCounts.landlord },
                            { key: 'support' as Tab, label: t('tabs.support'), count: unreadCounts.support },
                        ]).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setCurrentTab(tab.key)}
                                className={clsx(
                                    'px-4 py-2 text-sm font-medium transition flex items-center gap-2 rounded-full whitespace-nowrap shrink-0',
                                    currentTab === tab.key
                                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                                )}
                            >
                                {tab.label}
                                {tab.count && tab.count > 0 ? (
                                    <div className="bg-red-500 text-white text-[10px] px-1.5 h-4 rounded-full flex items-center justify-center">
                                        {tab.count > 9 ? '9+' : tab.count}
                                    </div>
                                ) : null}
                            </button>
                        ))}
                    </div>
                    {tabsFade.right && (
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-background to-transparent z-10 pointer-events-none" />
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pt-2">
                {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                        <p className="text-center">{t('empty')}</p>
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
