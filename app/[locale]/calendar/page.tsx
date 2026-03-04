import { redirect } from "next/navigation";
import VisitsClient from "./VisitsClient";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getVisits from "@/app/actions/getVisits";
import EmptyState from "@/components/EmptyState";
import LandlordCalendarClient from "../components/calendar/LandlordCalendarClient";
import getLandlordCalendarData from "@/app/actions/getLandlordCalendarData";

const CalendarPage = async ({ searchParams }: { searchParams: Promise<{ view?: string }> }) => {
    const currentUser = await getCurrentUser();
    const resolvedParams = await searchParams;

    if (!currentUser) {
        redirect('/');
    }

    // Landlord Mode: Show Calendar by default
    if (currentUser.userMode === 'LANDLORD') {
        const calendarData = await getLandlordCalendarData();
        if (calendarData) {
            return (
                <LandlordCalendarClient
                    data={calendarData}
                    currentUser={currentUser}
                />
            );
        }
    }

    // Tenant Mode or explicitly requesting visits view
    const view = resolvedParams?.view || 'visits';

    if (view === 'visits') {
        const visits = await getVisits();
        return (
            <VisitsClient
                currentUser={currentUser}
                visits={visits}
            />
        );
    }

    return (
        <EmptyState
            title="Calendar View"
            subtitle="Not implemented yet."
        />
    )
}

export default CalendarPage;
