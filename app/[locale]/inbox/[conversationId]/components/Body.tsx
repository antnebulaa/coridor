
import axios from "axios";
import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from 'next-intl';

import { SafeMessage } from "@/types";
import useConversation from "@/hooks/useConversation";
import MessageBox from "./MessageBox";

interface BodyProps {
    initialMessages: SafeMessage[];
    hasMoreMessages?: boolean;
    nextMessageCursor?: string | null;
    onOpenVisitSlots?: () => void;
    onToggleDossier?: () => void;
    onOpenListingRecap?: () => void;
    showDossier?: boolean;
    applicationId?: string | null;
    confirmedVisit?: {
        id: string;
        date: string;
        startTime: string;
        endTime: string;
    } | null;
    leaseStatus?: string | null;
    onViewInPanel?: (documentId: string) => void;
    otherUserEmoji?: string | null;
}

const Body: React.FC<BodyProps> = ({
    initialMessages,
    hasMoreMessages = false,
    nextMessageCursor = null,
    onOpenVisitSlots,
    onToggleDossier,
    onOpenListingRecap,
    showDossier,
    applicationId,
    confirmedVisit,
    leaseStatus,
    onViewInPanel,
    otherUserEmoji,
}) => {
    const [messages, setMessages] = useState(initialMessages);
    const [hasMore, setHasMore] = useState(hasMoreMessages);
    const [cursor, setCursor] = useState<string | null>(nextMessageCursor);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
    const isInitialLoad = useRef(true);
    const lastMessageIdRef = useRef<string | null>(
        initialMessages.length > 0 ? initialMessages[initialMessages.length - 1].id : null
    );
    // Ref-based loading flag for synchronous race condition prevention
    const isLoadingRef = useRef(false);

    const { conversationId } = useConversation();
    const t = useTranslations('inbox');

    // Mark conversation as seen
    useEffect(() => {
        axios.post(`/api/conversations/${conversationId}/seen`);
    }, [conversationId]);

    // Auto-scroll to bottom on initial load
    useEffect(() => {
        if (isInitialLoad.current) {
            bottomRef?.current?.scrollIntoView();
            isInitialLoad.current = false;
        }
    }, []);

    // Auto-scroll to bottom when NEW messages are appended (not when loading older ones)
    useEffect(() => {
        const currentLastId = messages.length > 0 ? messages[messages.length - 1].id : null;
        const previousLastId = lastMessageIdRef.current;

        // If the last message ID changed, a new message was appended → scroll down
        if (currentLastId && currentLastId !== previousLastId) {
            bottomRef?.current?.scrollIntoView({ behavior: 'smooth' });
        }

        lastMessageIdRef.current = currentLastId;
    }, [messages]);

    // Sync with parent when initialMessages changes (e.g., optimistic message)
    useEffect(() => {
        setMessages(prev => {
            // If initialMessages has new messages at the end, merge them
            if (prev.length === 0) return initialMessages;

            // Find messages in initialMessages that aren't in prev (by ID)
            const existingIds = new Set(prev.map(m => m.id));
            const newMessages = initialMessages.filter(m => !existingIds.has(m.id));

            if (newMessages.length > 0) {
                return [...prev, ...newMessages];
            }

            // If initialMessages is a complete refresh (no cursor/pagination), use it
            // This handles the case where the parent got fresh data
            if (initialMessages.length <= 50 && prev.length <= 50) {
                return initialMessages;
            }

            return prev;
        });
    }, [initialMessages]);

    // Sync pagination state from parent
    useEffect(() => {
        setHasMore(hasMoreMessages);
    }, [hasMoreMessages]);

    useEffect(() => {
        setCursor(nextMessageCursor);
    }, [nextMessageCursor]);

    // Load older messages when scrolling up
    const loadOlderMessages = useCallback(async () => {
        // Use ref for synchronous guard (prevents race between renders)
        if (isLoadingRef.current || !hasMore || !cursor) return;

        isLoadingRef.current = true;
        setIsLoadingMore(true);
        const container = scrollContainerRef.current;
        const previousScrollHeight = container?.scrollHeight || 0;

        try {
            const { data } = await axios.get('/api/messages', {
                params: {
                    conversationId,
                    cursor,
                    limit: 50,
                }
            });

            const olderMessages: SafeMessage[] = data.messages;
            setHasMore(data.hasMore);
            setCursor(data.nextCursor);

            if (olderMessages.length > 0) {
                setMessages(prev => {
                    // Deduplicate: don't add messages we already have
                    const existingIds = new Set(prev.map(m => m.id));
                    const uniqueOlder = olderMessages.filter(m => !existingIds.has(m.id));
                    return [...uniqueOlder, ...prev];
                });

                // Preserve scroll position after prepending messages
                requestAnimationFrame(() => {
                    if (container) {
                        const newScrollHeight = container.scrollHeight;
                        container.scrollTop = newScrollHeight - previousScrollHeight;
                    }
                });
            }
        } catch (error) {
            console.error('[Body] Failed to load older messages:', error);
        } finally {
            isLoadingRef.current = false;
            setIsLoadingMore(false);
        }
    }, [hasMore, cursor, conversationId]);

    // IntersectionObserver on the top sentinel — triggers loading older messages
    useEffect(() => {
        const sentinel = topSentinelRef.current;
        const container = scrollContainerRef.current;
        if (!sentinel || !container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry.isIntersecting && !isLoadingRef.current) {
                    loadOlderMessages();
                }
            },
            {
                root: container,
                rootMargin: '200px 0px 0px 0px',
                threshold: 0,
            }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadOlderMessages]);

    const scrollToMessage = useCallback((messageId: string) => {
        const el = document.getElementById(`message-${messageId}`);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("bg-amber-50", "dark:bg-amber-900/20");
            setTimeout(() => {
                el.classList.remove("bg-amber-50", "dark:bg-amber-900/20");
            }, 2000);
        }
    }, []);

    return (
        <div
            ref={scrollContainerRef}
            className="h-full overflow-y-auto"
        >
            <div
                className="flex flex-col relative"
                onClick={() => setActiveMessageId(null)}
            >
                {/* Top sentinel for infinite scroll */}
                <div ref={topSentinelRef} className="h-1" />

                {/* Loading indicator when fetching older messages */}
                {isLoadingMore && (
                    <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                    </div>
                )}

                {/* "Beginning of conversation" indicator */}
                {!hasMore && messages.length > 0 && (
                    <div className="flex justify-center py-4">
                        <span className="text-sm text-neutral-400 dark:text-neutral-500">
                            {t('conversation.beginning')}
                        </span>
                    </div>
                )}

                {messages.map((message, i) => (
                    <MessageBox
                        isLast={i === messages.length - 1}
                        key={message.id}
                        data={message}
                        onOpenVisitSlots={onOpenVisitSlots}
                        onToggleDossier={onToggleDossier}
                        onOpenListingRecap={onOpenListingRecap}
                        showDossier={showDossier}
                        applicationId={applicationId}
                        leaseStatus={leaseStatus}
                        isMenuOpen={activeMessageId === message.id}
                        onOpenMenu={() => setActiveMessageId(message.id)}
                        onCloseMenu={() => setActiveMessageId(null)}
                        confirmedVisit={confirmedVisit}
                        onViewInPanel={onViewInPanel}
                        otherUserEmoji={otherUserEmoji}
                    />
                ))}
                <div ref={bottomRef} className="pt-24" />
            </div>
        </div>
    );
}

export default Body;
