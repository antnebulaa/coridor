import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getTenantProfile from "@/app/actions/getTenantProfile";
import TenantProfileClient from "./TenantProfileClient";

const TenantProfilePage = async () => {
    const currentUser = await getCurrentUser();
    const tenantProfile = await getTenantProfile();

    if (!currentUser) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Unauthorized"
                    subtitle="Please login"
                />
            </ClientOnly>
        )
    }

    return (
        <ClientOnly>
            <TenantProfileClient
                currentUser={currentUser}
                tenantProfile={tenantProfile}
            />
        </ClientOnly>
    );
};

export default TenantProfilePage;
