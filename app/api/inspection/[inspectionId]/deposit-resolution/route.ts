import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { createNotification } from '@/libs/notifications';
import { sendPushNotification } from '@/app/lib/sendPushNotification';
import { PassportService } from '@/services/PassportService';
import { DepositService } from '@/services/DepositService';

type Params = { params: Promise<{ inspectionId: string }> };

// GET /api/inspection/[inspectionId]/deposit-resolution
export async function GET(request: Request, props: Params) {
  try {
    const { inspectionId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        application: {
          include: {
            listing: {
              include: {
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

    if (!inspection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isLandlord = inspection.application.listing.rentalUnit.property.ownerId === currentUser.id;
    const isTenant = inspection.application.candidateScope?.creatorUserId === currentUser.id;
    if (!isLandlord && !isTenant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolution = await prisma.depositResolution.findUnique({
      where: { inspectionId },
    });

    // Check if partial deadline has expired (client-side fallback for cron)
    if (
      resolution &&
      resolution.status === 'PARTIAL_AGREED' &&
      resolution.partialDeadline &&
      new Date() > new Date(resolution.partialDeadline)
    ) {
      const updated = await prisma.depositResolution.update({
        where: { id: resolution.id },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json(resolution);
  } catch (error: unknown) {
    console.error('[DepositResolution GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/inspection/[inspectionId]/deposit-resolution — Create proposal
export async function POST(request: Request, props: Params) {
  try {
    const { inspectionId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        application: {
          include: {
            listing: {
              select: {
                securityDeposit: true,
                price: true,
                leaseType: true,
                rentalUnit: {
                  include: { property: { select: { ownerId: true } } },
                },
              },
            },
            candidateScope: { select: { creatorUserId: true } },
          },
        },
        deductions: true,
      },
    });

    if (!inspection || inspection.type !== 'EXIT') {
      return NextResponse.json({ error: 'Not found or not an EXIT inspection' }, { status: 404 });
    }

    const isLandlord = inspection.application.listing.rentalUnit.property.ownerId === currentUser.id;
    if (!isLandlord) {
      return NextResponse.json({ error: 'Only the landlord can create a proposal' }, { status: 403 });
    }

    // Check if resolution already exists
    const existing = await prisma.depositResolution.findUnique({
      where: { inspectionId },
    });
    if (existing) {
      return NextResponse.json({ error: 'A deposit resolution already exists' }, { status: 409 });
    }

    // Get deposit amount — from listing or calculate fallback
    let depositAmountCents = inspection.application.listing.securityDeposit
      ? inspection.application.listing.securityDeposit * 100
      : 0;

    if (!depositAmountCents) {
      // Fallback: 1× rent (unfurnished), 2× rent (furnished)
      const rent = inspection.application.listing.price;
      const isFurnished = !!(inspection.application.listing.rentalUnit as any)?.isFurnished;
      depositAmountCents = rent * (isFurnished ? 2 : 1) * 100;
    }

    // Calculate totals from deductions
    const totalDeductionsCents = inspection.deductions.reduce(
      (sum, d) => sum + d.tenantShareCents,
      0
    );
    const refundAmountCents = Math.max(0, depositAmountCents - totalDeductionsCents);

    const resolution = await prisma.depositResolution.create({
      data: {
        inspectionId,
        applicationId: inspection.applicationId,
        depositAmountCents,
        totalDeductionsCents,
        refundAmountCents,
        status: 'PROPOSED',
      },
    });

    // Link SecurityDeposit + transition
    try {
      const securityDeposit = await prisma.securityDeposit.findUnique({
        where: { applicationId: inspection.applicationId },
      });
      if (securityDeposit) {
        // Link depositResolutionId
        await prisma.securityDeposit.update({
          where: { id: securityDeposit.id },
          data: { depositResolutionId: resolution.id },
        });

        // Validate deductions vs deposit amount
        const validation = DepositService.validateDeductions(securityDeposit, totalDeductionsCents);
        if (validation.surplusCents) {
          // Log DEDUCTION_EXCEEDS_DEPOSIT event for traceability
          await prisma.depositEvent.create({
            data: {
              depositId: securityDeposit.id,
              type: 'DEDUCTION_EXCEEDS_DEPOSIT',
              description: validation.warning!,
              actorType: 'system',
              metadata: { surplusCents: validation.surplusCents, totalDeductionsCents, depositAmountCents: securityDeposit.amountCents },
            },
          });
        }

        await DepositService.transition(securityDeposit.id, 'RETENTIONS_PROPOSED', {
          actorType: 'landlord',
          actorId: currentUser.id,
          metadata: { totalDeductionsCents, refundAmountCents, surplusCents: validation.surplusCents },
        });
      }
    } catch (depositErr) {
      console.error('[DepositResolution POST] SecurityDeposit link failed:', depositErr);
    }

    // Notify tenant
    const tenantId = inspection.application.candidateScope?.creatorUserId;
    if (tenantId) {
      await createNotification({
        userId: tenantId,
        type: 'inspection',
        title: 'Proposition de retenues sur dépôt',
        message: `Le propriétaire a proposé des retenues sur votre dépôt de garantie. Consultez et répondez.`,
        link: `/inspection/${inspectionId}/deposit-response`,
      });

      sendPushNotification({
        userId: tenantId,
        title: 'Retenues sur dépôt de garantie',
        body: 'Le propriétaire a proposé des retenues. Consultez et répondez.',
        url: `/inspection/${inspectionId}/deposit-response`,
      });
    }

    return NextResponse.json(resolution, { status: 201 });
  } catch (error: unknown) {
    console.error('[DepositResolution POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/inspection/[inspectionId]/deposit-resolution — Tenant response or resolve
export async function PATCH(request: Request, props: Params) {
  try {
    const { inspectionId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        application: {
          include: {
            listing: {
              include: {
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

    if (!inspection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isLandlord = inspection.application.listing.rentalUnit.property.ownerId === currentUser.id;
    const isTenant = inspection.application.candidateScope?.creatorUserId === currentUser.id;
    if (!isLandlord && !isTenant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolution = await prisma.depositResolution.findUnique({
      where: { inspectionId },
    });

    if (!resolution) {
      return NextResponse.json({ error: 'No deposit resolution found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, disputeReason, partialAgreedAmount } = body;

    // Tenant actions
    if (isTenant) {
      if (resolution.status !== 'PROPOSED') {
        return NextResponse.json({ error: 'Can only respond to PROPOSED status' }, { status: 400 });
      }

      const landlordId = inspection.application.listing.rentalUnit.property.ownerId;

      if (action === 'agree') {
        const updated = await prisma.depositResolution.update({
          where: { id: resolution.id },
          data: {
            status: 'AGREED',
            tenantAgreedAt: new Date(),
            resolvedAt: new Date(),
          },
        });

        await createNotification({
          userId: landlordId,
          type: 'inspection',
          title: 'Retenues acceptées',
          message: 'Le locataire a accepté les retenues sur le dépôt de garantie.',
          link: `/inspection/${inspectionId}/deductions`,
        });

        sendPushNotification({
          userId: landlordId,
          title: 'Retenues acceptées',
          body: 'Le locataire a accepté les retenues. Le dépôt peut être restitué.',
          url: `/inspection/${inspectionId}/deductions`,
        });

        // Update rental history (Passeport Locatif)
        PassportService.onCleanExit(inspection.applicationId).catch(console.error);

        // SecurityDeposit transition: TENANT_AGREED → FULLY_RELEASED
        try {
          const secDep = await prisma.securityDeposit.findUnique({ where: { applicationId: inspection.applicationId } });
          if (secDep) {
            await DepositService.transition(secDep.id, 'TENANT_AGREED', {
              actorType: 'tenant', actorId: currentUser.id,
              metadata: { refundAmountCents: resolution.refundAmountCents },
            });
          }
        } catch (e) { console.error('[DepositResolution PATCH agree] SecurityDeposit transition failed:', e); }

        return NextResponse.json(updated);
      }

      if (action === 'partial_agree') {
        if (partialAgreedAmount == null) {
          return NextResponse.json({ error: 'partialAgreedAmount is required' }, { status: 400 });
        }

        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 14);

        const updated = await prisma.depositResolution.update({
          where: { id: resolution.id },
          data: {
            status: 'PARTIAL_AGREED',
            tenantAgreedAt: new Date(),
            partialAgreedAmount,
            partialDeadline: deadline,
          },
        });

        await createNotification({
          userId: landlordId,
          type: 'inspection',
          title: 'Accord partiel sur les retenues',
          message: `Le locataire accepte ${(partialAgreedAmount / 100).toFixed(2)}€ de retenues. Vous avez 14 jours pour contester le reste.`,
          link: `/inspection/${inspectionId}/deductions`,
        });

        sendPushNotification({
          userId: landlordId,
          title: 'Accord partiel — 14 jours',
          body: `Le locataire accepte partiellement les retenues. Répondez sous 14 jours.`,
          url: `/inspection/${inspectionId}/deductions`,
        });

        // SecurityDeposit transition: TENANT_PARTIAL_AGREED → PARTIALLY_RELEASED
        try {
          const secDep = await prisma.securityDeposit.findUnique({ where: { applicationId: inspection.applicationId } });
          if (secDep) {
            await DepositService.transition(secDep.id, 'TENANT_PARTIAL_AGREED', {
              actorType: 'tenant', actorId: currentUser.id,
              metadata: { partialAgreedAmount },
            });
          }
        } catch (e) { console.error('[DepositResolution PATCH partial] SecurityDeposit transition failed:', e); }

        return NextResponse.json(updated);
      }

      if (action === 'dispute') {
        const updated = await prisma.depositResolution.update({
          where: { id: resolution.id },
          data: {
            status: 'DISPUTED',
            tenantDisputedAt: new Date(),
            disputeReason: disputeReason || null,
          },
        });

        await createNotification({
          userId: landlordId,
          type: 'inspection',
          title: 'Retenues contestées',
          message: `Le locataire conteste les retenues sur le dépôt de garantie.${disputeReason ? ` Motif : ${disputeReason}` : ''}`,
          link: `/inspection/${inspectionId}/deductions`,
        });

        sendPushNotification({
          userId: landlordId,
          title: 'Retenues contestées',
          body: 'Le locataire conteste les retenues. Consultez le détail.',
          url: `/inspection/${inspectionId}/deductions`,
        });

        // SecurityDeposit transition: TENANT_DISPUTED → DISPUTED
        try {
          const secDep = await prisma.securityDeposit.findUnique({ where: { applicationId: inspection.applicationId } });
          if (secDep) {
            await DepositService.transition(secDep.id, 'TENANT_DISPUTED', {
              actorType: 'tenant', actorId: currentUser.id,
              metadata: { disputeReason },
            });
          }
        } catch (e) { console.error('[DepositResolution PATCH dispute] SecurityDeposit transition failed:', e); }

        return NextResponse.json(updated);
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Landlord action: resolve manually
    if (isLandlord && action === 'resolve') {
      const updated = await prisma.depositResolution.update({
        where: { id: resolution.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });

      const tenantId = inspection.application.candidateScope?.creatorUserId;
      if (tenantId) {
        await createNotification({
          userId: tenantId,
          type: 'inspection',
          title: 'Dépôt de garantie restitué',
          message: 'Le dépôt de garantie a été marqué comme restitué.',
          link: `/inspection/${inspectionId}/deposit-response`,
        });

        sendPushNotification({
          userId: tenantId,
          title: 'Dépôt de garantie restitué',
          body: 'Votre dépôt de garantie a été restitué.',
          url: `/inspection/${inspectionId}/deposit-response`,
        });
      }

      // Update rental history (Passeport Locatif)
      PassportService.onCleanExit(inspection.applicationId).catch(console.error);

      // SecurityDeposit transition: RESOLVED
      try {
        const secDep = await prisma.securityDeposit.findUnique({ where: { applicationId: inspection.applicationId } });
        if (secDep) {
          await DepositService.transition(secDep.id, 'RESOLVED', {
            actorType: 'landlord', actorId: currentUser.id,
          });
        }
      } catch (e) { console.error('[DepositResolution PATCH resolve] SecurityDeposit transition failed:', e); }

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[DepositResolution PATCH] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
