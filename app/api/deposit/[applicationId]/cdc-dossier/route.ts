import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { CDCDossierService } from '@/services/CDCDossierService';
import { DepositService } from '@/services/DepositService';

type Params = { params: Promise<{ applicationId: string }> };

// POST — Generate CDC dossier PDF
export async function POST(request: Request, props: Params) {
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
            candidateScope: { select: { creatorUserId: true } },
            listing: {
              select: {
                rentalUnit: {
                  include: { property: { select: { ownerId: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!deposit) {
      return NextResponse.json({ error: 'No deposit found' }, { status: 404 });
    }

    // Only tenant can generate CDC dossier
    const tenantId = deposit.application.candidateScope?.creatorUserId;
    if (currentUser.id !== tenantId) {
      return NextResponse.json(
        { error: 'Only the tenant can generate a CDC dossier' },
        { status: 403 }
      );
    }

    // Must be in DISPUTED status
    if (deposit.status !== 'DISPUTED') {
      return NextResponse.json(
        { error: 'CDC dossier can only be generated when the deposit is disputed' },
        { status: 400 }
      );
    }

    // Generate the dossier PDF
    const pdfUrl = await CDCDossierService.generate(applicationId, currentUser.id);

    // Store URL on deposit
    await prisma.securityDeposit.update({
      where: { id: deposit.id },
      data: {
        cdcDossierUrl: pdfUrl,
        cdcDossierGeneratedAt: new Date(),
      },
    });

    // Create timeline event
    await prisma.depositEvent.create({
      data: {
        depositId: deposit.id,
        type: 'CDC_DOSSIER_GENERATED',
        description: 'Dossier CDC généré',
        actorType: 'tenant',
        actorId: currentUser.id,
      },
    });

    // Inject conversation message
    try {
      await DepositService.transition(deposit.id, 'CDC_DOSSIER_GENERATED', {
        actorType: 'tenant',
        actorId: currentUser.id,
        description: 'Dossier CDC généré par le locataire',
      }).catch(() => {
        // transition may not be valid — that's OK, the event is already created
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ url: pdfUrl }, { status: 201 });
  } catch (error: unknown) {
    console.error('[CDCDossier POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
