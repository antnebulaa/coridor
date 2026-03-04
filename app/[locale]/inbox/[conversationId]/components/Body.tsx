
import axios from "axios";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { FullMessageType, SafeMessage } from "@/types";
import useConversation from "@/hooks/useConversation";
import MessageBox from "./MessageBox";

interface BodyProps {
    initialMessages: SafeMessage[];
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
}

const Body: React.FC<BodyProps> = ({
    initialMessages,
    onOpenVisitSlots,
    onToggleDossier,
    onOpenListingRecap,
    showDossier,
    applicationId,
    confirmedVisit,
    leaseStatus,
    onViewInPanel,
}) => {
    const [messages, setMessages] = useState(initialMessages);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

    const router = useRouter(); // Import useRouter from next/navigation (ensure import is added at top)

    const { conversationId } = useConversation();

    useEffect(() => {
        axios.post(`/api/conversations/${conversationId}/seen`)
            .then(() => {
                router.refresh();
            });
    }, [conversationId, router]);

    useEffect(() => {
        bottomRef?.current?.scrollIntoView();
    }, [messages]);

    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

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
            className="flex flex-col relative"
            onClick={() => setActiveMessageId(null)} // Close menu when clicking background
        >
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
                />
            ))}
            <div ref={bottomRef} className="pt-24" />
        </div>
    );
}

export default Body;
