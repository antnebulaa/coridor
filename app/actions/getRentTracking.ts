'use server';

import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

// ── Types ──────────────────────────────────────────────────

export interface RentTrackingTenant {
  id: string;
  name: string;
  expected: number;       // in cents
  received: number;       // in cents
  remaining: number;      // expected - received
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
  daysLate: number | null;
  paidDate: string | null;
  rentTrackingId: string;
  conversationId: string | null;
}

export interface RentTrackingProperty {
  id: string;
  name: string;
  address: string;
  isColocation: boolean;
  totalExpected: number;
  totalReceived: number;
  dueDay: number;
  tenants: RentTrackingTenant[];
}

export interface RentTrackingSummary {
  totalExpected: number;
  totalReceived: number;
  paidCount: number;
  partialCount: number;
  overdueCount: number;
  pendingCount: number;
  totalCount: number;
}

export interface RentTrackingResult {
  summary: RentTrackingSummary;
  properties: RentTrackingProperty[];
  hasPowensConnection: boolean;
}

// ── Status mapping ─────────────────────────────────────────

type SimplifiedStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';

const STATUS_SORT_ORDER: Record<SimplifiedStatus, number> = {
  OVERDUE: 0,
  PARTIAL: 1,
  PENDING: 2,
  PAID: 3,
};

function mapStatus(
  dbStatus: string,
  expectedDate: Date,
  isPartialPayment: boolean,
  detectedAmountCents: number | null,
  expectedAmountCents: number,
): SimplifiedStatus {
  // Fully paid statuses
  if (dbStatus === 'PAID' || dbStatus === 'MANUALLY_CONFIRMED') {
    // Even if marked PAID, check if it was partial
    if (isPartialPayment && detectedAmountCents !== null && detectedAmountCents < expectedAmountCents) {
      return 'PARTIAL';
    }
    return 'PAID';
  }

  // Explicitly partial
  if (isPartialPayment && detectedAmountCents !== null && detectedAmountCents > 0) {
    return 'PARTIAL';
  }

  // Overdue statuses
  if (dbStatus === 'OVERDUE' || dbStatus === 'LATE' || dbStatus === 'CRITICAL') {
    return 'OVERDUE';
  }

  // Reminder sent — check if past due date
  if (dbStatus === 'REMINDER_SENT') {
    return new Date() > expectedDate ? 'OVERDUE' : 'PENDING';
  }

  // PENDING — check if past due date
  if (new Date() > expectedDate) {
    return 'OVERDUE';
  }

  return 'PENDING';
}

function calculateDaysLate(expectedDate: Date, status: SimplifiedStatus): number | null {
  if (status !== 'OVERDUE' && status !== 'PARTIAL') return null;
  const now = new Date();
  const diffMs = now.getTime() - expectedDate.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return days > 0 ? days : null;
}

// ── Main server action ─────────────────────────────────────

export default async function getRentTracking(
  month: number,
  year: number,
): Promise<RentTrackingResult | null> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  // ── Parallel queries ───────────────────────────────────
  const [trackings, bankConnectionCount] = await Promise.all([
    // 1. Get all rent trackings for this month/year for the owner's leases
    prisma.rentPaymentTracking.findMany({
      where: {
        periodMonth: month,
        periodYear: year,
        rentalApplication: {
          leaseStatus: 'SIGNED',
          listing: {
            rentalUnit: {
              property: {
                ownerId: currentUser.id,
              },
            },
          },
        },
      },
      select: {
        id: true,
        expectedAmountCents: true,
        detectedAmountCents: true,
        expectedDate: true,
        detectedDate: true,
        status: true,
        isPartialPayment: true,
        rentalApplication: {
          select: {
            id: true,
            leaseStartDate: true,
            candidateScope: {
              select: {
                creatorUserId: true,
                creatorUser: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    name: true,
                  },
                },
              },
            },
            listing: {
              select: {
                id: true,
                title: true,
                rentalUnit: {
                  select: {
                    propertyId: true,
                    property: {
                      select: {
                        id: true,
                        address: true,
                        city: true,
                        zipCode: true,
                      },
                    },
                  },
                },
                conversations: {
                  select: {
                    id: true,
                    users: {
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),

    // 2. Check if user has active Powens connection
    prisma.bankConnection.count({
      where: {
        userId: currentUser.id,
        isActive: true,
      },
    }),
  ]);

  // ── Group by property ──────────────────────────────────
  const propertyMap = new Map<string, RentTrackingProperty>();

  for (const tracking of trackings) {
    const app = tracking.rentalApplication;
    const property = app.listing.rentalUnit.property;
    const propertyId = property.id;
    const tenant = app.candidateScope.creatorUser;

    // Build tenant name
    const tenantName = tenant.firstName && tenant.lastName
      ? `${tenant.firstName} ${tenant.lastName.charAt(0)}.`
      : tenant.name || 'Locataire';

    // Determine status
    const status = mapStatus(
      tracking.status,
      tracking.expectedDate,
      tracking.isPartialPayment,
      tracking.detectedAmountCents,
      tracking.expectedAmountCents,
    );

    const received = tracking.detectedAmountCents ?? 0;
    const remaining = Math.max(0, tracking.expectedAmountCents - received);

    // Find conversation between owner and tenant (exactly 2 participants)
    const tenantUserId = app.candidateScope.creatorUserId;
    const conversation = app.listing.conversations.find(conv =>
      conv.users.length === 2 &&
      conv.users.some(u => u.id === tenantUserId) &&
      conv.users.some(u => u.id === currentUser.id)
    );

    // Extract due day from expectedDate
    const dueDay = tracking.expectedDate.getDate();

    const tenantData: RentTrackingTenant = {
      id: app.id,
      name: tenantName,
      expected: tracking.expectedAmountCents,
      received,
      remaining,
      status,
      daysLate: calculateDaysLate(tracking.expectedDate, status),
      paidDate: tracking.detectedDate?.toISOString() ?? null,
      rentTrackingId: tracking.id,
      conversationId: conversation?.id ?? null,
    };

    if (propertyMap.has(propertyId)) {
      const prop = propertyMap.get(propertyId)!;
      prop.tenants.push(tenantData);
      prop.totalExpected += tracking.expectedAmountCents;
      prop.totalReceived += received;
      // Update dueDay to the earliest
      if (dueDay < prop.dueDay) {
        prop.dueDay = dueDay;
      }
    } else {
      const address = [property.address, property.zipCode, property.city]
        .filter(Boolean)
        .join(', ');

      propertyMap.set(propertyId, {
        id: propertyId,
        name: app.listing.title,
        address: address || '',
        isColocation: false, // will be set after grouping
        totalExpected: tracking.expectedAmountCents,
        totalReceived: received,
        dueDay,
        tenants: [tenantData],
      });
    }
  }

  // ── Finalize properties ────────────────────────────────
  const properties = Array.from(propertyMap.values());

  for (const prop of properties) {
    // Mark as colocation if multiple tenants
    prop.isColocation = prop.tenants.length > 1;

    // Sort tenants by urgency: OVERDUE → PARTIAL → PENDING → PAID
    prop.tenants.sort((a, b) =>
      STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status]
    );
  }

  // Sort properties by dueDay ascending
  properties.sort((a, b) => a.dueDay - b.dueDay);

  // ── Build summary ──────────────────────────────────────
  const summary: RentTrackingSummary = {
    totalExpected: 0,
    totalReceived: 0,
    paidCount: 0,
    partialCount: 0,
    overdueCount: 0,
    pendingCount: 0,
    totalCount: 0,
  };

  for (const prop of properties) {
    for (const tenant of prop.tenants) {
      summary.totalExpected += tenant.expected;
      summary.totalReceived += tenant.received;
      summary.totalCount += 1;

      switch (tenant.status) {
        case 'PAID':
          summary.paidCount += 1;
          break;
        case 'PARTIAL':
          summary.partialCount += 1;
          break;
        case 'OVERDUE':
          summary.overdueCount += 1;
          break;
        case 'PENDING':
          summary.pendingCount += 1;
          break;
      }
    }
  }

  return {
    summary,
    properties,
    hasPowensConnection: bankConnectionCount > 0,
  };
}
