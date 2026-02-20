import getConversations from "@/app/actions/getConversations";
import Sidebar from "@/components/sidebar/Sidebar";
import ConversationList from "./ConversationList";
import InteractiveViewportWrapper from "@/components/InteractiveViewportWrapper";
import { redirect } from 'next/navigation';

import getCurrentUser from "@/app/actions/getCurrentUser";

export default async function InboxLayout({
    children
}: {
    children: React.ReactNode
}) {
    const conversations = await getConversations();
    const currentUser = await getCurrentUser();
    if (!currentUser) { redirect('/'); }

    return (
        <InteractiveViewportWrapper>
            <div className="h-full flex flex-col md:flex-row">
                <ConversationList
                    initialItems={conversations}
                    currentUser={currentUser}
                />
                <div className="flex-1 h-full min-w-0">
                    {children}
                </div>
            </div>
        </InteractiveViewportWrapper>
    );
}
