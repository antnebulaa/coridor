'use client';

import axios from "axios";
import { useEffect, useRef, useState } from "react";

import { FullMessageType } from "@/types";
import useConversation from "@/hooks/useConversation";
import MessageBox from "./MessageBox";

interface BodyProps {
    initialMessages: FullMessageType[];
}

const Body: React.FC<BodyProps> = ({
    initialMessages
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
        <div className="flex-1 overflow-y-auto">
            {messages.map((message, i) => (
                <MessageBox
                    isLast={i === messages.length - 1}
                    key={message.id}
                    data={message}
                />
            ))}
            <div ref={bottomRef} className="pt-24" />
        </div>
    );
}

export default Body;
