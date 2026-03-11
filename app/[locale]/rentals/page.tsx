import { redirect } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import ClientOnly from "@/components/ClientOnly";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getApplications from "@/app/actions/getApplications";
import prisma from "@/libs/prismadb";

import RentalsClient from "./RentalsClient";

const RentalsPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    const isLandlord = currentUser.userMode === 'LANDLORD';

    let signedLeases: any[] = [];

    if (isLandlord) {
        // Propriétaire : baux signés sur ses annonces
        const applications = await prisma.rentalApplication.findMany({
            where: {
                leaseStatus: 'SIGNED',
                listing: {
                    rentalUnit: {
                        property: { ownerId: currentUser.id },
                    },
                },
            },
            include: {
                listing: {
                    include: {
                        rentalUnit: {
                            include: {
                                property: {
                                    include: {
                                        images: { take: 1, orderBy: { order: 'asc' } },
                                    },
                                },
                                images: { take: 1, orderBy: { order: 'asc' } },
                            },
                        },
                    },
                },
                candidateScope: true,
            },
            orderBy: { appliedAt: 'desc' },
        });

        signedLeases = applications.map((application) => ({
            ...application,
            appliedAt: application.appliedAt.toISOString(),
            listing: {
                ...application.listing,
                createdAt: application.listing.createdAt.toISOString(),
                updatedAt: application.listing.updatedAt.toISOString(),
                statusUpdatedAt: application.listing.statusUpdatedAt.toISOString(),
                availableFrom: application.listing.availableFrom
                    ? application.listing.availableFrom.toISOString()
                    : null,
                rentalUnit: {
                    ...application.listing.rentalUnit,
                    property: {
                        ...application.listing.rentalUnit.property,
                        createdAt: application.listing.rentalUnit.property.createdAt.toISOString(),
                        updatedAt: application.listing.rentalUnit.property.updatedAt.toISOString(),
                    },
                },
            },
            candidateScope: {
                ...application.candidateScope,
                createdAt: application.candidateScope.createdAt.toISOString(),
                targetMoveInDate: application.candidateScope.targetMoveInDate
                    ? application.candidateScope.targetMoveInDate.toISOString()
                    : null,
            },
        }));
    } else {
        // Locataire : baux où l'utilisateur est candidat
        const applications = await getApplications();
        signedLeases = applications.filter((app: any) => app.leaseStatus === 'SIGNED');
    }

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
                    title={isLandlord ? "Aucun bail signé" : "Aucune location en cours"}
                    subtitle={isLandlord
                        ? "Vous n'avez aucun bail signé pour le moment.\nLes régularisations de loyers s'afficheront ici."
                        : "Vous n'avez actuellement aucune location en cours.\nLes informations de votre prochain logement s'afficheront ici."}
                    actionLabel={isLandlord ? "Voir mes biens" : "Rechercher un logement"}
                    actionUrl={isLandlord ? "/properties" : "/"}
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
