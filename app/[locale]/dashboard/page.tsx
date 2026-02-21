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

    // Fetch EDL (inspection) stats for the landlord
    let edlStats: { id: string; status: string; type: string; propertyTitle: string; tenantName: string | null; updatedAt: string; totalRooms: number; completedRooms: number }[] = [];
    try {
        const inspections = await prisma.inspection.findMany({
            where: {
                application: {
                    listing: {
                        rentalUnit: {
                            property: { ownerId: currentUser.id }
                        }
                    }
                },
                status: { in: ['DRAFT', 'PENDING_SIGNATURE'] }
            },
            select: {
                id: true,
                status: true,
                type: true,
                updatedAt: true,
                tenant: { select: { name: true } },
                rooms: { select: { isCompleted: true } },
                application: {
                    select: {
                        listing: {
                            select: {
                                title: true,
                            }
                        }
                    }
                }
            },
            orderBy: { updatedAt: 'desc' },
            take: 5,
        });

        edlStats = inspections.map((i) => ({
            id: i.id,
            status: i.status,
            type: i.type,
            propertyTitle: i.application.listing.title || 'Logement',
            tenantName: i.tenant?.name || null,
            updatedAt: i.updatedAt.toISOString(),
            totalRooms: i.rooms.length,
            completedRooms: i.rooms.filter((r: { isCompleted: boolean }) => r.isCompleted).length,
        }));
    } catch (error) {
        console.error("Error fetching EDL stats:", error);
    }

    return (
        <ClientOnly>
            <DashboardClient
                currentUser={currentUser}
                financials={financialData}
                operationalStats={operationalStats}
                selectionStats={selectionStats}
                edlStats={edlStats}
            />
        </ClientOnly>
    );
}

export default DashboardPage;
