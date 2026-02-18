import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import TaxSimulatorClient from "./TaxSimulatorClient";

const TaxSimulatorPage = async () => {
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
            <TaxSimulatorClient currentUser={currentUser} />
        </ClientOnly>
    );
}

export default TaxSimulatorPage;
