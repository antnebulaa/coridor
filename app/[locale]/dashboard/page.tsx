import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";

import DashboardClient from "./DashboardClient";

import ClientOnly from "@/components/ClientOnly";
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
        redirect('/');
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

    // Fetch selection stats: listings with evaluated candidates
    let selectionStats: { listingId: string; listingTitle: string; evaluated: number; shortlisted: number }[] = [];
    try {
        const listingsWithEvals = await prisma.listing.findMany({
            where: {
                rentalUnit: {
                    property: {
                        ownerId: currentUser.id
                    }
                },
                applications: {
                    some: {
                        evaluation: { isNot: null }
                    }
                }
            },
            select: {
                id: true,
                title: true,
                applications: {
                    where: {
                        evaluation: { isNot: null }
                    },
                    select: {
                        evaluation: {
                            select: {
                                decision: true
                            }
                        }
                    }
                }
            }
        });

        selectionStats = listingsWithEvals.map((l) => ({
            listingId: l.id,
            listingTitle: l.title,
            evaluated: l.applications.length,
            shortlisted: l.applications.filter(
                (a) => a.evaluation?.decision === 'SHORTLISTED'
            ).length,
        }));
    } catch (error) {
        console.error("Error fetching selection stats:", error);
    }

    return (
        <ClientOnly>
            <DashboardClient
                currentUser={currentUser}
                financials={financialData}
                operationalStats={operationalStats}
                selectionStats={selectionStats}
            />
        </ClientOnly>
    );
}

export default DashboardPage;
