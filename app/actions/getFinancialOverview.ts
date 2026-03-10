import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

// ─── Category metadata ──────────────────────────────────────

export const CATEGORY_META: Record<string, { label: string; color: string; icon: string }> = {
    // Matches Prisma ExpenseCategory enum exactly
    COLD_WATER: { label: 'Eau froide', color: '#3b82f6', icon: '💧' },
    HOT_WATER: { label: 'Eau chaude', color: '#ef4444', icon: '🔥' },
    ELECTRICITY_COMMON: { label: 'Électricité (commun)', color: '#f59e0b', icon: '⚡' },
    ELECTRICITY_PRIVATE: { label: 'Électricité (privé)', color: '#ca8a04', icon: '⚡' },
    HEATING_COLLECTIVE: { label: 'Chauffage collectif', color: '#ea580c', icon: '🌡️' },
    TAX_PROPERTY: { label: 'Taxe foncière', color: '#dc2626', icon: '🏛️' },
    ELEVATOR: { label: 'Ascenseur', color: '#8b5cf6', icon: '🛗' },
    INSURANCE: { label: 'Assurance', color: '#06b6d4', icon: '🛡️' },
    MAINTENANCE: { label: 'Entretien / Réparations', color: '#22c55e', icon: '🔧' },
    CARETAKER: { label: 'Gardiennage', color: '#a855f7', icon: '🧹' },
    METERS: { label: 'Compteurs', color: '#64748b', icon: '📊' },
    GENERAL_CHARGES: { label: 'Charges générales', color: '#78716c', icon: '📋' },
    BUILDING_CHARGES: { label: 'Charges copropriété', color: '#4f46e5', icon: '🏢' },
    PARKING: { label: 'Parking', color: '#0ea5e9', icon: '🅿️' },
    INSURANCE_GLI: { label: 'Assurance GLI', color: '#7c3aed', icon: '🛡️' },
    OTHER: { label: 'Autre', color: '#94a3b8', icon: '📦' },
};

// ─── Interfaces ──────────────────────────────────────────────

export interface FinancialOverviewParams {
    month: number;     // 1-12
    year: number;
}

export interface RevenueByProperty {
    propertyId: string;
    propertyTitle: string;
    address: string;
    expectedRent: number;   // cents
    receivedRent: number;   // cents
    status: 'PAID' | 'PENDING' | 'OVERDUE' | 'VACANT';
    tenantName?: string;
    daysOverdue?: number;
    listingId?: string;
}

export interface RentTrackingItem {
    id: string;
    propertyTitle: string;
    tenantName: string;
    amount: number;         // cents
    dueDate: string;        // ISO
    paidDate?: string;      // ISO
    status: 'PAID' | 'PENDING' | 'OVERDUE' | 'LATE';
    daysOverdue?: number;
    conversationId?: string;
    applicationId?: string;
}

export interface ExpenseItem {
    id: string;
    propertyTitle: string;
    propertyId: string;
    category: string;
    description?: string;
    amount: number;         // cents
    date: string;           // ISO
    isRecoverable: boolean;
    recoverableRatio: number;
    isDeductible: boolean;
    frequency: string;
    amountDeductibleCents: number;
}

export interface CategoryBreakdown {
    category: string;
    label: string;
    amount: number;         // cents
    percentage: number;     // 0-100
    color: string;
    icon: string;
}

export interface UpcomingExpense {
    icon: string;
    label: string;
    amount: number;         // cents
    date: string;           // ISO
    frequency: string;
}

export interface MonthlyBreakdown {
    month: number;
    revenue: number;
    expenses: number;
    cashflow: number;
    occupiedUnits: number;
    totalUnits: number;
}

export interface FinancialOverview {
    monthly: {
        expectedRent: number;
        receivedRent: number;
        rentProgress: number;
        paidCount: number;
        totalCount: number;
        overdueCount: number;
        expenses: number;
        cashflow: number;
    };
    revenueByProperty: RevenueByProperty[];
    rentTracking: RentTrackingItem[];
    expenses: ExpenseItem[];
    annual?: {
        monthlyBreakdown: MonthlyBreakdown[];
        totalRevenue: number;
        totalExpenses: number;
        totalCashflow: number;
    };
    categoryBreakdown: CategoryBreakdown[];
    upcomingExpenses: UpcomingExpense[];
    properties: { id: string; title: string; listingId?: string }[];
}

// ─── Main Function ───────────────────────────────────────────

export default async function getFinancialOverview(
    params: FinancialOverviewParams
): Promise<FinancialOverview | null> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return null;

        const { month, year } = params;
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
        const ownerFilter = { ownerId: currentUser.id };

        // ── All queries in parallel ──────────────────────────
        const [
            propertiesWithLeases,
            rentTrackings,
            expensesData,
            propertiesList,
            recurringExpenses,
        ] = await Promise.all([
            // Properties with active leases for this month
            prisma.property.findMany({
                where: ownerFilter,
                select: {
                    id: true,
                    address: true,
                    city: true,
                    rentalUnits: {
                        where: { isActive: true },
                        select: {
                            listings: {
                                orderBy: { createdAt: 'desc' },
                                take: 1,
                                select: {
                                    id: true,
                                    title: true,
                                    applications: {
                                        where: { leaseStatus: 'SIGNED' },
                                        select: {
                                            id: true,
                                            candidateScope: {
                                                select: {
                                                    creatorUser: {
                                                        select: { firstName: true, name: true }
                                                    }
                                                }
                                            },
                                            financials: {
                                                where: {
                                                    startDate: { lte: endOfMonth },
                                                    OR: [
                                                        { endDate: null },
                                                        { endDate: { gte: startOfMonth } }
                                                    ]
                                                },
                                                orderBy: { startDate: 'desc' },
                                                take: 1,
                                                select: {
                                                    baseRentCents: true,
                                                    serviceChargesCents: true,
                                                }
                                            },
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }),

            // Rent payment trackings for the month
            prisma.rentPaymentTracking.findMany({
                where: {
                    rentalApplication: {
                        listing: { rentalUnit: { property: ownerFilter } }
                    },
                    periodMonth: month,
                    periodYear: year,
                },
                select: {
                    id: true,
                    expectedAmountCents: true,
                    expectedDate: true,
                    detectedAmountCents: true,
                    detectedDate: true,
                    status: true,
                    rentalApplication: {
                        select: {
                            id: true,
                            listing: {
                                select: {
                                    title: true,
                                    rentalUnit: {
                                        select: {
                                            property: {
                                                select: { id: true, address: true, city: true }
                                            }
                                        }
                                    }
                                }
                            },
                            candidateScope: {
                                select: {
                                    creatorUser: {
                                        select: { firstName: true, name: true }
                                    }
                                }
                            },
                        }
                    }
                }
            }),

            // Expenses for the month
            prisma.expense.findMany({
                where: {
                    property: ownerFilter,
                    dateOccurred: { gte: startOfMonth, lte: endOfMonth },
                },
                select: {
                    id: true,
                    category: true,
                    label: true,
                    amountTotalCents: true,
                    dateOccurred: true,
                    isRecoverable: true,
                    recoverableRatio: true,
                    amountDeductibleCents: true,
                    frequency: true,
                    property: { select: { id: true } },
                },
                orderBy: { dateOccurred: 'desc' },
            }),

            // All properties (for filter dropdown + titles)
            prisma.property.findMany({
                where: ownerFilter,
                select: {
                    id: true,
                    address: true,
                    city: true,
                    rentalUnits: {
                        where: { isActive: true },
                        select: {
                            listings: {
                                orderBy: { createdAt: 'desc' },
                                take: 1,
                                select: { id: true, title: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'asc' },
            }),

            // Recurring expenses (for "À venir" widget)
            prisma.expense.findMany({
                where: {
                    property: ownerFilter,
                    frequency: { not: 'ONCE' },
                },
                select: {
                    category: true,
                    label: true,
                    amountTotalCents: true,
                    dateOccurred: true,
                    frequency: true,
                },
                orderBy: { dateOccurred: 'desc' },
            }),
        ]);

        // ── Build property title lookup ────────────────────────
        const propertyTitleMap = new Map<string, string>();
        const propertyListingMap = new Map<string, string>();
        propertiesList.forEach(p => {
            const title = p.rentalUnits[0]?.listings[0]?.title || p.address || 'Logement';
            propertyTitleMap.set(p.id, title);
            propertyListingMap.set(p.id, p.rentalUnits[0]?.listings[0]?.id || '');
        });

        // ── Build RevenueByProperty ────────────────────────────
        const revenueByProperty: RevenueByProperty[] = [];
        let totalExpected = 0;
        let totalReceived = 0;
        let paidCount = 0;
        let totalCount = 0;
        let overdueCount = 0;

        propertiesWithLeases.forEach(property => {
            const listing = property.rentalUnits[0]?.listings[0];
            const signedApps = listing?.applications || [];
            const title = listing?.title || property.address || 'Logement';
            const address = [property.address, property.city].filter(Boolean).join(', ');

            if (signedApps.length === 0 || !signedApps[0]?.financials[0]) {
                // Vacant property
                revenueByProperty.push({
                    propertyId: property.id,
                    propertyTitle: title,
                    address,
                    expectedRent: 0,
                    receivedRent: 0,
                    status: 'VACANT',
                    listingId: listing?.id,
                });
                return;
            }

            signedApps.forEach(app => {
                const rent = app.financials[0]?.baseRentCents || 0;
                totalExpected += rent;
                totalCount++;

                // Find matching tracking
                const tracking = rentTrackings.find(
                    t => t.rentalApplication.id === app.id
                );

                let status: RevenueByProperty['status'] = 'PENDING';
                let received = 0;
                let daysOverdue: number | undefined;

                if (tracking) {
                    if (['PAID', 'MANUALLY_CONFIRMED'].includes(tracking.status)) {
                        status = 'PAID';
                        received = tracking.detectedAmountCents || tracking.expectedAmountCents;
                        paidCount++;
                    } else if (['LATE', 'OVERDUE', 'CRITICAL'].includes(tracking.status)) {
                        status = 'OVERDUE';
                        overdueCount++;
                        const now = new Date();
                        daysOverdue = Math.floor(
                            (now.getTime() - new Date(tracking.expectedDate).getTime()) / (1000 * 60 * 60 * 24)
                        );
                    }
                }

                totalReceived += received;

                const creator = app.candidateScope?.creatorUser;
                const first = creator?.firstName || creator?.name?.split(' ')[0];
                const last = creator?.name?.split(' ').slice(1).join(' ');
                const tenantName = first ? (last ? `${first} ${last.charAt(0)}.` : first) : undefined;

                revenueByProperty.push({
                    propertyId: property.id,
                    propertyTitle: title,
                    address,
                    expectedRent: rent,
                    receivedRent: received,
                    status,
                    tenantName,
                    daysOverdue,
                    listingId: listing?.id,
                });
            });
        });

        // ── Build RentTracking ─────────────────────────────────
        const rentTracking: RentTrackingItem[] = rentTrackings.map(t => {
            const creator = t.rentalApplication.candidateScope?.creatorUser;
            const first = creator?.firstName || creator?.name?.split(' ')[0];
            const last = creator?.name?.split(' ').slice(1).join(' ');
            const tenantName = first ? (last ? `${first} ${last.charAt(0)}.` : first) : 'Locataire';

            let status: RentTrackingItem['status'] = 'PENDING';
            if (['PAID', 'MANUALLY_CONFIRMED'].includes(t.status)) status = 'PAID';
            else if (t.status === 'LATE') status = 'LATE';
            else if (['OVERDUE', 'CRITICAL'].includes(t.status)) status = 'OVERDUE';

            let daysOverdue: number | undefined;
            if (['LATE', 'OVERDUE', 'CRITICAL'].includes(t.status)) {
                daysOverdue = Math.floor(
                    (Date.now() - new Date(t.expectedDate).getTime()) / (1000 * 60 * 60 * 24)
                );
            }

            return {
                id: t.id,
                propertyTitle: t.rentalApplication.listing.title,
                tenantName,
                amount: t.expectedAmountCents,
                dueDate: t.expectedDate.toISOString(),
                paidDate: t.detectedDate?.toISOString(),
                status,
                daysOverdue,
                applicationId: t.rentalApplication.id,
            };
        });

        // ── Build Expenses ─────────────────────────────────────
        const totalExpensesCents = expensesData.reduce((sum, e) => sum + e.amountTotalCents, 0);

        const expenses: ExpenseItem[] = expensesData.map(e => ({
            id: e.id,
            propertyTitle: propertyTitleMap.get(e.property.id) || 'Logement',
            propertyId: e.property.id,
            category: e.category,
            description: e.label || undefined,
            amount: e.amountTotalCents,
            date: e.dateOccurred.toISOString(),
            isRecoverable: e.isRecoverable,
            recoverableRatio: e.recoverableRatio,
            isDeductible: (e.amountDeductibleCents || 0) > 0,
            frequency: e.frequency,
            amountDeductibleCents: e.amountDeductibleCents || 0,
        }));

        // ── Category breakdown ───────────────────────────────────
        const categoryTotals = new Map<string, number>();
        expensesData.forEach(e => {
            categoryTotals.set(e.category, (categoryTotals.get(e.category) || 0) + e.amountTotalCents);
        });
        const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryTotals.entries())
            .map(([cat, amount]) => {
                const meta = CATEGORY_META[cat] || CATEGORY_META.OTHER;
                return {
                    category: cat,
                    label: meta.label,
                    amount,
                    percentage: totalExpensesCents > 0 ? Math.round((amount / totalExpensesCents) * 100) : 0,
                    color: meta.color,
                    icon: meta.icon,
                };
            })
            .sort((a, b) => b.amount - a.amount);

        // ── Upcoming expenses (from recurring) ───────────────────
        const getNextOccurrence = (lastDate: Date, freq: string): Date => {
            const y = lastDate.getFullYear();
            const m = lastDate.getMonth();
            const day = lastDate.getDate();
            if (freq === 'MONTHLY') {
                const target = new Date(y, m + 1, 1);
                const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
                return new Date(target.getFullYear(), target.getMonth(), Math.min(day, maxDay));
            } else if (freq === 'QUARTERLY') {
                const target = new Date(y, m + 3, 1);
                const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
                return new Date(target.getFullYear(), target.getMonth(), Math.min(day, maxDay));
            } else if (freq === 'YEARLY') {
                const maxDay = new Date(y + 1, m + 1, 0).getDate();
                return new Date(y + 1, m, Math.min(day, maxDay));
            }
            return new Date(lastDate);
        };

        // Deduplicate recurring by category+label (keep most recent)
        const seen = new Set<string>();
        const upcomingExpenses: UpcomingExpense[] = recurringExpenses
            .filter(e => {
                const key = `${e.category}:${e.label || ''}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .map(e => {
                const meta = CATEGORY_META[e.category] || CATEGORY_META.OTHER;
                const next = getNextOccurrence(e.dateOccurred, e.frequency);
                return {
                    icon: meta.icon,
                    label: e.label || meta.label,
                    amount: e.amountTotalCents,
                    date: next.toISOString(),
                    frequency: e.frequency,
                };
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 10);

        // ── Build properties list ──────────────────────────────
        const properties = propertiesList.map(p => ({
            id: p.id,
            title: propertyTitleMap.get(p.id) || p.address || 'Logement',
            listingId: propertyListingMap.get(p.id) || undefined,
        }));

        // ── Monthly summary ────────────────────────────────────
        const monthly = {
            expectedRent: totalExpected,
            receivedRent: totalReceived,
            rentProgress: totalExpected > 0 ? totalReceived / totalExpected : 0,
            paidCount,
            totalCount,
            overdueCount,
            expenses: totalExpensesCents,
            cashflow: totalReceived - totalExpensesCents,
        };

        return {
            monthly,
            revenueByProperty,
            rentTracking,
            expenses,
            categoryBreakdown,
            upcomingExpenses,
            properties,
        };

    } catch (error: any) {
        console.error("Error fetching financial overview:", error);
        return null;
    }
}

// ─── Annual Data ─────────────────────────────────────────────

export async function getAnnualFinancialData(
    year: number
): Promise<FinancialOverview['annual'] | null> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return null;

        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
        const ownerFilter = { ownerId: currentUser.id };

        const [rentTrackings, expensesData, totalUnits] = await Promise.all([
            prisma.rentPaymentTracking.findMany({
                where: {
                    rentalApplication: {
                        listing: { rentalUnit: { property: ownerFilter } }
                    },
                    periodYear: year,
                },
                select: {
                    periodMonth: true,
                    expectedAmountCents: true,
                    detectedAmountCents: true,
                    status: true,
                }
            }),

            prisma.expense.findMany({
                where: {
                    property: ownerFilter,
                    dateOccurred: { gte: startOfYear, lte: endOfYear },
                },
                select: {
                    amountTotalCents: true,
                    dateOccurred: true,
                }
            }),

            prisma.rentalUnit.count({
                where: { property: ownerFilter, isActive: true }
            }),
        ]);

        const monthlyBreakdown: MonthlyBreakdown[] = [];
        let totalRevenue = 0;
        let totalExpenses = 0;

        for (let m = 1; m <= 12; m++) {
            const monthTrackings = rentTrackings.filter(t => t.periodMonth === m);
            const monthExpenses = expensesData.filter(e => {
                const d = new Date(e.dateOccurred);
                return d.getMonth() + 1 === m;
            });

            const revenue = monthTrackings
                .filter(t => ['PAID', 'MANUALLY_CONFIRMED'].includes(t.status))
                .reduce((sum, t) => sum + (t.detectedAmountCents || t.expectedAmountCents), 0);

            const expenses = monthExpenses.reduce((sum, e) => sum + e.amountTotalCents, 0);
            const occupiedUnits = monthTrackings.length;

            totalRevenue += revenue;
            totalExpenses += expenses;

            monthlyBreakdown.push({
                month: m,
                revenue,
                expenses,
                cashflow: revenue - expenses,
                occupiedUnits,
                totalUnits,
            });
        }

        return {
            monthlyBreakdown,
            totalRevenue,
            totalExpenses,
            totalCashflow: totalRevenue - totalExpenses,
        };

    } catch (error: any) {
        console.error("Error fetching annual financial data:", error);
        return null;
    }
}
