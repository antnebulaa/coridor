import EmptyState from "@/components/EmptyState";
import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getDashboardStats from "@/app/actions/getDashboardStats";
import DashboardClient from "./DashboardClient";

const DashboardPage = async () => {
    const currentUser = await getCurrentUser();
    const stats = await getDashboardStats();

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

    if (!stats) {
        return (
            <ClientOnly>
                <EmptyState
                    title="No data found"
                    subtitle="Start by creating a property"
                />
            </ClientOnly>
        );
    }

    return (
        <ClientOnly>
            <DashboardClient stats={stats} />
        </ClientOnly>
    );
}

export default DashboardPage;
