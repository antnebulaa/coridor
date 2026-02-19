import { LeaseService } from "@/services/LeaseService";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import LeaseViewerClient from "./LeaseViewerClient";
import prisma from "@/libs/prismadb";

interface IParams {
    applicationId: string;
}

const LeasePage = async (props: { params: Promise<IParams> }) => {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return <ClientOnly><EmptyState title="Non autorisé" subtitle="Veuillez vous connecter." /></ClientOnly>;
    }

    try {
        // Verify user is authorized (landlord or tenant)
        const application = await prisma.rentalApplication.findUnique({
            where: { id: params.applicationId },
            include: {
                listing: { include: { rentalUnit: { include: { property: true } } } },
                candidateScope: { select: { creatorUserId: true } }
            }
        });

        if (!application) {
            return <ClientOnly><EmptyState title="Non trouvé" subtitle="Ce bail n'existe pas." /></ClientOnly>;
        }

        const isOwner = application.listing?.rentalUnit?.property?.ownerId === currentUser.id;
        const isTenant = application.candidateScope?.creatorUserId === currentUser.id;

        if (!isOwner && !isTenant) {
            return <ClientOnly><EmptyState title="Accès refusé" subtitle="Vous n'avez pas accès à ce bail." /></ClientOnly>;
        }

        const leaseConfig = await LeaseService.generateLeaseConfig(params.applicationId);

        return (
            <ClientOnly>
                <LeaseViewerClient leaseConfig={leaseConfig} isOwner={isOwner} />
            </ClientOnly>
        );

    } catch (error: any) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Erreur"
                    subtitle={error.message || "Impossible de générer le bail."}
                />
            </ClientOnly>
        );
    }
}

export default LeasePage;
