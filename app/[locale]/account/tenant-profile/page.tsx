import { redirect } from "next/navigation";
import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getTenantProfile from "@/app/actions/getTenantProfile";
import TenantProfileClient from "./TenantProfileClient";

const TenantProfilePage = async () => {
    const currentUser = await getCurrentUser();
    const tenantProfile = await getTenantProfile();

    if (!currentUser) {
        redirect('/');
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
