import EmptyState from "@/components/EmptyState";

const InboxPage = () => {
    return (
        <div className="hidden lg:block lg:pl-80 h-full">
            <EmptyState
                title="Select a chat"
                subtitle="Choose a conversation from the sidebar to start messaging"
            />
        </div>
    );
}

export default InboxPage;
