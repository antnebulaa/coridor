import EmptyState from "@/components/EmptyState";
import ClientOnly from "@/components/ClientOnly";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getProperties from "@/app/actions/getProperties";

import PropertiesClient from "./PropertiesClient";

export const dynamic = 'force-dynamic';

const PropertiesPage = async () => {
    const currentUser = await getCurrentUser();

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

    const properties = await getProperties();

    return (
        <ClientOnly>
            <div className="bg-neutral-100 min-h-screen">
                <PropertiesClient
                    properties={properties}
                    currentUser={currentUser}
                />
            </div>
        </ClientOnly>
    );
};

export default PropertiesPage;
