import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

// ─── Interfaces ──────────────────────────────────────────────

export interface MonthlyKPIs {
    expectedRent: number;       // cents
    receivedRent: number;       // cents
    rentProgress: number;       // 0-1
    paidCount: number;
    totalCount: number;
    monthlyExpenses: number;    // cents
    monthlyCashflow: number;    // cents
}

export interface PropertyStatusItem {
    id: string;
    listingId: string;
    title: string;
    address: string;
    imageUrl?: string;
    status: 'OCCUPIED' | 'VACANT' | 'PENDING_LEASE';
    tenantName?: string;
    rentStatus: 'PAID' | 'PENDING' | 'OVERDUE' | 'NO_LEASE';
    rentAmountCents?: number;
    nextAction?: string;
    nextActionHref?: string;
}

export interface ActionItem {
    id: string;
    type: 'OVERDUE_RENT' | 'LEGAL_REMINDER' | 'DEPOSIT_DEADLINE' | 'PENDING_APPLICATION' | 'PENDING_EDL' | 'UNSIGNED_LEASE' | 'UPCOMING_VISIT';
    priority: 'URGENT' | 'ACTION' | 'INFO';
    title: string;
    subtitle: string;
    href: string;
    propertyName?: string;
    daysLeft?: number;
    // EDL-specific for resend link
    edlId?: string;
    edlStatus?: string;
}

export interface OperationalStats {
    occupancyRate: number;
    totalUnits: number;
    occupiedUnits: number;
    pendingApplications: number;
    upcomingVisits: number;
    unpaidRents: number;
    monthlyKPIs: MonthlyKPIs;
    propertyStatuses: PropertyStatusItem[];
    actionItems: ActionItem[];
}

// ─── Main Function ───────────────────────────────────────────

export default async function getOperationalStats(): Promise<OperationalStats | null> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return null;

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const firstOfMonth = new Date(currentYear, now.getMonth(), 1);
        const ownerFilter = { property: { ownerId: currentUser.id } };

        // ── All queries in parallel ──────────────────────────

        const [
            totalUnits,
            occupiedUnits,
            pendingApplications,
            upcomingVisits,
            propertiesData,
            urgentReminders,
            upcomingReminders,
            overdueDeposits,
            pendingEdls,
            monthlyExpensesResult,
        ] = await Promise.all([
            // 1. Total rental units
            prisma.rentalUnit.count({ where: ownerFilter }),

            // 2. Occupied units (signed lease)
            prisma.rentalUnit.count({
                where: {
                    ...ownerFilter,
                    listings: { some: { applications: { some: { leaseStatus: 'SIGNED' } } } }
                }
            }),

            // 3. Pending applications
            prisma.rentalApplication.count({
                where: {
                    listing: { rentalUnit: ownerFilter },
                    status: { in: ['SENT', 'PENDING', 'VISIT_PROPOSED'] }
                }
            }),

            // 4. Upcoming visits (next 7 days)
            prisma.visit.count({
                where: {
                    listing: { rentalUnit: ownerFilter },
                    date: { gte: now, lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
                    status: 'CONFIRMED'
                }
            }),

            // 5. Properties with nested lease/rent data
            prisma.property.findMany({
                where: { ownerId: currentUser.id },
                select: {
                    id: true,
                    address: true,
                    city: true,
                    images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
                    rentalUnits: {
                        where: { isActive: true },
                        select: {
                            images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
                            listings: {
                                orderBy: { createdAt: 'desc' },
                                select: {
                                    id: true,
                                    title: true,
                                    applications: {
                                        where: {
                                            OR: [
                                                { leaseStatus: { in: ['SIGNED', 'PENDING_SIGNATURE'] } },
                                                { status: { in: ['SENT', 'PENDING', 'VISIT_PROPOSED'] } }
                                            ]
                                        },
                                        select: {
                                            id: true,
                                            leaseStatus: true,
                                            status: true,
                                            candidateScope: {
                                                select: {
                                                    creatorUser: { select: { firstName: true, name: true } }
                                                }
                                            },
                                            financials: {
                                                orderBy: { startDate: 'desc' },
                                                take: 1,
                                                select: { baseRentCents: true }
                                            },
                                            rentPaymentTrackings: {
                                                where: { periodMonth: currentMonth, periodYear: currentYear },
                                                take: 1,
                                                select: { status: true, expectedAmountCents: true }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }),

            // 6. Urgent legal reminders (overdue)
            prisma.legalReminder.findMany({
                where: { userId: currentUser.id, status: 'OVERDUE' },
                select: { id: true, title: true, dueDate: true, actionUrl: true },
                orderBy: { dueDate: 'asc' },
                take: 10
            }).catch(() => [] as { id: string; title: string; dueDate: Date; actionUrl: string | null }[]),

            // 7. Upcoming reminders (next 30 days)
            prisma.legalReminder.findMany({
                where: {
                    userId: currentUser.id,
                    status: { in: ['PENDING', 'UPCOMING'] },
                    dueDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), gte: now }
                },
                select: { id: true, title: true, dueDate: true, actionUrl: true },
                orderBy: { dueDate: 'asc' },
                take: 10
            }).catch(() => [] as { id: string; title: string; dueDate: Date; actionUrl: string | null }[]),

            // 8. Overdue deposits
            prisma.securityDeposit.findMany({
                where: {
                    application: { listing: { rentalUnit: ownerFilter } },
                    isOverdue: true
                },
                select: {
                    id: true,
                    applicationId: true,
                    application: { select: { listing: { select: { title: true } } } }
                },
                take: 5
            }).catch(() => [] as { id: string; applicationId: string; application: { listing: { title: string } } }[]),

            // 9. Pending EDLs
            prisma.inspection.findMany({
                where: {
                    application: { listing: { rentalUnit: ownerFilter } },
                    status: { in: ['DRAFT', 'PENDING_SIGNATURE'] }
                },
                select: {
                    id: true, status: true, type: true,
                    tenant: { select: { name: true } },
                    rooms: { select: { isCompleted: true } },
                    application: { select: { listing: { select: { title: true } } } }
                },
                orderBy: { updatedAt: 'desc' },
                take: 5
            }).catch(() => [] as any[]),

            // 10. Monthly expenses aggregate
            prisma.expense.aggregate({
                where: {
                    property: { ownerId: currentUser.id },
                    dateOccurred: { gte: firstOfMonth }
                },
                _sum: { amountTotalCents: true }
            }).catch(() => ({ _sum: { amountTotalCents: null } })),
        ]);

        // ── Build PropertyStatusItems ────────────────────────

        const propertyStatuses: PropertyStatusItem[] = propertiesData.map(property => {
            const allApps = property.rentalUnits
                .flatMap(u => u.listings.flatMap(l => l.applications));

            const signedApp = allApps.find(a => a.leaseStatus === 'SIGNED');
            const pendingSigApp = allApps.find(a => a.leaseStatus === 'PENDING_SIGNATURE');

            const firstListing = property.rentalUnits[0]?.listings[0];

            let status: PropertyStatusItem['status'] = 'VACANT';
            let tenantName: string | undefined;
            let rentStatus: PropertyStatusItem['rentStatus'] = 'NO_LEASE';
            let rentAmountCents: number | undefined;

            if (signedApp) {
                status = 'OCCUPIED';
                const creator = signedApp.candidateScope?.creatorUser;
                const first = creator?.firstName || creator?.name?.split(' ')[0];
                const last = creator?.name?.split(' ').slice(1).join(' ');
                tenantName = first ? (last ? `${first} ${last.charAt(0)}.` : first) : undefined;

                rentAmountCents = signedApp.financials[0]?.baseRentCents;
                const tracking = signedApp.rentPaymentTrackings[0];
                if (tracking) {
                    if (['PAID', 'MANUALLY_CONFIRMED'].includes(tracking.status)) {
                        rentStatus = 'PAID';
                    } else if (['LATE', 'OVERDUE', 'CRITICAL'].includes(tracking.status)) {
                        rentStatus = 'OVERDUE';
                    } else {
                        rentStatus = 'PENDING';
                    }
                } else {
                    // No tracking record exists yet — don't assume pending
                    rentStatus = 'NO_LEASE';
                }
            } else if (pendingSigApp) {
                status = 'PENDING_LEASE';
            }

            // Pending applications count
            const pendingApps = allApps.filter(a =>
                ['SENT', 'PENDING', 'VISIT_PROPOSED'].includes(a.status) &&
                !['SIGNED', 'PENDING_SIGNATURE'].includes(a.leaseStatus)
            ).length;

            let nextAction: string | undefined;
            let nextActionHref: string | undefined;

            if (rentStatus === 'OVERDUE') {
                nextAction = 'Loyer en retard';
                nextActionHref = '/rentals';
            } else if (pendingApps > 0) {
                nextAction = `${pendingApps} candidature${pendingApps > 1 ? 's' : ''}`;
                nextActionHref = '/dashboard/applications';
            } else if (status === 'PENDING_LEASE') {
                nextAction = 'Bail en signature';
            }

            const imageUrl = property.images[0]?.url
                || property.rentalUnits.find(u => u.images[0])?.images[0]?.url;

            return {
                id: property.id,
                listingId: firstListing?.id || '',
                title: firstListing?.title || property.address || 'Logement',
                address: [property.address, property.city].filter(Boolean).join(', '),
                imageUrl,
                status,
                tenantName,
                rentStatus,
                rentAmountCents,
                nextAction,
                nextActionHref,
            };
        });

        // ── Build MonthlyKPIs ────────────────────────────────

        let expectedRent = 0;
        let receivedRent = 0;
        let paidCount = 0;
        let totalLeases = 0;

        propertiesData.forEach(property => {
            property.rentalUnits.forEach(unit => {
                unit.listings.forEach(listing => {
                    listing.applications
                        .filter(a => a.leaseStatus === 'SIGNED')
                        .forEach(app => {
                            totalLeases++;
                            const rent = app.financials[0]?.baseRentCents || 0;
                            expectedRent += rent;
                            const tracking = app.rentPaymentTrackings[0];
                            if (tracking && ['PAID', 'MANUALLY_CONFIRMED'].includes(tracking.status)) {
                                paidCount++;
                                receivedRent += tracking.expectedAmountCents || rent;
                            }
                        });
                });
            });
        });

        const monthlyExpensesCents = monthlyExpensesResult._sum?.amountTotalCents || 0;

        const monthlyKPIs: MonthlyKPIs = {
            expectedRent,
            receivedRent,
            rentProgress: expectedRent > 0 ? receivedRent / expectedRent : 0,
            paidCount,
            totalCount: totalLeases,
            monthlyExpenses: monthlyExpensesCents,
            monthlyCashflow: receivedRent - monthlyExpensesCents,
        };

        // ── Build ActionItems ────────────────────────────────

        const actionItems: ActionItem[] = [];

        // Overdue rents
        propertyStatuses.forEach(ps => {
            if (ps.rentStatus === 'OVERDUE') {
                actionItems.push({
                    id: `rent-${ps.id}`,
                    type: 'OVERDUE_RENT',
                    priority: 'URGENT',
                    title: 'Loyer en retard',
                    subtitle: ps.tenantName ? `${ps.title} · ${ps.tenantName}` : ps.title,
                    href: '/rentals',
                    propertyName: ps.title,
                });
            }
        });

        // Urgent legal reminders (overdue)
        urgentReminders.forEach(r => {
            actionItems.push({
                id: `reminder-${r.id}`,
                type: 'LEGAL_REMINDER',
                priority: 'URGENT',
                title: r.title,
                subtitle: 'Échéance dépassée',
                href: r.actionUrl || '/account/reminders',
                daysLeft: Math.floor((r.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            });
        });

        // Upcoming reminders (next 30 days)
        upcomingReminders.forEach(r => {
            const daysLeft = Math.ceil((r.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            actionItems.push({
                id: `reminder-upcoming-${r.id}`,
                type: 'LEGAL_REMINDER',
                priority: daysLeft <= 7 ? 'ACTION' : 'INFO',
                title: r.title,
                subtitle: `Dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
                href: r.actionUrl || '/account/reminders',
                daysLeft,
            });
        });

        // Overdue deposits
        overdueDeposits.forEach(d => {
            actionItems.push({
                id: `deposit-${d.id}`,
                type: 'DEPOSIT_DEADLINE',
                priority: 'URGENT',
                title: 'Dépôt de garantie en retard',
                subtitle: d.application.listing.title,
                href: `/deposit/${d.applicationId}`,
                propertyName: d.application.listing.title,
            });
        });

        // Pending EDLs
        pendingEdls.forEach((edl: any) => {
            const totalRooms = edl.rooms?.length || 0;
            const completedRooms = edl.rooms?.filter((r: any) => r.isCompleted).length || 0;
            const isDraft = edl.status === 'DRAFT';
            actionItems.push({
                id: `edl-${edl.id}`,
                type: 'PENDING_EDL',
                priority: 'ACTION',
                title: isDraft ? 'Reprendre EDL en cours' : 'EDL en attente de signature',
                subtitle: `${edl.application?.listing?.title || 'Logement'}${isDraft && totalRooms > 0 ? ` · ${completedRooms}/${totalRooms} pièces` : ''}`,
                href: `/inspection/${edl.id}`,
                propertyName: edl.application?.listing?.title,
                edlId: edl.id,
                edlStatus: edl.status,
            });
        });

        // Pending applications (grouped by listing)
        const listingApps = new Map<string, { title: string; count: number }>();
        propertiesData.forEach(property => {
            property.rentalUnits.forEach(unit => {
                unit.listings.forEach(listing => {
                    const pending = listing.applications.filter(a =>
                        ['SENT', 'PENDING', 'VISIT_PROPOSED'].includes(a.status) &&
                        !['SIGNED', 'PENDING_SIGNATURE'].includes(a.leaseStatus)
                    );
                    if (pending.length > 0) {
                        const existing = listingApps.get(listing.id);
                        listingApps.set(listing.id, {
                            title: listing.title,
                            count: (existing?.count || 0) + pending.length
                        });
                    }
                });
            });
        });
        listingApps.forEach((data, listingId) => {
            actionItems.push({
                id: `app-${listingId}`,
                type: 'PENDING_APPLICATION',
                priority: 'ACTION',
                title: `${data.count} candidature${data.count > 1 ? 's' : ''} à examiner`,
                subtitle: data.title,
                href: '/dashboard/applications',
                propertyName: data.title,
            });
        });

        // Unsigned leases
        propertiesData.forEach(property => {
            property.rentalUnits.forEach(unit => {
                unit.listings.forEach(listing => {
                    listing.applications
                        .filter(a => a.leaseStatus === 'PENDING_SIGNATURE')
                        .forEach(app => {
                            actionItems.push({
                                id: `lease-${app.id}`,
                                type: 'UNSIGNED_LEASE',
                                priority: 'ACTION',
                                title: 'Bail en attente de signature',
                                subtitle: listing.title,
                                href: `/leases/${app.id}`,
                                propertyName: listing.title,
                            });
                        });
                });
            });
        });

        // Upcoming visits (summary)
        if (upcomingVisits > 0) {
            actionItems.push({
                id: 'visits-upcoming',
                type: 'UPCOMING_VISIT',
                priority: 'INFO',
                title: `${upcomingVisits} visite${upcomingVisits > 1 ? 's' : ''} à venir`,
                subtitle: 'Cette semaine',
                href: '/calendar',
            });
        }

        // Sort: URGENT > ACTION > INFO, then by daysLeft
        const priorityOrder: Record<string, number> = { URGENT: 0, ACTION: 1, INFO: 2 };
        actionItems.sort((a, b) => {
            const pa = priorityOrder[a.priority] ?? 2;
            const pb = priorityOrder[b.priority] ?? 2;
            if (pa !== pb) return pa - pb;
            return (a.daysLeft ?? 999) - (b.daysLeft ?? 999);
        });

        // ── Return ───────────────────────────────────────────

        const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
        const unpaidRents = propertyStatuses.filter(ps => ps.rentStatus === 'OVERDUE').length;

        return {
            occupancyRate,
            totalUnits,
            occupiedUnits,
            pendingApplications,
            upcomingVisits,
            unpaidRents,
            monthlyKPIs,
            propertyStatuses,
            actionItems,
        };

    } catch (error: any) {
        console.error("Error fetching operational stats", error);
        return null;
    }
}
