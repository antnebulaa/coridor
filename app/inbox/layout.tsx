import getConversations from "@/app/actions/getConversations";
import Sidebar from "@/components/sidebar/Sidebar";
import ConversationList from "./ConversationList";
import InteractiveViewportWrapper from "@/components/InteractiveViewportWrapper";

export default async function InboxLayout({
    children
}: {
    children: React.ReactNode
}) {
    const conversations = await getConversations();

    return (
        <InteractiveViewportWrapper>
            <div className="h-full flex flex-col md:flex-row pt-20">
                <ConversationList
                    initialItems={conversations}
                />
                <div className="flex-1 h-full min-w-0">
                    {children}
                </div>
            </div>
        </InteractiveViewportWrapper>
    );
}
