import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import FiscalClient from "./FiscalClient";

const FiscalPage = async () => {
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
            <FiscalClient currentUser={currentUser} />
        </ClientOnly>
    );
}

export default FiscalPage;
