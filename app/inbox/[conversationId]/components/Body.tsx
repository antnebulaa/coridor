'use client';

import axios from "axios";
import { useEffect, useRef, useState } from "react";

import { FullMessageType, SafeMessage } from "@/types";
import useConversation from "@/hooks/useConversation";
import MessageBox from "./MessageBox";

interface BodyProps {
    initialMessages: SafeMessage[];
    onOpenVisitSlots?: () => void;
}

const Body: React.FC<BodyProps> = ({
    initialMessages,
    onOpenVisitSlots
}) => {
    const [messages, setMessages] = useState(initialMessages);
    const bottomRef = useRef<HTMLDivElement>(null);

    const { conversationId } = useConversation();

    useEffect(() => {
        axios.post(`/api/conversations/${conversationId}/seen`);
    }, [conversationId]);

    useEffect(() => {
        bottomRef?.current?.scrollIntoView();
    }, [messages]);

    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    return (
        <div className="flex flex-col">
            {messages.map((message, i) => (
                <MessageBox
                    isLast={i === messages.length - 1}
                    key={message.id}
                    data={message}
                    onOpenVisitSlots={onOpenVisitSlots}
                />
            ))}
            <div ref={bottomRef} className="pt-24" />
        </div>
    );
}

export default Body;
