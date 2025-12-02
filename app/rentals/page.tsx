import EmptyState from "@/components/EmptyState";
import ClientOnly from "@/components/ClientOnly";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getReservations from "@/app/actions/getReservations";

import RentalsClient from "./RentalsClient";

const RentalsPage = async () => {
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

    const reservations = await getReservations({ userId: currentUser.id });

    if (reservations.length === 0) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Aucune location en cours"
                    subtitle={`Vous n'avez actuellement aucune location en cours.\nLes informations de votre prochaine logement s'afficheront ici.`}
                    actionLabel="Recherche le logement idéal"
                    actionUrl="/"
                />
            </ClientOnly>
        );
    }

    return (
        <ClientOnly>
            <RentalsClient
                reservations={reservations}
                currentUser={currentUser}
            />
        </ClientOnly>
    );
}

export default RentalsPage;
