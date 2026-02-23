import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { DepositService } from '@/services/DepositService';

type Params = { params: Promise<{ applicationId: string }> };

// GET /api/deposit/[applicationId] — Full deposit data
export async function GET(request: Request, props: Params) {
  try {
    const { applicationId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deposit = await DepositService.getFullDeposit(applicationId);
    if (!deposit) {
      return NextResponse.json({ error: 'No deposit found' }, { status: 404 });
    }

    // Auth: landlord or tenant
    const landlordId = deposit.application.listing.rentalUnit.property.ownerId;
    const tenantId = deposit.application.candidateScope?.creatorUserId;
    if (currentUser.id !== landlordId && currentUser.id !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(deposit);
  } catch (error: unknown) {
    console.error('[Deposit GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/deposit/[applicationId] — Manual confirm payment/refund
export async function PATCH(request: Request, props: Params) {
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
      },
    });

    if (!deposit) {
      return NextResponse.json({ error: 'No deposit found' }, { status: 404 });
    }

    const landlordId = deposit.application.listing.rentalUnit.property.ownerId;
    const tenantId = deposit.application.candidateScope?.creatorUserId;
    if (currentUser.id !== landlordId && currentUser.id !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'confirm_payment') {
      // Only landlord or tenant can confirm
      const updated = await DepositService.transition(deposit.id, 'PAYMENT_CONFIRMED', {
        actorType: currentUser.id === landlordId ? 'landlord' : 'tenant',
        actorId: currentUser.id,
      });
      return NextResponse.json(updated);
    }

    if (action === 'confirm_refund') {
      // Only landlord can confirm refund
      if (currentUser.id !== landlordId) {
        return NextResponse.json({ error: 'Only the landlord can confirm refund' }, { status: 403 });
      }

      const refundedAmountCents = body.refundedAmountCents ?? deposit.amountCents;
      const retainedAmountCents = deposit.amountCents - refundedAmountCents;

      const updated = await DepositService.transition(deposit.id, 'FULL_RELEASE', {
        actorType: 'landlord',
        actorId: currentUser.id,
        metadata: { refundedAmountCents, retainedAmountCents },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[Deposit PATCH] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
