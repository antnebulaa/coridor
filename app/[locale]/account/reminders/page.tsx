import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import RemindersClient from "./RemindersClient";

const RemindersPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Non autorise"
                    subtitle="Veuillez vous connecter"
                />
            </ClientOnly>
        );
    }

    return (
        <ClientOnly>
            <RemindersClient />
        </ClientOnly>
    );
}

export default RemindersPage;
