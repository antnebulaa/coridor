import EmptyState from "@/components/EmptyState";

const InboxPage = () => {
    return (
        <div className="hidden lg:block h-full">
            <EmptyState
                title="Select a chat"
                subtitle="Choose a conversation from the sidebar to start messaging"
            />
        </div>
    );
}

export default InboxPage;
