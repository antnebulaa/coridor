import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";

import DashboardClient from "./DashboardClient";

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
        redirect('/');
    }

    // TENANT MODE
    if (currentUser.userMode === 'TENANT') {
        const [existingScope, applications, visits] = await Promise.all([
            prisma.tenantCandidateScope.findFirst({
                where: {
                    OR: [
                        { creatorUserId: currentUser.id },
                        { membersIds: { has: currentUser.id } }
                    ]
                }
            }),
            getApplications(),
            getVisits(),
        ]);

        const safeScope = existingScope ? {
            ...existingScope,
            createdAt: existingScope.createdAt.toISOString(),
            targetMoveInDate: existingScope.targetMoveInDate ? existingScope.targetMoveInDate.toISOString() : null
        } : null;

        return (
            <TenantDashboardClient
                currentUser={currentUser}
                rentalProject={safeScope}
                applications={applications}
                visits={visits}
            />
        )
    }

    // LANDLORD MODE — run queries in parallel
    const currentYear = new Date().getFullYear();

    const [financialData, operationalStats] = await Promise.all([
        getFinancialAnalytics(undefined, currentYear).catch(() => null),
        getOperationalStats(),
    ]);

    return (
        <DashboardClient
            currentUser={currentUser}
            financials={financialData}
            operationalStats={operationalStats}
        />
    );
}

export default DashboardPage;
