import EmptyState from "@/components/EmptyState";
import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";

import DashboardClient from "./DashboardClient";

import Link from "next/link";
import prisma from "@/libs/prismadb";
import TenantDashboardClient from "./TenantDashboardClient";
import getApplications from "@/app/actions/getApplications";
import getVisits from "@/app/actions/getVisits";
import { getFinancialAnalytics } from "@/app/actions/analytics";
import getOperationalStats from "@/app/actions/getOperationalStats";

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
    const currentYear = new Date().getFullYear();
    const financialData = await getFinancialAnalytics(undefined, currentYear);
    const operationalStats = await getOperationalStats();

    return (
        <ClientOnly>
            <DashboardClient
                currentUser={currentUser}
                financials={financialData}
                operationalStats={operationalStats}
            />
        </ClientOnly>
    );
}

export default DashboardPage;
