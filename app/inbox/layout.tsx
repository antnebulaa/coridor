import getConversations from "@/app/actions/getConversations";
import Sidebar from "@/components/sidebar/Sidebar";
import ConversationList from "./ConversationList";

export default async function InboxLayout({
    children
}: {
    children: React.ReactNode
}) {
    const conversations = await getConversations();

    return (
        <div className="h-[100dvh] md:h-[calc(100vh-80px)] flex">
            <ConversationList
                initialItems={conversations}
            />
            <div className="flex-1 h-full min-w-0">
                {children}
            </div>
        </div>
    );
}
