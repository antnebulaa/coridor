import { LeaseService } from "@/services/LeaseService";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import LeaseViewerClient from "./LeaseViewerClient";

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
        const leaseConfig = await LeaseService.generateLeaseConfig(params.applicationId);

        const isOwner = currentUser.email === leaseConfig.landlord.email;

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
