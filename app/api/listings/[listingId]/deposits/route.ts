import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';

type Params = { params: Promise<{ listingId: string }> };

// GET /api/listings/[listingId]/deposits — Deposits for a listing's active applications
export async function GET(request: Request, props: Params) {
  try {
    const { listingId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { rentalUnit: { select: { property: { select: { ownerId: true } } } } },
    });

    if (!listing || listing.rentalUnit.property.ownerId !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find all SecurityDeposits for applications on this listing
    const deposits = await prisma.securityDeposit.findMany({
      where: {
        application: { listingId },
      },
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = deposits.map((d) => ({
      applicationId: d.applicationId,
      amountCents: d.amountCents,
      status: d.status,
      isOverdue: d.isOverdue,
      overdueMonths: d.overdueMonths,
      penaltyAmountCents: d.penaltyAmountCents,
      legalDeadline: d.legalDeadline?.toISOString() ?? null,
      events: d.events
        .reverse() // chronological order (oldest first)
        .map((e) => ({
          createdAt: e.createdAt.toISOString(),
          type: e.type,
          description: e.description,
        })),
    }));

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[ListingDeposits GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
