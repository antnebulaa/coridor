import EmptyState from "@/components/EmptyState";
import ClientOnly from "@/components/ClientOnly";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getApplications from "@/app/actions/getApplications";
import prisma from "@/libs/prismadb";

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

    const applications = await getApplications();
    const signedLeases = applications.filter((app: any) => app.leaseStatus === 'SIGNED');

    // Check if the user has an active bank connection (for rent tracking auto-detection)
    const bankConnection = await prisma.bankConnection.findFirst({
        where: { userId: currentUser.id, isActive: true },
        select: { id: true },
    });
    const hasBankConnection = !!bankConnection;

    if (signedLeases.length === 0) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Aucune location en cours"
                    subtitle={`Vous n'avez actuellement aucune location en cours.\nLes informations de votre prochaine logement s'afficheront ici.`}
                    actionLabel="Recherche le logement ideal"
                    actionUrl="/"
                />
            </ClientOnly>
        );
    }

    return (
        <ClientOnly>
            <RentalsClient
                leases={signedLeases}
                currentUser={currentUser}
                hasBankConnection={hasBankConnection}
            />
        </ClientOnly>
    );
}

export default RentalsPage;
