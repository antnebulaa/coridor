import VisitsClient from "./VisitsClient";
import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getVisits from "@/app/actions/getVisits";
import EmptyState from "@/components/EmptyState";
import LandlordCalendarClient from "../components/calendar/LandlordCalendarClient";
import getLandlordCalendarData from "@/app/actions/getLandlordCalendarData";

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

    // Landlord Mode: Show Calendar by default
    if (currentUser.userMode === 'LANDLORD') {
        const calendarData = await getLandlordCalendarData();
        if (calendarData) {
            return (
                <ClientOnly>
                    <LandlordCalendarClient
                        data={calendarData}
                        currentUser={currentUser}
                    />
                </ClientOnly>
            );
        }
    }

    // Tenant Mode or explicitly requesting visits view
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
