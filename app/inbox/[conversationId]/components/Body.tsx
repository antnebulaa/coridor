
import axios from "axios";
import { useEffect, useRef, useState } from "react";
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
}

const Body: React.FC<BodyProps> = ({
    initialMessages,
    onOpenVisitSlots,
    onToggleDossier,
    onOpenListingRecap,
    showDossier
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
                    isMenuOpen={activeMessageId === message.id}
                    onOpenMenu={() => setActiveMessageId(message.id)}
                    onCloseMenu={() => setActiveMessageId(null)}
                />
            ))}
            <div ref={bottomRef} className="pt-24" />
        </div>
    );
}

export default Body;
