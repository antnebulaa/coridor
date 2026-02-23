import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';

type Params = { params: Promise<{ applicationId: string }> };

// GET /api/deposit/[applicationId]/timeline — Chronological deposit events
export async function GET(request: Request, props: Params) {
  try {
    const { applicationId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deposit = await prisma.securityDeposit.findUnique({
      where: { applicationId },
      include: {
        application: {
          include: {
            listing: {
              select: {
                rentalUnit: {
                  include: { property: { select: { ownerId: true } } },
                },
              },
            },
            candidateScope: { select: { creatorUserId: true } },
          },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!deposit) {
      return NextResponse.json({ error: 'No deposit found' }, { status: 404 });
    }

    // Auth: landlord or tenant
    const landlordId = deposit.application.listing.rentalUnit.property.ownerId;
    const tenantId = deposit.application.candidateScope?.creatorUserId;
    if (currentUser.id !== landlordId && currentUser.id !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(deposit.events);
  } catch (error: unknown) {
    console.error('[DepositTimeline GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
