import VisitsClient from "./VisitsClient";
import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getVisits from "@/app/actions/getVisits";
import EmptyState from "@/components/EmptyState";

const CalendarPage = async ({ searchParams }: { searchParams: { view?: string } }) => {
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

    const view = searchParams?.view || 'visits';

    if (view === 'visits') {
        const visits = await getVisits();
        return (
            <ClientOnly>
                <VisitsClient
                    currentUser={currentUser}
                    visits={visits}
                />
            </ClientOnly>
        );
    }

    return (
        <ClientOnly>
            <EmptyState
                title="Calendar View"
                subtitle="Not implemented yet."
            />
        </ClientOnly>
    )
}

export default CalendarPage;
