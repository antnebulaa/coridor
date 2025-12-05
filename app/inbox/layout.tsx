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
        <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-80px)] flex">
            <div className="h-full">
                <ConversationList
                    initialItems={conversations}
                />
            </div>
            <div className="flex-1 h-full min-w-0">
                {children}
            </div>
        </div>
    );
}
