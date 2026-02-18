import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import PassportClient from "./PassportClient";

const PassportPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Non autorisé"
                    subtitle="Veuillez vous connecter"
                />
            </ClientOnly>
        );
    }

    return (
        <ClientOnly>
            <PassportClient currentUser={currentUser} />
        </ClientOnly>
    );
}

export default PassportPage;
