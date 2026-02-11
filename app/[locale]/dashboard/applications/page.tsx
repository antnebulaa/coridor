import EmptyState from "@/components/EmptyState";
import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getApplications from "@/app/actions/getApplications";
import ApplicationsClient from "./ApplicationsClient";

const ApplicationsPage = async () => {
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

    return (
        <ClientOnly>
            <ApplicationsClient
                currentUser={currentUser}
                applications={applications}
            />
        </ClientOnly>
    );
}

export default ApplicationsPage;
