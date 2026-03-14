import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all deposits where user is landlord or tenant
    const deposits = await prisma.securityDeposit.findMany({
      where: {
        status: { notIn: ['RESOLVED'] },
        application: {
          OR: [
            { listing: { rentalUnit: { property: { ownerId: currentUser.id } } } },
            { candidateScope: { creatorUserId: currentUser.id } },
          ],
        },
      },
      include: {
        application: {
          include: {
            listing: {
              select: {
                title: true,
                rentalUnit: {
                  include: {
                    property: { select: { ownerId: true, city: true } },
                  },
                },
              },
            },
            candidateScope: { select: { creatorUserId: true } },
          },
        },
        depositResolution: { select: { status: true } },
      },
    });

    const alerts: {
      applicationId: string;
      propertyTitle: string;
      type: 'action_required' | 'overdue' | 'deadline_approaching' | 'info';
      message: string;
      urgency: 'high' | 'medium' | 'low';
    }[] = [];

    const now = new Date();

    for (const deposit of deposits) {
      const isLandlord = currentUser.id === deposit.application.listing.rentalUnit.property.ownerId;
      const isTenant = currentUser.id === deposit.application.candidateScope?.creatorUserId;
      const property = deposit.application.listing.rentalUnit.property;
      const title = deposit.application.listing.title || property.city || 'Bien';

      // Overdue — high urgency
      if (deposit.isOverdue) {
        if (isLandlord) {
          alerts.push({
            applicationId: deposit.applicationId,
            propertyTitle: title,
            type: 'overdue',
            message: `Restitution en retard — pénalité ${(deposit.penaltyAmountCents / 100).toFixed(0)}€`,
            urgency: 'high',
          });
        }
        if (isTenant) {
          alerts.push({
            applicationId: deposit.applicationId,
            propertyTitle: title,
            type: 'overdue',
            message: deposit.formalNoticeSentAt
              ? `Dépôt en retard — mise en demeure envoyée`
              : `Dépôt en retard — vous pouvez agir`,
            urgency: 'high',
          });
        }
      }

      // Deadline approaching (< 7 days)
      if (!deposit.isOverdue && deposit.legalDeadline) {
        const daysLeft = Math.ceil(
          (deposit.legalDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft <= 7 && daysLeft > 0 && isLandlord) {
          alerts.push({
            applicationId: deposit.applicationId,
            propertyTitle: title,
            type: 'deadline_approaching',
            message: `Restitution dépôt — ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restants`,
            urgency: 'medium',
          });
        }
      }

      // Retentions proposed — tenant needs to respond
      if (deposit.status === 'RETENTIONS_PROPOSED' && isTenant) {
        alerts.push({
          applicationId: deposit.applicationId,
          propertyTitle: title,
          type: 'action_required',
          message: 'Proposition de retenues reçue — répondez',
          urgency: 'medium',
        });
      }

      // Awaiting payment — landlord or tenant can confirm
      if (deposit.status === 'AWAITING_PAYMENT') {
        alerts.push({
          applicationId: deposit.applicationId,
          propertyTitle: title,
          type: 'action_required',
          message: 'Versement du dépôt en attente',
          urgency: 'low',
        });
      }

      // Disputed — both parties
      if (deposit.status === 'DISPUTED') {
        alerts.push({
          applicationId: deposit.applicationId,
          propertyTitle: title,
          type: 'info',
          message: 'Dépôt contesté — en attente de résolution',
          urgency: 'medium',
        });
      }
    }

    // Sort by urgency
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    return NextResponse.json(alerts);
  } catch (error: unknown) {
    console.error('[DepositAlerts GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
