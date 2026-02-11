import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import PreferencesClient from "./PreferencesClient";

const PreferencesPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Unauthorized"
                    subtitle="Please login"
                />
            </ClientOnly>
        );
    }

    return (
        <ClientOnly>
            <PreferencesClient currentUser={currentUser} />
        </ClientOnly>
    );
}

export default PreferencesPage;
