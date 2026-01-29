import EmptyState from "@/components/EmptyState";
import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getDashboardStats from "@/app/actions/getDashboardStats";
import DashboardClient from "./DashboardClient";

import Link from "next/link";
import prisma from "@/libs/prismadb";
import TenantDashboardClient from "./TenantDashboardClient";
import getApplications from "@/app/actions/getApplications";
import getVisits from "@/app/actions/getVisits";

export const dynamic = 'force-dynamic';

const DashboardPage = async () => {
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

    // TENANT MODE
    if (currentUser.userMode === 'TENANT') {
        const existingScope = await prisma.tenantCandidateScope.findFirst({
            where: {
                OR: [
                    { creatorUserId: currentUser.id },
                    { membersIds: { has: currentUser.id } }
                ]
            }
        });

        const safeScope = existingScope ? {
            ...existingScope,
            createdAt: existingScope.createdAt.toISOString(),
            targetMoveInDate: existingScope.targetMoveInDate ? existingScope.targetMoveInDate.toISOString() : null
        } : null;

        const applications = await getApplications();
        const visits = await getVisits();

        return (
            <ClientOnly>
                <TenantDashboardClient
                    currentUser={currentUser}
                    rentalProject={safeScope}
                    applications={applications}
                    visits={visits}
                />
            </ClientOnly>
        )
    }

    // LANDLORD MODE
    const stats = await getDashboardStats();

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
