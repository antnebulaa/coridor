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
        <Sidebar>
            <div className="h-full">
                <ConversationList
                    initialItems={conversations}
                />
                {children}
            </div>
        </Sidebar>
    );
}
