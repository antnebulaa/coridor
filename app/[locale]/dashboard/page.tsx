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

    // LANDLORD MODE — run all queries in parallel
    const currentYear = new Date().getFullYear();

    const [financialData, operationalStats, selectionStatsRaw, edlStatsRaw] = await Promise.all([
        getFinancialAnalytics(undefined, currentYear),
        getOperationalStats(),
        prisma.listing.findMany({
            where: {
                rentalUnit: { property: { ownerId: currentUser.id } },
                applications: { some: { evaluation: { isNot: null } } }
            },
            select: {
                id: true,
                title: true,
                applications: {
                    where: { evaluation: { isNot: null } },
                    select: { evaluation: { select: { decision: true } } }
                }
            }
        }).catch(() => []),
        prisma.inspection.findMany({
            where: {
                application: { listing: { rentalUnit: { property: { ownerId: currentUser.id } } } },
                status: { in: ['DRAFT', 'PENDING_SIGNATURE'] }
            },
            select: {
                id: true, status: true, type: true, updatedAt: true,
                tenant: { select: { name: true } },
                rooms: { select: { isCompleted: true } },
                application: { select: { listing: { select: { title: true } } } }
            },
            orderBy: { updatedAt: 'desc' },
            take: 5,
        }).catch(() => []),
    ]);

    const selectionStats = selectionStatsRaw.map((l) => ({
        listingId: l.id,
        listingTitle: l.title,
        evaluated: l.applications.length,
        shortlisted: l.applications.filter(
            (a) => a.evaluation?.decision === 'SHORTLISTED'
        ).length,
    }));

    const edlStats = edlStatsRaw.map((i) => ({
        id: i.id,
        status: i.status,
        type: i.type,
        propertyTitle: i.application.listing.title || 'Logement',
        tenantName: i.tenant?.name || null,
        updatedAt: i.updatedAt.toISOString(),
        totalRooms: i.rooms.length,
        completedRooms: i.rooms.filter((r: { isCompleted: boolean }) => r.isCompleted).length,
    }));

    return (
        <DashboardClient
            currentUser={currentUser}
            financials={financialData}
            operationalStats={operationalStats}
            selectionStats={selectionStats}
            edlStats={edlStats}
        />
    );
}

export default DashboardPage;
